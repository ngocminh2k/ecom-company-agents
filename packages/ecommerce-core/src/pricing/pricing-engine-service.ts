import { ChannelPriceConfig, CostToServe, PriceEvaluationResult, PricingRule } from './types';

export class PricingEngineService {
  constructor(private pricingRules: PricingRule[]) {}

  /**
   * Calculates the exact net margin and evaluates against floor margin rules.
   * Total Cost = COGS + Packaging + Fulfillment + (SellingPrice * (PlatformFee + PaymentFee))
   * Net Margin = SellingPrice - Total Cost
   */
  public evaluatePrice(
    config: ChannelPriceConfig, 
    cost: CostToServe,
    categoryId: string
  ): PriceEvaluationResult {
    const rule = this.pricingRules.find(r => r.categoryId === categoryId && r.channel === config.channel);
    
    if (!rule) {
      return {
        sku: config.sku,
        channel: config.channel,
        isValid: false,
        netMarginPercentage: 0,
        netMarginAbsolute: 0,
        violations: [`No pricing rule defined for category '${categoryId}' on channel '${config.channel}'.`]
      };
    }

    if (config.sellingPrice <= 0) {
      return {
        sku: config.sku,
        channel: config.channel,
        isValid: false,
        netMarginPercentage: 0,
        netMarginAbsolute: 0,
        violations: ['Selling price must be greater than zero.']
      };
    }

    const platformFees = config.sellingPrice * cost.platformFeeRate;
    const paymentFees = config.sellingPrice * cost.paymentFeeRate;
    const totalCost = cost.cogs + cost.packagingCost + cost.fulfillmentCost + platformFees + paymentFees;
    
    const netMarginAbsolute = config.sellingPrice - totalCost;
    const netMarginPercentage = netMarginAbsolute / config.sellingPrice;

    const violations: string[] = [];

    if (netMarginAbsolute < 0) {
      violations.push(`Negative absolute margin: ${netMarginAbsolute.toFixed(2)}`);
    }

    if (netMarginPercentage < rule.minFloorMargin) {
      violations.push(`Margin (${(netMarginPercentage * 100).toFixed(2)}%) is below floor margin (${(rule.minFloorMargin * 100).toFixed(2)}%).`);
    }

    if (config.compareAtPrice) {
      const discountDepth = (config.compareAtPrice - config.sellingPrice) / config.compareAtPrice;
      if (discountDepth > rule.maxDiscountDepth) {
        violations.push(`Discount depth (${(discountDepth * 100).toFixed(2)}%) exceeds maximum allowed (${(rule.maxDiscountDepth * 100).toFixed(2)}%).`);
      }
    }

    return {
      sku: config.sku,
      channel: config.channel,
      isValid: violations.length === 0,
      netMarginPercentage,
      netMarginAbsolute,
      violations
    };
  }

  /**
   * Evaluates a batch of prices across multiple channels to detect cross-channel conflicts.
   */
  public checkCrossChannelParity(
    configs: ChannelPriceConfig[], 
    maxVariancePercentage: number = 0.05
  ): { hasParityConflict: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    const groupedBySku = new Map<string, ChannelPriceConfig[]>();

    for (const config of configs) {
      if (!groupedBySku.has(config.sku)) {
        groupedBySku.set(config.sku, []);
      }
      groupedBySku.get(config.sku)!.push(config);
    }

    for (const [sku, skuConfigs] of groupedBySku.entries()) {
      if (skuConfigs.length < 2) continue;

      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let minChannel = '';
      let maxChannel = '';

      for (const config of skuConfigs) {
        if (config.sellingPrice < minPrice) {
          minPrice = config.sellingPrice;
          minChannel = config.channel;
        }
        if (config.sellingPrice > maxPrice) {
          maxPrice = config.sellingPrice;
          maxChannel = config.channel;
        }
      }

      const variance = (maxPrice - minPrice) / maxPrice;
      if (variance > maxVariancePercentage) {
        conflicts.push(`SKU ${sku} has a ${(variance * 100).toFixed(2)}% variance across channels (Max: ${maxPrice} on ${maxChannel}, Min: ${minPrice} on ${minChannel}), exceeding ${maxVariancePercentage * 100}%.`);
      }
    }

    return {
      hasParityConflict: conflicts.length > 0,
      conflicts
    };
  }
}
