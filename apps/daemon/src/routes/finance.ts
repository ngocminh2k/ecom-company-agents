/**
 * Finance Routes — REST endpoints for daily reconciliation, PnL by SKU, and alerts.
 *
 * Implements Phase 6: Finance for AgentPulse Commerce.
 */
import { Router, type Router as RouterType } from 'express'
import { randomUUID } from 'node:crypto'
import { getDb } from '../db.js'
import type { DaemonContext } from '../app.js'
import {
  ReconciliationService,
  type ReconciliationStorage,
  type DailyReconciliation,
  type DailyReconciliationInput,
  PnLService,
  type PnLStorage,
  type PnLBySku,
  type PnLBySkuInput,
  FinanceAlertService,
  type FinanceAlertStorage,
  type FinanceAlert,
} from '@ngocminh2k/ecommerce-core'

export const financeRouter: RouterType = Router()

// ─── Reconciliation Storage Adapter (SQLite) ────────────────────────────────────

function createReconciliationStorage(): ReconciliationStorage {
  return {
    findByDateAndChannel(date: string, channel: string): DailyReconciliation | undefined {
      const db = getDb()
      const row = db.prepare(
        'SELECT * FROM daily_reconciliation WHERE date = ? AND channel = ?'
      ).get(date, channel) as any
      return row ? rowToReconciliation(row) : undefined
    },

    findAllByDate(date: string): DailyReconciliation[] {
      const db = getDb()
      const rows = db.prepare(
        'SELECT * FROM daily_reconciliation WHERE date = ? ORDER BY channel'
      ).all(date) as any[]
      return rows.map(rowToReconciliation)
    },

    upsert(record: DailyReconciliation): DailyReconciliation {
      const db = getDb()
      const existing = db.prepare(
        'SELECT id FROM daily_reconciliation WHERE date = ? AND channel = ?'
      ).get(record.date, record.channel) as any

      if (existing) {
        db.prepare(`
          UPDATE daily_reconciliation
          SET revenue = ?, platform_fees = ?, ad_spend = ?, refunds = ?,
              net_revenue = ?, orders_count = ?, refund_count = ?, notes = ?
          WHERE id = ?
        `).run(
          record.revenue, record.platformFees, record.adSpend, record.refunds,
          record.netRevenue, record.ordersCount, record.refundCount,
          record.notes ?? null, existing.id,
        )
        return { ...record, id: existing.id }
      }

      db.prepare(`
        INSERT INTO daily_reconciliation (id, date, channel, revenue, platform_fees, ad_spend, refunds, net_revenue, orders_count, refund_count, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id, record.date, record.channel,
        record.revenue, record.platformFees, record.adSpend, record.refunds,
        record.netRevenue, record.ordersCount, record.refundCount,
        record.notes ?? null, record.createdAt,
      )
      return record
    },
  }
}

function rowToReconciliation(row: any): DailyReconciliation {
  return {
    id: row.id,
    date: row.date,
    channel: row.channel,
    revenue: row.revenue,
    platformFees: row.platform_fees,
    adSpend: row.ad_spend,
    refunds: row.refunds,
    netRevenue: row.net_revenue,
    ordersCount: row.orders_count ?? 0,
    refundCount: row.refund_count ?? 0,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

// ─── PnL Storage Adapter (SQLite) ───────────────────────────────────────────────

function createPnLStorage(): PnLStorage {
  return {
    findBySkuAndPeriod(sku: string, period: string): PnLBySku | undefined {
      const db = getDb()
      const row = db.prepare(
        'SELECT * FROM pnl_by_sku WHERE sku = ? AND period = ?'
      ).get(sku, period) as any
      return row ? rowToPnL(row) : undefined
    },

    findByPeriod(period: string): PnLBySku[] {
      const db = getDb()
      const rows = db.prepare(
        'SELECT * FROM pnl_by_sku WHERE period = ? ORDER BY revenue DESC'
      ).all(period) as any[]
      return rows.map(rowToPnL)
    },

    findByProductId(productId: string): PnLBySku[] {
      const db = getDb()
      const rows = db.prepare(
        'SELECT * FROM pnl_by_sku WHERE product_id = ? ORDER BY period DESC'
      ).all(productId) as any[]
      return rows.map(rowToPnL)
    },

    upsert(record: PnLBySku): PnLBySku {
      const db = getDb()
      const existing = db.prepare(
        'SELECT id FROM pnl_by_sku WHERE sku = ? AND period = ?'
      ).get(record.sku, record.period) as any

      if (existing) {
        db.prepare(`
          UPDATE pnl_by_sku
          SET avg_price = ?, cogs = ?, shipping = ?, platform_fees = ?,
              payment_fees = ?, ads_allocated = ?, refunds_allocated = ?,
              gross_margin = ?, contribution_margin = ?, classification = ?,
              units_sold = ?, revenue = ?
          WHERE id = ?
        `).run(
          record.avgPrice, record.cogs, record.shipping, record.platformFees,
          record.paymentFees, record.adsAllocated, record.refundsAllocated,
          record.grossMargin, record.contributionMargin, record.classification,
          record.unitsSold, record.revenue, existing.id,
        )
        return { ...record, id: existing.id }
      }

      db.prepare(`
        INSERT INTO pnl_by_sku (id, sku, product_id, period, avg_price, cogs, shipping, platform_fees, payment_fees, ads_allocated, refunds_allocated, gross_margin, contribution_margin, classification, units_sold, revenue, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id, record.sku, record.productId, record.period,
        record.avgPrice, record.cogs, record.shipping, record.platformFees,
        record.paymentFees, record.adsAllocated, record.refundsAllocated,
        record.grossMargin, record.contributionMargin, record.classification,
        record.unitsSold, record.revenue, record.createdAt,
      )
      return record
    },
  }
}

function rowToPnL(row: any): PnLBySku {
  return {
    id: row.id,
    sku: row.sku,
    productId: row.product_id,
    period: row.period,
    avgPrice: row.avg_price,
    cogs: row.cogs,
    shipping: row.shipping,
    platformFees: row.platform_fees,
    paymentFees: row.payment_fees,
    adsAllocated: row.ads_allocated,
    refundsAllocated: row.refunds_allocated,
    grossMargin: row.gross_margin,
    contributionMargin: row.contribution_margin,
    classification: row.classification,
    unitsSold: row.units_sold,
    revenue: row.revenue,
    createdAt: row.created_at,
  }
}

// ─── Alert Storage Adapter (SQLite) ─────────────────────────────────────────────

function createAlertStorage(): FinanceAlertStorage {
  return {
    findAll(): FinanceAlert[] {
      const db = getDb()
      return db.prepare('SELECT * FROM finance_alerts ORDER BY created_at DESC').all() as FinanceAlert[]
    },

    findActive(): FinanceAlert[] {
      const db = getDb()
      const rows = db.prepare(
        'SELECT * FROM finance_alerts WHERE acknowledged = 0 ORDER BY created_at DESC'
      ).all() as any[]
      return rows.map(rowToAlert)
    },

    findById(id: string): FinanceAlert | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM finance_alerts WHERE id = ?').get(id) as any
      return row ? rowToAlert(row) : undefined
    },

    create(alert: FinanceAlert): FinanceAlert {
      const db = getDb()
      db.prepare(`
        INSERT INTO finance_alerts (id, type, severity, message, channel, value, created_at, acknowledged)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        alert.id, alert.type, alert.severity, alert.message,
        alert.channel ?? null, alert.value ?? null, alert.createdAt,
        alert.acknowledged ? 1 : 0,
      )
      return alert
    },

    update(id: string, updates: Partial<FinanceAlert>): FinanceAlert | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM finance_alerts WHERE id = ?').get(id) as any
      if (!existing) return undefined

      const fields: string[] = []
      const values: any[] = []

      if (updates.acknowledged !== undefined) { fields.push('acknowledged = ?'); values.push(updates.acknowledged ? 1 : 0) }
      if (updates.severity !== undefined) { fields.push('severity = ?'); values.push(updates.severity) }
      if (updates.message !== undefined) { fields.push('message = ?'); values.push(updates.message) }

      if (fields.length === 0) return rowToAlert(existing)

      values.push(id)
      db.prepare(`UPDATE finance_alerts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      const updated = db.prepare('SELECT * FROM finance_alerts WHERE id = ?').get(id) as any
      return updated ? rowToAlert(updated) : undefined
    },
  }
}

function rowToAlert(row: any): FinanceAlert {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    message: row.message,
    channel: row.channel ?? undefined,
    value: row.value ?? undefined,
    createdAt: row.created_at,
    acknowledged: !!row.acknowledged,
  }
}

// ─── Create singleton storage and service instances ─────────────────────────────

const reconciliationStorage = createReconciliationStorage()
const pnlStorage = createPnLStorage()
const alertStorage = createAlertStorage()

const reconciliationService = new ReconciliationService(reconciliationStorage)
const pnlService = new PnLService(pnlStorage)
const alertService = new FinanceAlertService(alertStorage)

// ─── Reconciliation Routes ──────────────────────────────────────────────────────

/**
 * Record daily reconciliation data for a channel.
 * POST /api/finance/reconciliation
 */
financeRouter.post('/reconciliation', (req: any, res) => {
  const { date, channel, revenue, platformFees, adSpend, refunds, ordersCount, refundCount, notes } = req.body

  if (!date || !channel) {
    return res.status(400).json({ error: true, message: 'date and channel are required' })
  }

  const input: DailyReconciliationInput = {
    date,
    channel,
    revenue: revenue ?? 0,
    platformFees: platformFees ?? 0,
    adSpend: adSpend ?? 0,
    refunds: refunds ?? 0,
    ordersCount: ordersCount ?? 0,
    refundCount: refundCount ?? 0,
    notes,
  }

  const record = reconciliationService.recordDaily(input)
  res.status(201).json({ reconciliation: record })
})

/**
 * Get reconciliation summary for a date.
 * GET /api/finance/reconciliation/:date
 */
financeRouter.get('/reconciliation/:date', (req: any, res) => {
  const summary = reconciliationService.getSummary(req.params.date)
  res.json({ summary })
})

/**
 * Get raw reconciliation records for a date.
 * GET /api/finance/reconciliation/:date/records
 */
financeRouter.get('/reconciliation/:date/records', (req: any, res) => {
  const records = reconciliationService.getDaily(req.params.date)
  res.json({ records })
})

// ─── PnL Routes ─────────────────────────────────────────────────────────────────

/**
 * Calculate and record PnL for a SKU.
 * POST /api/finance/pnl
 */
financeRouter.post('/pnl', (req: any, res) => {
  const { sku, productId, period, avgPrice, cogs, shipping, platformFees, paymentFees, adsAllocated, refundsAllocated, unitsSold } = req.body

  if (!sku || !productId || !period) {
    return res.status(400).json({ error: true, message: 'sku, productId, and period are required' })
  }

  const input: PnLBySkuInput = {
    sku,
    productId,
    period,
    avgPrice: avgPrice ?? 0,
    cogs: cogs ?? 0,
    shipping: shipping ?? 0,
    platformFees: platformFees ?? 0,
    paymentFees: paymentFees ?? 0,
    adsAllocated: adsAllocated ?? 0,
    refundsAllocated: refundsAllocated ?? 0,
    unitsSold: unitsSold ?? 0,
  }

  const pnl = pnlService.calculatePnL(input)
  res.status(201).json({ pnl })
})

/**
 * Get PnL report for a period.
 * GET /api/finance/pnl/:period
 */
financeRouter.get('/pnl/:period', (req: any, res) => {
  const report = pnlService.getPnLReport(req.params.period)
  res.json({ report })
})

/**
 * Get PnL for a single SKU in a period.
 * GET /api/finance/pnl/sku/:sku
 */
financeRouter.get('/pnl/sku/:sku', (req: any, res) => {
  const period = req.query.period as string
  if (!period) {
    return res.status(400).json({ error: true, message: 'period query parameter is required' })
  }

  const pnl = pnlService.calculatePnL({
    sku: req.params.sku,
    productId: req.query.productId as string ?? '',
    period,
    avgPrice: 0,
    cogs: 0,
    shipping: 0,
    platformFees: 0,
    paymentFees: 0,
    adsAllocated: 0,
    refundsAllocated: 0,
    unitsSold: 0,
  })
  res.json({ pnl })
})

/**
 * Get product classification.
 * GET /api/finance/pnl/product/:productId/classification
 */
financeRouter.get('/pnl/product/:productId/classification', (req: any, res) => {
  const classification = pnlService.getProductClassification(req.params.productId)
  if (classification === null) {
    return res.status(404).json({ error: true, message: 'No PnL data found for this product' })
  }
  res.json({ classification })
})

// ─── Alert Routes ───────────────────────────────────────────────────────────────

/**
 * Run alert checks and create alerts.
 * POST /api/finance/alerts/check
 */
financeRouter.post('/alerts/check', (req: any, res) => {
  const { date } = req.body
  const targetDate = date || new Date().toISOString().slice(0, 10)

  const records = reconciliationService.getDaily(targetDate)
  const alerts = alertService.checkAlerts(records)
  res.json({ alerts, count: alerts.length })
})

/**
 * Get all active alerts.
 * GET /api/finance/alerts
 */
financeRouter.get('/alerts', (_req, res) => {
  const alerts = alertService.getActiveAlerts()
  res.json({ alerts })
})

/**
 * Acknowledge an alert.
 * POST /api/finance/alerts/:id/acknowledge
 */
financeRouter.post('/alerts/:id/acknowledge', (req: any, res) => {
  const alert = alertService.acknowledgeAlert(req.params.id)
  if (!alert) {
    return res.status(404).json({ error: true, message: 'Alert not found' })
  }
  res.json({ alert })
})
