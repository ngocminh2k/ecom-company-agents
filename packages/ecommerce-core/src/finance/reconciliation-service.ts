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
  paymentProcessingFees: number
  adSpend: number
  refundsAndRemakes: number
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
    const netRevenue = (
      Math.round(input.revenue * 100) -
      Math.round(input.platformFees * 100) -
      Math.round(input.adSpend * 100) -
      Math.round(input.refunds * 100)
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
      paymentProcessingFees: 0,
      refundsAndRemakes: 0,
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
      totalRevenue += Math.round(r.revenue * 100)
      totalFees += Math.round(r.platformFees * 100)
      totalAdSpend += Math.round(r.adSpend * 100)
      totalRefunds += Math.round(r.refunds * 100)
      totalOrders += r.ordersCount
      totalRefundsCount += r.refundCount

      // Accumulate per-channel data in cents
      const prev = byChannel[r.channel]
      byChannel[r.channel] = {
        revenue: (prev?.revenue ?? 0) + Math.round(r.revenue * 100),
        fees: (prev?.fees ?? 0) + Math.round(r.platformFees * 100),
        net: (prev?.net ?? 0) + Math.round(r.netRevenue * 100),
      }
    }

    // Convert accumulated channel data back to dollars
    for (const channel in byChannel) {
      byChannel[channel] = {
        revenue: byChannel[channel].revenue / 100,
        fees: byChannel[channel].fees / 100,
        net: byChannel[channel].net / 100,
      }
    }

    const netRevenue = (totalRevenue - totalFees - totalAdSpend - totalRefunds) / 100

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
      totalRevenue: totalRevenue / 100,
      totalFees: totalFees / 100,
      totalAdSpend: totalAdSpend / 100,
      totalRefunds: totalRefunds / 100,
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
  paymentProcessingFee?: number
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

export interface RefundTransaction {
  id: string
  sku: string
  amount: number
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
  paymentProcessingFees: number
  cogs: number
  shippingCost: number
  adSpend: number
  refundsAndRemakes: number
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
    ads: AdSpend[],
    refunds: RefundTransaction[] = []
  ): SKUMarginReport[] {
    const reportMap = new Map<string, SKUMarginReport>()

    const getReport = (sku: string): SKUMarginReport => {
      if (!reportMap.has(sku)) {
        reportMap.set(sku, {
          sku,
          unitsSold: 0,
          grossRevenue: 0,
          platformFees: 0,
          paymentProcessingFees: 0,
          cogs: 0,
          shippingCost: 0,
          adSpend: 0,
          refundsAndRemakes: 0,
          netMargin: 0,
          marginPercentage: 0,
        })
      }
      return reportMap.get(sku)!
    }

    for (const rev of revenues) {
      const report = getReport(rev.sku)
      report.unitsSold += rev.quantity
      report.grossRevenue += Math.round(rev.grossRevenue * 100)
      report.platformFees += Math.round(rev.platformFee * 100)
      if (rev.paymentProcessingFee) {
        report.paymentProcessingFees += Math.round(rev.paymentProcessingFee * 100)
      }
    }

    for (const cost of costs) {
      const report = getReport(cost.sku)
      report.cogs += Math.round(cost.cogs * 100)
      report.shippingCost += Math.round(cost.shippingCost * 100)
    }

    for (const ad of ads) {
      const report = getReport(ad.sku)
      report.adSpend += Math.round(ad.spend * 100)
    }

    for (const ref of refunds) {
      const report = getReport(ref.sku)
      report.refundsAndRemakes += Math.round(ref.amount * 100)
    }

    const result = Array.from(reportMap.values()).map(report => {
      // Calculate net margin using integer cents
      // Net Margin = Gross Revenue - Platform Fees - Payment Processing Fees - COGS - Shipping Cost - Ad Spend - Refunds
      const netMarginCents = report.grossRevenue - report.platformFees - report.paymentProcessingFees - report.cogs - report.shippingCost - report.adSpend - report.refundsAndRemakes

      const marginPercentage = report.grossRevenue > 0
        ? (netMarginCents / report.grossRevenue) * 100
        : 0

      // Return new immutable object with updated calculations, converting cents back to dollars
      return {
        ...report,
        netMargin: netMarginCents / 100,
        marginPercentage: Math.round(marginPercentage * 100) / 100,
        grossRevenue: report.grossRevenue / 100,
        platformFees: report.platformFees / 100,
        paymentProcessingFees: report.paymentProcessingFees / 100,
        cogs: report.cogs / 100,
        shippingCost: report.shippingCost / 100,
        adSpend: report.adSpend / 100,
        refundsAndRemakes: report.refundsAndRemakes / 100,
      }
    })

    return result
  }
}
