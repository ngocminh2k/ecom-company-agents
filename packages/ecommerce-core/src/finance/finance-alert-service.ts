/**
 * Finance Alert Service — monitors reconciliation data for anomalies.
 *
 * Tự động kiểm tra các chỉ số tài chính và tạo cảnh báo khi phát hiện bất thường.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */

import type { DailyReconciliation } from './reconciliation-service.js'
import { DEFAULT_CPA_TARGET, DEFAULT_REFUND_RATE_THRESHOLD } from './reconciliation-service.js'

export interface FinanceAlert {
  id: string
  type: 'cpa_spike' | 'refund_spike' | 'negative_margin' | 'payment_hold' | 'cashflow_warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  channel?: string
  value?: number
  createdAt: string
  acknowledged: boolean
}

export interface FinanceAlertInput {
  type: FinanceAlert['type']
  severity: FinanceAlert['severity']
  message: string
  channel?: string
  value?: number
}

/**
 * Storage interface để service không phụ thuộc trực tiếp vào SQLite.
 */
export interface FinanceAlertStorage {
  findAll(): FinanceAlert[]
  findActive(): FinanceAlert[]
  findById(id: string): FinanceAlert | undefined
  create(alert: FinanceAlert): FinanceAlert
  update(id: string, updates: Partial<FinanceAlert>): FinanceAlert | undefined
}

export type AlertCheckResult = FinanceAlertInput | null

/**
 * Run all alert checks against a daily reconciliation record.
 * Returns alert inputs that should be created or updated.
 */
export function checkReconciliationAlerts(record: DailyReconciliation): AlertCheckResult[] {
  const results: AlertCheckResult[] = []

  // CPA spike check
  if (record.ordersCount > 0) {
    const cpa = record.adSpend / record.ordersCount
    if (cpa > DEFAULT_CPA_TARGET) {
      results.push({
        type: 'cpa_spike',
        severity: cpa > DEFAULT_CPA_TARGET * 2 ? 'critical' : cpa > DEFAULT_CPA_TARGET * 1.5 ? 'high' : 'medium',
        message: `[${record.channel}] CPA $${cpa.toFixed(2)} exceeds target $${DEFAULT_CPA_TARGET.toFixed(2)} on ${record.date}`,
        channel: record.channel,
        value: cpa,
      })
    }
  }

  // Refund spike check
  if (record.ordersCount > 0) {
    const refundRate = record.refundCount / record.ordersCount
    if (refundRate > DEFAULT_REFUND_RATE_THRESHOLD) {
      results.push({
        type: 'refund_spike',
        severity: refundRate > 0.1 ? 'critical' : refundRate > 0.075 ? 'high' : 'medium',
        message: `[${record.channel}] Refund rate ${(refundRate * 100).toFixed(1)}% exceeds 5% on ${record.date} (${record.refundCount}/${record.ordersCount})`,
        channel: record.channel,
        value: refundRate,
      })
    }
  }

  // Negative margin check
  if (record.netRevenue < 0) {
    results.push({
      type: 'negative_margin',
      severity: record.netRevenue < -1000 ? 'critical' : 'high',
      message: `[${record.channel}] Net revenue negative on ${record.date}: $${record.netRevenue.toFixed(2)}`,
      channel: record.channel,
      value: record.netRevenue,
    })
  }

  return results
}

export class FinanceAlertService {
  constructor(private storage: FinanceAlertStorage) {}

  /**
   * Run all alert checks on reconciliation records and persist new alerts.
   */
  checkAlerts(records: DailyReconciliation[]): FinanceAlert[] {
    const created: FinanceAlert[] = []

    for (const record of records) {
      const results = checkReconciliationAlerts(record)
      for (const result of results) {
        if (result) {
          const alert = this.createAlert(result)
          created.push(alert)
        }
      }
    }

    return created
  }

  /**
   * Create a new finance alert.
   */
  createAlert(input: FinanceAlertInput): FinanceAlert {
    const alert: FinanceAlert = {
      id: crypto.randomUUID(),
      type: input.type,
      severity: input.severity,
      message: input.message,
      channel: input.channel,
      value: input.value,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    }

    return this.storage.create(alert)
  }

  /**
   * Get all active (unacknowledged) alerts.
   */
  getActiveAlerts(): FinanceAlert[] {
    return this.storage.findActive()
  }

  /**
   * Mark an alert as acknowledged.
   */
  acknowledgeAlert(id: string): FinanceAlert | undefined {
    const existing = this.storage.findById(id)
    if (!existing) return undefined

    return this.storage.update(id, { acknowledged: true })
  }
}
