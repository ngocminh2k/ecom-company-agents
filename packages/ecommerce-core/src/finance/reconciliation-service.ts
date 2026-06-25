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
