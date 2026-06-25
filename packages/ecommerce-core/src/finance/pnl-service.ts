/**
 * PnL by SKU Service — SOP Section 17.3, 9-step PnL calculation.
 *
 * Tính toán lợi nhuận theo từng SKU, phân loại sản phẩm (scale/keep/optimize/stop).
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */

export interface PnLBySku {
  id: string
  sku: string
  productId: string
  period: string // "2026-06"
  avgPrice: number
  cogs: number
  shipping: number
  platformFees: number
  paymentFees: number
  adsAllocated: number
  refundsAllocated: number
  grossMargin: number
  contributionMargin: number
  classification: 'scale' | 'keep' | 'optimize' | 'stop'
  unitsSold: number
  revenue: number
  createdAt: string
}

export interface PnLBySkuInput {
  sku: string
  productId: string
  period: string
  avgPrice: number
  cogs: number
  shipping: number
  platformFees: number
  paymentFees: number
  adsAllocated: number
  refundsAllocated: number
  unitsSold: number
}

export interface PnLReport {
  period: string
  totalRevenue: number
  totalCost: number
  totalFees: number
  totalContribution: number
  totalUnitsSold: number
  skus: PnLBySku[]
  classifications: {
    scale: number
    keep: number
    optimize: number
    stop: number
  }
}

/**
 * Storage interface để service không phụ thuộc trực tiếp vào SQLite.
 */
export interface PnLStorage {
  findBySkuAndPeriod(sku: string, period: string): PnLBySku | undefined
  findByPeriod(period: string): PnLBySku[]
  findByProductId(productId: string): PnLBySku[]
  upsert(record: PnLBySku): PnLBySku
}

/**
 * Classify a product based on contribution margin and units sold.
 *
 * Rules:
 * - contributionMargin >= 40% && unitsSold >= 100 → 'scale'
 * - contributionMargin >= 20% → 'keep'
 * - contributionMargin >= 0% → 'optimize'
 * - contributionMargin < 0% → 'stop'
 */
export function classifyProduct(
  contributionMargin: number,
  unitsSold: number
): 'scale' | 'keep' | 'optimize' | 'stop' {
  if (contributionMargin >= 40 && unitsSold >= 100) return 'scale'
  if (contributionMargin >= 20) return 'keep'
  if (contributionMargin >= 0) return 'optimize'
  return 'stop'
}

export class PnLService {
  constructor(private storage: PnLStorage) {}

  /**
   * Calculate PnL for a SKU in a given period and persist the result.
   *
   * grossMargin = ((avgPrice - cogs) / avgPrice) * 100
   * contributionMargin = ((avgPrice - cogs - shipping - platformFees - paymentFees - adsAllocated - refundsAllocated) / avgPrice) * 100
   */
  calculatePnL(input: PnLBySkuInput): PnLBySku {
    const { avgPrice, cogs, shipping, platformFees, paymentFees, adsAllocated, refundsAllocated, unitsSold } = input

    // Gross margin
    const grossMargin = avgPrice > 0
      ? Math.round(((avgPrice - cogs) / avgPrice) * 100 * 100) / 100
      : 0

    // Contribution margin
    const totalVariableCosts = cogs + shipping + platformFees + paymentFees + adsAllocated + refundsAllocated
    const contributionMargin = avgPrice > 0
      ? Math.round(((avgPrice - totalVariableCosts) / avgPrice) * 100 * 100) / 100
      : 0

    const classification = classifyProduct(contributionMargin, unitsSold)
    const revenue = Math.round(avgPrice * unitsSold * 100) / 100

    const existing = this.storage.findBySkuAndPeriod(input.sku, input.period)

    const now = new Date().toISOString()
    const record: PnLBySku = {
      id: existing?.id ?? crypto.randomUUID(),
      sku: input.sku,
      productId: input.productId,
      period: input.period,
      avgPrice: input.avgPrice,
      cogs: input.cogs,
      shipping: input.shipping,
      platformFees: input.platformFees,
      paymentFees: input.paymentFees,
      adsAllocated: input.adsAllocated,
      refundsAllocated: input.refundsAllocated,
      grossMargin,
      contributionMargin,
      classification,
      unitsSold: input.unitsSold,
      revenue,
      createdAt: existing?.createdAt ?? now,
    }

    return this.storage.upsert(record)
  }

  /**
   * Get the classification for a product based on its latest PnL data.
   */
  getProductClassification(productId: string): PnLBySku['classification'] | null {
    const records = this.storage.findByProductId(productId)
    if (records.length === 0) return null

    // Use the most recent period
    const sorted = records.sort((a, b) => b.period.localeCompare(a.period))
    return sorted[0].classification
  }

  /**
   * Get PnL report for a period with aggregated data and classification counts.
   */
  getPnLReport(period: string): PnLReport {
    const skus = this.storage.findByPeriod(period)

    let totalRevenue = 0
    let totalCost = 0
    let totalFees = 0
    let totalContribution = 0
    let totalUnitsSold = 0

    const classifications = { scale: 0, keep: 0, optimize: 0, stop: 0 }

    for (const sku of skus) {
      totalRevenue += sku.revenue
      totalCost += sku.cogs * sku.unitsSold
      totalFees += (sku.platformFees + sku.paymentFees + sku.adsAllocated + sku.refundsAllocated) * sku.unitsSold
      totalContribution += (sku.avgPrice - sku.cogs - sku.shipping - sku.platformFees - sku.paymentFees - sku.adsAllocated - sku.refundsAllocated) * sku.unitsSold
      totalUnitsSold += sku.unitsSold
      classifications[sku.classification]++
    }

    return {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalContribution: Math.round(totalContribution * 100) / 100,
      totalUnitsSold,
      skus,
      classifications,
    }
  }
}
