import { describe, it, expect } from 'vitest';
import { PricingEngineService } from './pricing-engine-service';
import { ChannelPriceConfig, CostToServe, PricingRule } from './types';

describe('PricingEngineService', () => {
  const rules: PricingRule[] = [
    {
      categoryId: 'cat1',
      channel: 'website',
      minFloorMargin: 0.20,
      maxDiscountDepth: 0.30
    },
    {
      categoryId: 'cat1',
      channel: 'shopee',
      minFloorMargin: 0.15,
      maxDiscountDepth: 0.50
    }
  ];

  const service = new PricingEngineService(rules);

  const defaultCost: CostToServe = {
    cogs: 40,
    packagingCost: 5,
    fulfillmentCost: 5,
    platformFeeRate: 0.05, // 5%
    paymentFeeRate: 0.02   // 2%
  };

  describe('evaluatePrice', () => {
    it('GREEN path: Valid price providing good margin', () => {
      const config: ChannelPriceConfig = {
        sku: 'SKU123',
        channel: 'website',
        sellingPrice: 100,
        compareAtPrice: 120
      };

      // Cost = 40 (cogs) + 5 (pack) + 5 (fulfill) + 5 (platform) + 2 (payment) = 57
      // Net Margin Abs = 100 - 57 = 43
      // Net Margin % = 43 / 100 = 43%

      const result = service.evaluatePrice(config, defaultCost, 'cat1');
      expect(result.isValid).toBe(true);
      expect(result.netMarginAbsolute).toBeCloseTo(43);
      expect(result.netMarginPercentage).toBeCloseTo(0.43);
      expect(result.violations).toHaveLength(0);
    });

    it('RED path: Price below minFloorMargin', () => {
      const config: ChannelPriceConfig = {
        sku: 'SKU123',
        channel: 'website',
        sellingPrice: 65,
      };

      // Cost = 40 + 5 + 5 + (65 * 0.05) + (65 * 0.02) = 50 + 3.25 + 1.3 = 54.55
      // Margin Abs = 65 - 54.55 = 10.45
      // Margin % = 10.45 / 65 = ~16% (< 20% floor)

      const result = service.evaluatePrice(config, defaultCost, 'cat1');
      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('below floor margin');
    });

    it('RED path: sellingPrice results in negative absolute margin after platform fees', () => {
      const config: ChannelPriceConfig = {
        sku: 'SKU123',
        channel: 'shopee',
        sellingPrice: 50, // lower than base costs
      };

      // Cost = 40 + 5 + 5 + (50 * 0.05) + (50 * 0.02) = 50 + 2.5 + 1 = 53.5
      // Margin Abs = 50 - 53.5 = -3.5

      const result = service.evaluatePrice(config, defaultCost, 'cat1');
      expect(result.isValid).toBe(false);
      expect(result.netMarginAbsolute).toBeLessThan(0);
      expect(result.violations[0]).toContain('Negative absolute margin');
    });

    it('RED path: Invalid base price', () => {
      const config: ChannelPriceConfig = {
        sku: 'SKU123',
        channel: 'website',
        sellingPrice: 0,
      };

      const result = service.evaluatePrice(config, defaultCost, 'cat1');
      expect(result.isValid).toBe(false);
      expect(result.violations[0]).toContain('Selling price must be greater than zero');
    });
  });

  describe('checkCrossChannelParity', () => {
    it('PARITY check: detects variance exceeding threshold', () => {
      const configs: ChannelPriceConfig[] = [
        { sku: 'SKU123', channel: 'website', sellingPrice: 100 },
        { sku: 'SKU123', channel: 'shopee', sellingPrice: 90 }, // 10% variance (100-90)/100 = 10%
      ];

      const result = service.checkCrossChannelParity(configs, 0.05);
      expect(result.hasParityConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('10.00% variance');
    });

    it('PARITY check: allows variance within threshold', () => {
      const configs: ChannelPriceConfig[] = [
        { sku: 'SKU123', channel: 'website', sellingPrice: 100 },
        { sku: 'SKU123', channel: 'shopee', sellingPrice: 96 }, // 4% variance
      ];

      const result = service.checkCrossChannelParity(configs, 0.05);
      expect(result.hasParityConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });
});
