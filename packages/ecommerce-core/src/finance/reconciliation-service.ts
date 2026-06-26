/**
 * Daily Reconciliation Service — SOP Section 17.2, 8-step daily reconciliation.
 *
 * Thực hiện đối soát doanh thu hàng ngày theo từng channel.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */

export interface DailyReconciliation {
  id: string
  date: string
  channel: string
  revenue: number
  platformFees: number
  adSpend: number
  refunds: number
  netRevenue: number
  ordersCount: number
  refundCount: number
  notes?: string
  createdAt: string
}

export interface DailyReconciliationInput {
  date: string
  channel: string
  revenue: number
  platformFees: number
  adSpend: number
  refunds: number
  ordersCount: number
  refundCount: number
  notes?: string
}

export interface ReconciliationSummary {
  date: string
  totalRevenue: number
  totalFees: number
  totalAdSpend: number
  totalRefunds: number
  netRevenue: number
  byChannel: Record<string, { revenue: number; fees: number; net: number }>
  alerts: string[]
}

/**
 * Default CPA target — alerts fire when adSpend / orders exceeds this.
 */
export const DEFAULT_CPA_TARGET = 15

/**
 * Refund rate threshold — alerts fire when refunds / orders exceeds this.
 */
export const DEFAULT_REFUND_RATE_THRESHOLD = 0.05

/**
 * Storage interface để service không phụ thuộc trực tiếp vào SQLite.
 */
export interface ReconciliationStorage {
  findByDateAndChannel(date: string, channel: string): DailyReconciliation | undefined
  findAllByDate(date: string): DailyReconciliation[]
  upsert(record: DailyReconciliation): DailyReconciliation
}

export class ReconciliationService {
  constructor(private storage: ReconciliationStorage) {}

  /**
   * Record or update daily reconciliation data for a channel.
   * netRevenue = revenue - platformFees - adSpend - refunds
   */
  recordDaily(input: DailyReconciliationInput): DailyReconciliation {
    const netRevenue = Math.round(
      (input.revenue - input.platformFees - input.adSpend - input.refunds) * 100
    ) / 100

    const existing = this.storage.findByDateAndChannel(input.date, input.channel)

    const now = new Date().toISOString()
    const record: DailyReconciliation = {
      id: existing?.id ?? crypto.randomUUID(),
      date: input.date,
      channel: input.channel,
      revenue: input.revenue,
      platformFees: input.platformFees,
      adSpend: input.adSpend,
      refunds: input.refunds,
      netRevenue,
      ordersCount: input.ordersCount,
      refundCount: input.refundCount,
      notes: input.notes,
      createdAt: existing?.createdAt ?? now,
    }

    return this.storage.upsert(record)
  }

  /**
   * Get all reconciliation records for a given date.
   */
  getDaily(date: string): DailyReconciliation[] {
    return this.storage.findAllByDate(date)
  }

  /**
   * Get aggregated summary for a date with alerts.
   */
  getSummary(date: string, cpaTarget?: number): ReconciliationSummary {
    const records = this.storage.findAllByDate(date)

    const byChannel: Record<string, { revenue: number; fees: number; net: number }> = {}
    let totalRevenue = 0
    let totalFees = 0
    let totalAdSpend = 0
    let totalRefunds = 0
    let totalOrders = 0
    let totalRefundsCount = 0

    for (const r of records) {
      totalRevenue += r.revenue
      totalFees += r.platformFees
      totalAdSpend += r.adSpend
      totalRefunds += r.refunds
      totalOrders += r.ordersCount
      totalRefundsCount += r.refundCount

      // Accumulate per-channel data
      const prev = byChannel[r.channel]
      byChannel[r.channel] = {
        revenue: (prev?.revenue ?? 0) + r.revenue,
        fees: (prev?.fees ?? 0) + r.platformFees,
        net: (prev?.net ?? 0) + r.netRevenue,
      }
    }

    const netRevenue = Math.round((totalRevenue - totalFees - totalAdSpend - totalRefunds) * 100) / 100

    const alerts: string[] = []
    const threshold = cpaTarget ?? DEFAULT_CPA_TARGET

    // Alert: CPA > target
    for (const r of records) {
      if (r.ordersCount > 0) {
        const cpa = r.adSpend / r.ordersCount
        if (cpa > threshold) {
          alerts.push(
            `[${r.channel}] CPA $${cpa.toFixed(2)} exceeds target $${threshold.toFixed(2)} ` +
            `(spend: $${r.adSpend.toFixed(2)}, orders: ${r.ordersCount})`
          )
        }
      }
    }

    // Alert: refund rate > 5%
    for (const r of records) {
      if (r.ordersCount > 0) {
        const refundRate = r.refundCount / r.ordersCount
        if (refundRate > DEFAULT_REFUND_RATE_THRESHOLD) {
          alerts.push(
            `[${r.channel}] Refund rate ${(refundRate * 100).toFixed(1)}% exceeds 5% ` +
            `(${r.refundCount}/${r.ordersCount} orders)`
          )
        }
      }
    }

    // Alert: net revenue negative
    if (netRevenue < 0) {
      alerts.push(`Net revenue is negative ($${netRevenue.toFixed(2)}). Immediate attention required.`)
    }

    return {
      date,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalAdSpend: Math.round(totalAdSpend * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      netRevenue,
      byChannel,
      alerts,
    }
  }
}

export interface RevenueTransaction {
  id: string
  channel: 'Shopify' | 'Etsy'
  sku: string
  quantity: number
  grossRevenue: number
  platformFee: number
  date: string
}

export interface CostTransaction {
  id: string
  sku: string
  quantity: number
  cogs: number
  shippingCost: number
  vendor: 'Printify' | string
  date: string
}

export interface AdSpend {
  id: string
  channel: 'Meta Ads' | 'Google Ads' | string
  campaignId: string
  sku: string
  spend: number
  date: string
}

export interface SKUMarginReport {
  sku: string
  unitsSold: number
  grossRevenue: number
  platformFees: number
  cogs: number
  shippingCost: number
  adSpend: number
  netMargin: number
  marginPercentage: number
}

export class FinanceReconciliationService {
  /**
   * Compute true SKU-level margin across multi-channel inputs.
   */
  computeSKUMargin(
    revenues: RevenueTransaction[],
    costs: CostTransaction[],
    ads: AdSpend[]
  ): SKUMarginReport[] {
    const reportMap = new Map<string, SKUMarginReport>()

    const getReport = (sku: string): SKUMarginReport => {
      if (!reportMap.has(sku)) {
        reportMap.set(sku, {
          sku,
          unitsSold: 0,
          grossRevenue: 0,
          platformFees: 0,
          cogs: 0,
          shippingCost: 0,
          adSpend: 0,
          netMargin: 0,
          marginPercentage: 0,
        })
      }
      return reportMap.get(sku)!
    }

    for (const rev of revenues) {
      const report = getReport(rev.sku)
      report.unitsSold += rev.quantity
      report.grossRevenue += rev.grossRevenue
      report.platformFees += rev.platformFee
    }

    for (const cost of costs) {
      const report = getReport(cost.sku)
      report.cogs += cost.cogs
      report.shippingCost += cost.shippingCost
    }

    for (const ad of ads) {
      const report = getReport(ad.sku)
      report.adSpend += ad.spend
    }

    const result = Array.from(reportMap.values()).map(report => {
      // Calculate net margin
      // Net Margin = Gross Revenue - Platform Fees - COGS - Shipping Cost - Ad Spend
      const netMargin = report.grossRevenue - report.platformFees - report.cogs - report.shippingCost - report.adSpend
      
      const marginPercentage = report.grossRevenue > 0 
        ? (netMargin / report.grossRevenue) * 100 
        : 0

      // Return new immutable object with updated calculations and rounded to 2 decimal places
      return {
        ...report,
        netMargin: Math.round(netMargin * 100) / 100,
        marginPercentage: Math.round(marginPercentage * 100) / 100,
        grossRevenue: Math.round(report.grossRevenue * 100) / 100,
        platformFees: Math.round(report.platformFees * 100) / 100,
        cogs: Math.round(report.cogs * 100) / 100,
        shippingCost: Math.round(report.shippingCost * 100) / 100,
        adSpend: Math.round(report.adSpend * 100) / 100,
      }
    })

    return result
  }
}
