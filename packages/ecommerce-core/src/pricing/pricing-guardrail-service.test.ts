import { describe, it, expect } from 'vitest'
import {
  PricingGuardrailService,
  PriceLadderEntry
} from './pricing-guardrail-service.js'

describe('PricingGuardrailService', () => {
  const service = new PricingGuardrailService()

  const baseEntry: PriceLadderEntry = {
    sku: 'SKU-001',
    channel: 'shopify',
    basePrice: 100,
    cost: 40,
    costToServe: 10
  }

  describe('computeMarginSnapshot', () => {
    it('computes positive margins with no promotion', () => {
      const m = service.computeMarginSnapshot(baseEntry)

      // grossMargin = (100 - 40) / 100 * 100 = 60
      expect(m.grossMargin).toBe(60)
      // netRevenue = 100, totalCost = 40+10 = 50, netMargin = (100-50)/100 * 100 = 50
      expect(m.netMargin).toBe(50)
      expect(m.isBelowFloor).toBe(false)
      expect(m.floorViolations).toEqual([])
    })

    it('flags negative net margin as below floor', () => {
      const entry: PriceLadderEntry = { ...baseEntry, basePrice: 30, cost: 30, costToServe: 10 }
      const m = service.computeMarginSnapshot(entry)

      expect(m.grossMargin).toBe(0)
      expect(m.netMargin).toBeLessThan(0)
      expect(m.isBelowFloor).toBe(true)
      expect(m.floorViolations.length).toBeGreaterThan(0)
      expect(m.floorViolations[0]).toContain('Negative net margin')
    })

    it('detects cost to serve exceeding 50% of base price', () => {
      const entry: PriceLadderEntry = { ...baseEntry, costToServe: 60 }
      const m = service.computeMarginSnapshot(entry)

      expect(m.isBelowFloor).toBe(true)
      expect(m.floorViolations.some((v) => v.includes('Cost to serve'))).toBe(true)
    })

    it('accounts for promotional voucher cost with co-funding', () => {
      const promo = { voucherAmount: 20, freeShipping: true, coFundingShare: 0.5 }
      const m = service.computeMarginSnapshot(baseEntry, promo)

      // seller pays 50% of 20 = 10, netRevenue = 100 - 10 = 90
      // totalCost = 40 + 10 = 50
      // netMargin = (90 - 50) / 90 * 100 = 44.44...
      expect(m.netMargin).toBeCloseTo(44.44, 1)
      expect(m.isBelowFloor).toBe(false)
    })

    it('detects zero or negative net revenue from promotion', () => {
      const entry: PriceLadderEntry = { ...baseEntry, basePrice: 15 }
      const promo = { voucherAmount: 20, freeShipping: true, coFundingShare: 0 }
      const m = service.computeMarginSnapshot(entry, promo)

      expect(m.isBelowFloor).toBe(true)
      expect(m.floorViolations.some((v) => v.includes('Net revenue is zero or negative'))).toBe(true)
    })

    it('does not mutate input entry', () => {
      const entry = { ...baseEntry }
      const entryCopy = { ...entry }
      service.computeMarginSnapshot(entry)
      expect(entry).toEqual(entryCopy)
    })

    it('returns fresh floorViolations array each call', () => {
      const entry: PriceLadderEntry = { ...baseEntry, costToServe: 60 }
      const m = service.computeMarginSnapshot(entry)

      const violations = m.floorViolations
      violations.push('mutated')
      expect(service.computeMarginSnapshot(entry).floorViolations).not.toContain('mutated')
    })
  })

  describe('assertFloorMargin', () => {
    it('passes when margin meets floor', () => {
      expect(() => service.assertFloorMargin(baseEntry, 10)).not.toThrow()
    })

    it('throws ValidationError when margin is below floor', () => {
      expect(() => service.assertFloorMargin(baseEntry, 60)).toThrow(
        'Net margin 50% for SKU SKU-001 on shopify is below floor of 60%'
      )
    })

    it('throws on aggressive promotion causing floor breach', () => {
      const promo = { voucherAmount: 60, freeShipping: true, coFundingShare: 0 }
      // netRevenue = 100 - 60 = 40, totalCost = 50, netMargin = (40-50)/40*100 = -25%
      expect(() => service.assertFloorMargin(baseEntry, 10, promo)).toThrow(
        'is below floor of 10%'
      )
    })
  })

  describe('checkChannelConsistency', () => {
    it('returns consistent when all prices are within tolerance', () => {
      const entries: PriceLadderEntry[] = [
        { ...baseEntry, channel: 'shopify', basePrice: 100 },
        { ...baseEntry, channel: 'amazon', basePrice: 105 },
        { ...baseEntry, channel: 'etsy', basePrice: 98 }
      ]
      const r = service.checkChannelConsistency(entries, 10)

      expect(r.isConsistent).toBe(true)
      expect(r.deviations).toHaveLength(3)
    })

    it('returns deviations when prices are outside tolerance', () => {
      const entries: PriceLadderEntry[] = [
        { ...baseEntry, channel: 'shopify', basePrice: 100 },
        { ...baseEntry, channel: 'amazon', basePrice: 200 }
      ]
      const r = service.checkChannelConsistency(entries, 10)

      expect(r.isConsistent).toBe(false)
      expect(r.deviations[1].deltaPercent).toBeGreaterThan(10)
    })

    it('returns consistent for empty list', () => {
      const r = service.checkChannelConsistency([], 10)
      expect(r.isConsistent).toBe(true)
      expect(r.deviations).toHaveLength(0)
    })
  })

  describe('simulatePromoImpact', () => {
    it('computes unit contribution correctly', () => {
      const promo = { voucherAmount: 10, freeShipping: true, coFundingShare: 0.3 }
      const r = service.simulatePromoImpact(baseEntry, promo)

      // sellerVoucherCost = 10 * (1 - 0.3) = 7
      // netRevenue = 100 - 7 = 93
      // totalCost = 40 + 10 = 50
      // unitContribution = 93 - 50 = 43
      expect(r.unitContribution).toBe(43)
      expect(r.margin.netMargin).toBeGreaterThan(0)
    })

    it('shows negative contribution when promotion is too deep', () => {
      const promo = { voucherAmount: 80, freeShipping: true, coFundingShare: 0 }
      const r = service.simulatePromoImpact(baseEntry, promo)

      expect(r.unitContribution).toBeLessThan(0)
      expect(r.margin.isBelowFloor).toBe(true)
    })
  })
})
