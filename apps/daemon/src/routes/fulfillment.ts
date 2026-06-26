/**
 * Fulfillment Routes — REST endpoints for order fulfillment + QC + vendor scorecards
 *
 * SOP Sections 15-16: Fulfillment pipeline, quality control, vendor evaluation
 * All routes use SQLite directly — pure business logic, no agent calls.
 *
 * Exports:
 *   fulfillmentRouter  -> /api/fulfillment   (fulfillment orders, QC logs, vendor routes)
 *   qcRouter           -> /api/quality-check (standalone QC recording)
 *   vendorsRouter      -> /api/vendors       (vendor scorecard CRUD)
 */
import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { randomUUID } from 'node:crypto'
import {
  FulfillmentService,
  type FulfillmentOrder,
  type FulfillmentCreateInput,
  type FulfillmentStorage,
} from '@ngocminh2k/ecommerce-core'
import {
  QualityCheckService,
  type QcLogEntry,
  type QcChecklist,
  type QcStorage,
} from '@ngocminh2k/ecommerce-core'
import {
  VendorScorecardService,
  type VendorScoreInput,
  type VendorScore,
  type VendorScoreStorage,
} from '@ngocminh2k/ecommerce-core'

export const fulfillmentRouter: RouterType = Router()

// ---------------------------------------------------------------------------
// SQLite storage adapters
// ---------------------------------------------------------------------------

const fulfillmentStorage: FulfillmentStorage = {
  findById(id: string): FulfillmentOrder | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM fulfillment_orders WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return undefined
    return rowToFulfillmentOrder(row)
  },

  findByOrderId(orderId: string): FulfillmentOrder[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM fulfillment_orders WHERE order_id = ? ORDER BY created_at DESC').all(orderId) as Record<string, unknown>[]
    return rows.map(rowToFulfillmentOrder)
  },

  insert(order: FulfillmentOrder): void {
    const db = getDb()
    db.prepare(`
      INSERT INTO fulfillment_orders (id, order_id, status, sku, quantity, is_personalized, personalization_data, personalization_preview_url, production_file_url, vendor_id, assigned_to, tracking_number, carrier, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id, order.orderId, order.status, order.sku, order.quantity,
      order.isPersonalized ? 1 : 0, order.personalizationData || null,
      order.personalizationPreviewUrl || null, order.productionFileUrl || null,
      order.vendorId || null, order.assignedTo || null,
      order.trackingNumber || null, order.carrier || null,
      order.notes || null, order.createdAt, order.updatedAt,
    )
  },

  update(id: string, updates: Partial<FulfillmentOrder>): void {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) throw new Error(`Fulfillment order ${id} not found`)
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    db.prepare(`
      UPDATE fulfillment_orders SET status = ?, sku = ?, quantity = ?, is_personalized = ?,
        personalization_data = ?, personalization_preview_url = ?, production_file_url = ?,
        vendor_id = ?, assigned_to = ?, tracking_number = ?, carrier = ?, notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      merged.status, merged.sku, merged.quantity, merged.isPersonalized ? 1 : 0,
      merged.personalizationData || null, merged.personalizationPreviewUrl || null,
      merged.productionFileUrl || null, merged.vendorId || null, merged.assignedTo || null,
      merged.trackingNumber || null, merged.carrier || null, merged.notes || null,
      merged.updatedAt, id,
    )
  },
}

const qcStorage: QcStorage = {
  insert(entry: QcLogEntry): void {
    const db = getDb()
    db.prepare(`
      INSERT INTO qc_logs (id, order_id, fulfillment_order_id, checked_by, sku_ok, personalization_ok, color_size_ok, surface_ok, packaging_ok, photo_url, result, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.orderId, entry.fulfillmentOrderId, entry.checkedBy || null,
      entry.skuOk ? 1 : 0, entry.personalizationOk ? 1 : 0,
      entry.colorSizeOk ? 1 : 0, entry.surfaceOk ? 1 : 0, entry.packagingOk ? 1 : 0,
      entry.photoUrl || null, entry.result, entry.notes || null, entry.createdAt,
    )
  },

  findById(id: string): QcLogEntry | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM qc_logs WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return undefined
    return rowToQcEntry(row)
  },

  findByOrderId(orderId: string): QcLogEntry[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM qc_logs WHERE order_id = ? ORDER BY created_at DESC').all(orderId) as Record<string, unknown>[]
    return rows.map(rowToQcEntry)
  },

  findAll(): QcLogEntry[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM qc_logs ORDER BY created_at DESC').all() as Record<string, unknown>[]
    return rows.map(rowToQcEntry)
  },
}

const vendorScoreStorage: VendorScoreStorage = {
  insert(score: VendorScore): void {
    const db = getDb()
    db.prepare(`
      INSERT INTO vendor_scorecards (id, vendor_id, period, on_time_delivery, defect_rate, response_time_hours, actual_cost, peak_capacity_score, tracking_error_rate, complaint_rate, inventory_stability, overall_score, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), score.vendorId, score.period,
      score.onTimeDelivery, score.defectRate, score.responseTimeHours,
      score.actualCost, score.peakCapacityScore, score.trackingErrorRate,
      score.complaintRate, score.inventoryStability,
      score.overallScore ?? null, score.notes || null, score.createdAt,
    )
  },

  findByVendorIdAndPeriod(vendorId: string, period: string): VendorScore | undefined {
    const db = getDb()
    const row = db.prepare('SELECT * FROM vendor_scorecards WHERE vendor_id = ? AND period = ?').get(vendorId, period) as Record<string, unknown> | undefined
    if (!row) return undefined
    return rowToVendorScore(row)
  },

  findByVendorId(vendorId: string): VendorScore[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM vendor_scorecards WHERE vendor_id = ? ORDER BY period DESC').all(vendorId) as Record<string, unknown>[]
    return rows.map(rowToVendorScore)
  },

  findAll(): VendorScore[] {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM vendor_scorecards ORDER BY period DESC, vendor_id').all() as Record<string, unknown>[]
    return rows.map(rowToVendorScore)
  },
}

// ---------------------------------------------------------------------------
// Service instances
// ---------------------------------------------------------------------------

const fulfillmentService = new FulfillmentService(fulfillmentStorage)
const qcService = new QualityCheckService(qcStorage)
const vendorService = new VendorScorecardService(vendorScoreStorage)

// ---------------------------------------------------------------------------
// Vendor scorecard routes (static paths before parameterized)
// ---------------------------------------------------------------------------

fulfillmentRouter.post('/vendor-scorecard', (req: any, res) => {
  try {
    const input: VendorScoreInput = req.body
    const score = vendorService.recordScorecard(input)
    res.status(201).json({ score })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.get('/vendor-scorecard/:vendorId', (req: any, res) => {
  try {
    const period = req.query.period as string | undefined
    if (period) {
      const score = vendorService.getScorecard(req.params.vendorId, period)
      if (!score) return res.status(404).json({ error: true, message: 'Scorecard not found' })
      res.json({ score })
    } else {
      const history = vendorService.getVendorHistory(req.params.vendorId)
      res.json({ scores: history })
    }
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.get('/vendor-comparison', (_req: any, res) => {
  try {
    const comparison = vendorService.getVendorComparison()
    res.json({ comparison })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

// ---------------------------------------------------------------------------
// Fulfillment order routes (/orders/*)
// ---------------------------------------------------------------------------

fulfillmentRouter.get('/orders', (_req: any, res) => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM fulfillment_orders ORDER BY created_at DESC').all() as any[]
    res.json({ orders: rows.map(rowToFulfillmentOrder) })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders', (req: any, res) => {
  try {
    const { orderId, sku, quantity, isPersonalized, personalizationData, vendorId } = req.body
    const order = fulfillmentService.createFulfillmentOrder({
      orderId, sku, quantity, isPersonalized, personalizationData, vendorId,
    } as FulfillmentCreateInput)
    res.status(201).json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.get('/orders/:orderId', (req: any, res) => {
  try {
    const orders = fulfillmentService.getFulfillmentStatus(req.params.orderId)
    res.json({ orders })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders/:id/production', (req: any, res) => {
  try {
    const { productionFileUrl } = req.body
    let order = fulfillmentService.startProduction(req.params.id)
    if (productionFileUrl) {
      order = fulfillmentService.completeProduction(req.params.id, productionFileUrl)
    }
    res.json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders/:id/complete-production', (req: any, res) => {
  try {
    const { productionFileUrl } = req.body
    if (!productionFileUrl) {
      return res.status(400).json({ error: true, message: 'productionFileUrl is required' })
    }
    const order = fulfillmentService.completeProduction(req.params.id, productionFileUrl)
    res.json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders/:id/quality-check', (req: any, res) => {
  try {
    fulfillmentService.submitForQC(req.params.id)
    const { qcResult, notes } = req.body
    let order
    if (qcResult === 'pass') {
      order = fulfillmentService.passQC(req.params.id, notes)
    } else if (qcResult === 'fail') {
      order = fulfillmentService.failQC(req.params.id, notes || 'QC failed')
    } else {
      order = fulfillmentService.passQC(req.params.id, notes)
    }
    res.json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders/:id/ship', (req: any, res) => {
  try {
    const { trackingNumber, carrier } = req.body
    if (!trackingNumber || !carrier) {
      return res.status(400).json({ error: true, message: 'trackingNumber and carrier are required' })
    }
    const order = fulfillmentService.ship(req.params.id, trackingNumber, carrier)
    res.json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders/:id/deliver', (req: any, res) => {
  try {
    const order = fulfillmentService.confirmDelivery(req.params.id)
    res.json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.post('/orders/:id/return', (req: any, res) => {
  try {
    const { reason } = req.body
    if (!reason) {
      return res.status(400).json({ error: true, message: 'Return reason is required' })
    }
    const order = fulfillmentService.handleReturn(req.params.id, reason)
    res.json({ order })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

// ---------------------------------------------------------------------------
// QC log routes (/orders/:orderId/qc-*)
// ---------------------------------------------------------------------------

fulfillmentRouter.post('/orders/:orderId/qc-log', (req: any, res) => {
  try {
    const { fulfillmentOrderId, skuOk, personalizationOk, colorSizeOk, surfaceOk, packagingOk, photoUrl, notes, result, checkedBy } = req.body
    const checklist: QcChecklist = {
      skuOk: skuOk ?? false,
      personalizationOk: personalizationOk ?? false,
      colorSizeOk: colorSizeOk ?? false,
      surfaceOk: surfaceOk ?? false,
      packagingOk: packagingOk ?? false,
      photoUrl,
      notes,
      result: result || 'fail',
    }
    const entry = qcService.performQc(req.params.orderId, fulfillmentOrderId || req.params.orderId, checklist, checkedBy)
    res.status(201).json({ entry })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

fulfillmentRouter.get('/orders/:orderId/qc-logs', (req: any, res) => {
  try {
    const entries = qcStorage.findByOrderId(req.params.orderId)
    const passRate = qcService.getQcPassRate(req.params.orderId)
    res.json({ entries, passRate })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToFulfillmentOrder(row: Record<string, unknown>): FulfillmentOrder {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    status: row.status as FulfillmentOrder['status'],
    sku: row.sku as string,
    quantity: Number(row.quantity),
    isPersonalized: Boolean(row.is_personalized),
    personalizationData: (row.personalization_data as string) || undefined,
    personalizationPreviewUrl: (row.personalization_preview_url as string) || undefined,
    productionFileUrl: (row.production_file_url as string) || undefined,
    vendorId: (row.vendor_id as string) || undefined,
    assignedTo: (row.assigned_to as string) || undefined,
    trackingNumber: (row.tracking_number as string) || undefined,
    carrier: (row.carrier as string) || undefined,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToQcEntry(row: Record<string, unknown>): QcLogEntry {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    fulfillmentOrderId: (row.fulfillment_order_id as string) || row.order_id as string,
    checkedBy: (row.checked_by as string) || undefined,
    skuOk: Boolean(row.sku_ok),
    personalizationOk: Boolean(row.personalization_ok),
    colorSizeOk: Boolean(row.color_size_ok),
    surfaceOk: Boolean(row.surface_ok),
    packagingOk: Boolean(row.packaging_ok),
    photoUrl: (row.photo_url as string) || undefined,
    result: row.result as QcLogEntry['result'],
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
  }
}

function rowToVendorScore(row: Record<string, unknown>): VendorScore {
  return {
    vendorId: row.vendor_id as string,
    period: row.period as string,
    onTimeDelivery: Number(row.on_time_delivery),
    defectRate: Number(row.defect_rate),
    responseTimeHours: Number(row.response_time_hours),
    actualCost: Number(row.actual_cost),
    peakCapacityScore: Number(row.peak_capacity_score),
    trackingErrorRate: Number(row.tracking_error_rate),
    complaintRate: Number(row.complaint_rate),
    inventoryStability: Number(row.inventory_stability),
    overallScore: row.overall_score != null ? Number(row.overall_score) : undefined,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
  }
}

// ---------------------------------------------------------------------------
// Standalone routers (mounted at /api/quality-check and /api/vendors)
// Use the same service instances defined above
// ---------------------------------------------------------------------------

export const qcRouter: RouterType = Router()

qcRouter.post('/', (req: any, res) => {
  try {
    const { orderId, fulfillmentOrderId, skuOk, personalizationOk, colorSizeOk, surfaceOk, packagingOk, photoUrl, notes, result, checkedBy } = req.body
    const checklist: QcChecklist = {
      skuOk: skuOk ?? false,
      personalizationOk: personalizationOk ?? false,
      colorSizeOk: colorSizeOk ?? false,
      surfaceOk: surfaceOk ?? false,
      packagingOk: packagingOk ?? false,
      photoUrl,
      notes,
      result: result || 'fail',
    }
    const entry = qcService.performQc(orderId, fulfillmentOrderId || orderId, checklist, checkedBy)
    res.status(201).json({ entry })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

export const vendorsRouter: RouterType = Router()

vendorsRouter.post('/scorecard', (req: any, res) => {
  try {
    const input: VendorScoreInput = req.body
    const score = vendorService.recordScorecard(input)
    res.status(201).json({ score })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

vendorsRouter.get('/scorecard/:vendorId', (req: any, res) => {
  try {
    const period = req.query.period as string | undefined
    if (period) {
      const score = vendorService.getScorecard(req.params.vendorId, period)
      if (!score) return res.status(404).json({ error: true, message: 'Scorecard not found' })
      res.json({ score })
    } else {
      const history = vendorService.getVendorHistory(req.params.vendorId)
      res.json({ scores: history })
    }
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

vendorsRouter.get('/comparison', (_req: any, res) => {
  try {
    const comparison = vendorService.getVendorComparison()
    res.json({ comparison })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})
