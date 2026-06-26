import { describe, it, expect } from 'vitest';
import {
  PromotionGuardrailService,
  PromotionProposal,
  CostProfile,
  GuardrailRule,
  ValidationError
} from './promotion-guardrail-service';

describe('PromotionGuardrailService', () => {
  const rules: GuardrailRule[] = [
    {
      channel: 'Shopify',
      category: 'Electronics',
      minFloorMargin: 0.15, // 15%
      twoLevelApprovalThreshold: 0.30 // 30%
    },
    {
      channel: 'Etsy',
      category: 'Apparel',
      minFloorMargin: 0.20, // 20%
      twoLevelApprovalThreshold: 0.25 // 25%
    }
  ];

  const service = new PromotionGuardrailService(rules);

  const defaultCostProfile: CostProfile = {
    cogs: 40,
    estimatedShipping: 10,
    paymentFeeRate: 0.03
  };

  describe('simulateMargin', () => {
    it('calculates margin correctly for percentage discount', () => {
      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'percentage',
        discountValue: 0.10, // 10%
        channel: 'Shopify',
        category: 'Electronics'
      };

      // final price: 90
      // payment fees: 90 * 0.03 = 2.7
      // total cost: 40 + 2.7 = 42.7 (assuming buyer pays shipping)
      // net amount: 90 - 42.7 = 47.3
      // margin = 47.3 / 100 = 0.473
      const margin = service.simulateMargin(proposal, defaultCostProfile);
      expect(margin).toBeCloseTo(0.473);
    });

    it('calculates margin correctly for fixed amount discount', () => {
      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'fixed_amount',
        discountValue: 15, // $15 off
        channel: 'Shopify',
        category: 'Electronics'
      };

      // final price: 85
      // payment fees: 85 * 0.03 = 2.55
      // total cost: 40 + 2.55 = 42.55
      // net amount: 85 - 42.55 = 42.45
      // margin = 42.45 / 100 = 0.4245
      const margin = service.simulateMargin(proposal, defaultCostProfile);
      expect(margin).toBeCloseTo(0.4245);
    });

it('throws ValidationError when final selling price is zero or negative', () => {      const proposal: PromotionProposal = {        basePrice: 100,        discountType: 'fixed_amount',        discountValue: 100,        channel: 'Shopify',        category: 'Electronics'      };      expect(() => service.simulateMargin(proposal, defaultCostProfile)).toThrow(/Final selling price after discounts cannot be zero or negative/);    });
    it('calculates margin correctly for free shipping', () => {
      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'free_shipping',
        discountValue: 0,
        channel: 'Shopify',
        category: 'Electronics'
      };

      // final price: 100
      // payment fees: 100 * 0.03 = 3
      // total cost: 40 + 3 + 10 (shipping subsidy) = 53
      // net amount: 100 - 53 = 47
      // margin = 47 / 100 = 0.47
      const margin = service.simulateMargin(proposal, defaultCostProfile);
      expect(margin).toBeCloseTo(0.47);
    });
  });

  describe('evaluateProposal', () => {
    it('allows proposal that meets floor margin and does not require two-level approval', () => {
      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'percentage',
        discountValue: 0.10, // 10%
        channel: 'Shopify',
        category: 'Electronics'
      };

      const result = service.evaluateProposal(proposal, defaultCostProfile);
      expect(result.isAllowed).toBe(true);
      expect(result.requiresTwoLevelApproval).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    it('flags for two-level approval if discount exceeds threshold but margin is OK', () => {
      // Create a profile with very low COGS so margin stays high even with big discount
      const lowCostProfile: CostProfile = { cogs: 10, estimatedShipping: 5, paymentFeeRate: 0.03 };

      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'percentage',
        discountValue: 0.35, // 35% discount (threshold is 30%)
        channel: 'Shopify',
        category: 'Electronics'
      };

      // margin check:
      // final price: 65
      // fees: 1.95
      // cogs: 10
      // net: 65 - 11.95 = 53.05 (53% margin) > 15% floor

      const result = service.evaluateProposal(proposal, lowCostProfile);
      expect(result.isAllowed).toBe(true);
      expect(result.requiresTwoLevelApproval).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('rejects proposal that falls below floor margin', () => {
      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'percentage',
        discountValue: 0.50, // 50%
        channel: 'Shopify',
        category: 'Electronics'
      };

      // final price: 50
      // fees: 1.5
      // cogs: 40
      // net: 50 - 41.5 = 8.5 (8.5% margin) < 15% floor
      const result = service.evaluateProposal(proposal, defaultCostProfile);
      expect(result.isAllowed).toBe(false);
      expect(result.requiresTwoLevelApproval).toBe(true); // 50% > 30%
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('below the floor margin');
    });

    it('throws ValidationError for missing rules', () => {
      const proposal: PromotionProposal = {
        basePrice: 100,
        discountType: 'percentage',
        discountValue: 0.10,
        channel: 'Amazon', // No rule for this
        category: 'Electronics'
      };

      expect(() => service.evaluateProposal(proposal, defaultCostProfile)).toThrow(ValidationError);
      expect(() => service.evaluateProposal(proposal, defaultCostProfile)).toThrow(/No guardrail rule defined/);
    });

    it('throws ValidationError for invalid inputs', () => {
      const negativePrice: PromotionProposal = {
        basePrice: -10,
        discountType: 'percentage',
        discountValue: 0.10,
        channel: 'Shopify',
        category: 'Electronics'
      };

      const negativeDiscount: PromotionProposal = {
        basePrice: 100,
        discountType: 'percentage',
        discountValue: -0.10,
        channel: 'Shopify',
        category: 'Electronics'
      };

      expect(() => service.evaluateProposal(negativePrice, defaultCostProfile)).toThrow(/Base price must be greater than zero/);
      expect(() => service.evaluateProposal(negativeDiscount, defaultCostProfile)).toThrow(/Discount value cannot be negative/);
const invalidPercentage: PromotionProposal = {        basePrice: 100,        discountType: 'percentage',        discountValue: 1.10,        channel: 'Shopify',        category: 'Electronics'      };      const invalidFixedAmount: PromotionProposal = {        basePrice: 100,        discountType: 'fixed_amount',        discountValue: 110,        channel: 'Shopify',        category: 'Electronics'      };      expect(() => service.evaluateProposal(invalidPercentage, defaultCostProfile)).toThrow(/Percentage discount cannot exceed 100%/);      expect(() => service.evaluateProposal(invalidFixedAmount, defaultCostProfile)).toThrow(/Fixed discount cannot exceed base price/);
    });
  });
});