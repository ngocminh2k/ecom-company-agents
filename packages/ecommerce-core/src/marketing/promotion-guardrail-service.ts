export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface CostProfile {
  cogs: number;
  estimatedShipping: number;
  paymentFeeRate: number; // e.g., 0.029 (2.9%)
}

export interface PromotionProposal {
  basePrice: number;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number; // Percentage like 0.15 for 15%, or fixed dollar amount
  channel: string;
  category: string;
}

export interface GuardrailRule {
  channel: string;
  category: string;
  minFloorMargin: number; // Minimum acceptable net margin, e.g., 0.15 (15%)
  twoLevelApprovalThreshold: number; // e.g., 0.30 (30% depth limit before escalation)
}

export interface GuardrailResult {
  isAllowed: boolean;
  requiresTwoLevelApproval: boolean;
  simulatedMargin: number;
  violations: string[];
}

export class PromotionGuardrailService {
  constructor(private rules: GuardrailRule[]) {}

  /**
   * Calculates the projected net margin percentage.
   */
  public simulateMargin(proposal: PromotionProposal, costProfile: CostProfile): number {
    let finalSellingPrice = proposal.basePrice;
    let actualShippingSubsidy = 0;

    switch (proposal.discountType) {
      case 'percentage':
        finalSellingPrice = proposal.basePrice * (1 - proposal.discountValue);
        break;
      case 'fixed_amount':
        finalSellingPrice = proposal.basePrice - proposal.discountValue;
        break;
      case 'free_shipping':
        actualShippingSubsidy = costProfile.estimatedShipping;
        break;
    }

    // We can't sell for negative money or 0 usually, but let's calculate exact margin anyway.
    if (finalSellingPrice <= 0) {
      throw new ValidationError('Final selling price after discounts cannot be zero or negative.');
    }

    const paymentFees = finalSellingPrice * costProfile.paymentFeeRate;

    // Net Revenue = Final Selling Price - Payment Fees
    // Net Margin = Net Revenue - COGS - Shipping (where free_shipping means we bear the full shipping cost subsidy)
    // Actually, shipping is a cost we always bear if we offer free shipping.
    // Let's standardise: netMarginAmount = finalSellingPrice - cogs - paymentFees - (costProfile.estimatedShipping if we bear it)
    // Assume standard E-com: buyer pays shipping if not free_shipping, so our cost = 0.
    // If we offer free_shipping, buyer pays 0, our cost = estimatedShipping.
    // So subsidy = actualShippingSubsidy

    const totalCost = costProfile.cogs + paymentFees + actualShippingSubsidy;
    const netMarginAmount = finalSellingPrice - totalCost;

    const simulatedMargin = proposal.basePrice > 0 ? (netMarginAmount / proposal.basePrice) : 0;

    return simulatedMargin;
  }

  /**
   * Evaluates the promotion against the defined guardrail rules.
   */
  public evaluateProposal(proposal: PromotionProposal, costProfile: CostProfile): GuardrailResult {
    // Input validation
    if (proposal.basePrice <= 0) {
      throw new ValidationError('Base price must be greater than zero.');
    }
    if (proposal.discountValue < 0) {
      throw new ValidationError('Discount value cannot be negative.');
    }

    if (proposal.discountType === 'percentage' && proposal.discountValue > 1) {
      throw new ValidationError('Percentage discount cannot exceed 100% (1.0).');
    }

    if (proposal.discountType === 'fixed_amount' && proposal.discountValue > proposal.basePrice) {
      throw new ValidationError('Fixed discount cannot exceed base price.');
    }

    const rule = this.rules.find(r => r.channel === proposal.channel && r.category === proposal.category);

    if (!rule) {
      throw new ValidationError(`No guardrail rule defined for channel '${proposal.channel}' and category '${proposal.category}'.`);
    }

    const simulatedMargin = this.simulateMargin(proposal, costProfile);
    const violations: string[] = [];

    if (simulatedMargin < rule.minFloorMargin) {
      violations.push(`Simulated margin (${(simulatedMargin * 100).toFixed(2)}%) is below the floor margin of ${(rule.minFloorMargin * 100).toFixed(2)}%.`);
    }

    // Calculate discount depth relative to base price
    let discountDepth = 0;
    switch (proposal.discountType) {
      case 'percentage':
        discountDepth = proposal.discountValue;
        break;
      case 'fixed_amount':
        discountDepth = proposal.discountValue / proposal.basePrice;
        break;
      case 'free_shipping':
        discountDepth = costProfile.estimatedShipping / proposal.basePrice;
        break;
    }

    const requiresTwoLevelApproval = discountDepth >= rule.twoLevelApprovalThreshold;

    return {
      isAllowed: violations.length === 0,
      requiresTwoLevelApproval,
      simulatedMargin,
      violations
    };
  }
}
