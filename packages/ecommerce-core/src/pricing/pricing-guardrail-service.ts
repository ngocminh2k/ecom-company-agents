import { ValidationError } from '../errors.js'

export interface PriceLadderEntry {
  sku: string
  channel: string
  basePrice: number
  cost: number
  costToServe: number
}

export interface PromotionSimulation {
  voucherAmount: number
  freeShipping: boolean
  coFundingShare: number
}

export interface MarginSnapshot {
  netMargin: number
  grossMargin: number
  isBelowFloor: boolean
  floorViolations: string[]
}

export interface PriceConsistencyResult {
  isConsistent: boolean
  deviations: Array<{ channel: string; deltaPercent: number }>
}

export class PricingGuardrailService {
  computeMarginSnapshot(entry: PriceLadderEntry, promo?: PromotionSimulation): MarginSnapshot {
    const grossMargin = ((entry.basePrice - entry.cost) / entry.basePrice) * 100

    const sellerVoucherCost = promo ? promo.voucherAmount * (1 - promo.coFundingShare) : 0
    const netRevenue = entry.basePrice - sellerVoucherCost
    const totalCost = entry.cost + entry.costToServe
    const netMargin = netRevenue > 0 ? ((netRevenue - totalCost) / netRevenue) * 100 : -100

    const floorViolations: string[] = []
    if (netMargin < 0) {
      floorViolations.push(
        `Negative net margin (${netMargin.toFixed(2)}%) for SKU ${entry.sku} on ${entry.channel}`
      )
    }
    if (netRevenue <= 0) {
      floorViolations.push(
        `Net revenue is zero or negative after promotion discount for SKU ${entry.sku} on ${entry.channel}`
      )
    }
    if (entry.costToServe > entry.basePrice * 0.5) {
      floorViolations.push(
        `Cost to serve (${entry.costToServe}) exceeds 50% of base price (${entry.basePrice}) for SKU ${entry.sku} on ${entry.channel}`
      )
    }

    return {
      netMargin: round2(netMargin),
      grossMargin: round2(grossMargin),
      isBelowFloor: floorViolations.length > 0,
      floorViolations: [...floorViolations]
    }
  }

  assertFloorMargin(
    entry: PriceLadderEntry,
    floorPercent: number,
    promo?: PromotionSimulation
  ): void {
    const snapshot = this.computeMarginSnapshot(entry, promo)
    if (snapshot.netMargin < floorPercent) {
      throw new ValidationError(
        `Net margin ${snapshot.netMargin}% for SKU ${entry.sku} on ${entry.channel} is below floor of ${floorPercent}%`
      )
    }
  }

  checkChannelConsistency(
    entries: PriceLadderEntry[],
    tolerancePercent: number
  ): PriceConsistencyResult {
    if (entries.length === 0) {
      return { isConsistent: true, deviations: [] }
    }

    const avgPrice = entries.reduce((sum, e) => sum + e.basePrice, 0) / entries.length

    const deviations = entries.map((e) => ({
      channel: e.channel,
      deltaPercent: avgPrice > 0 ? round2(((e.basePrice - avgPrice) / avgPrice) * 100) : 0
    }))

    const isConsistent = deviations.every((d) => Math.abs(d.deltaPercent) <= tolerancePercent)

    return { isConsistent, deviations }
  }

  simulatePromoImpact(
    entry: PriceLadderEntry,
    promo: PromotionSimulation
  ): { margin: MarginSnapshot; unitContribution: number } {
    const margin = this.computeMarginSnapshot(entry, promo)
    const sellerVoucherCost = promo.voucherAmount * (1 - promo.coFundingShare)
    const netRevenue = entry.basePrice - sellerVoucherCost
    const totalCost = entry.cost + entry.costToServe
    const unitContribution = round2(netRevenue - totalCost)

    return { margin, unitContribution }
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}
