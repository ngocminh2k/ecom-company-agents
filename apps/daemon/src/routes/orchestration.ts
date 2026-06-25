/**
 * Orchestration Routes — Product launch pipeline, checklist, lifecycle checkpoints.
 *
 * Phase 9: Product Launch Orchestration (SOP Sections 22-23).
 */
import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import {
  LaunchOrchestrator,
  type LaunchOrchestrationStorage,
  type LaunchOrchestration,
  LaunchChecklistService,
  type LaunchChecklistStorage,
  type LaunchChecklistItem,
  LifecycleStateService,
  type LifecycleStateStorage,
  type LifecycleState,
} from '@ngocminh2k/ecommerce-core'

export const orchestrationRouter: RouterType = Router()

// ─── Storage Adapters ─────────────────────────────────────────────────────────────

function createOrchestrationStorage(): LaunchOrchestrationStorage {
  return {
    findById(id: string): LaunchOrchestration | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM launch_orchestrations WHERE id = ?').get(id) as any
      return row ? rowToOrchestration(row) : undefined
    },
    findByProductId(productId: string): LaunchOrchestration | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM launch_orchestrations WHERE product_id = ?').get(productId) as any
      return row ? rowToOrchestration(row) : undefined
    },
    insert(orch: LaunchOrchestration): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO launch_orchestrations (id, product_id, stage, status, etsy_launched, shopify_launched, amazon_ready, ad_campaign_active, social_content_posted, fulfillment_ready, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orch.id, orch.productId, orch.stage, orch.status,
        orch.etsyLaunched ? 1 : 0, orch.shopifyLaunched ? 1 : 0,
        orch.amazonReady ? 1 : 0, orch.adCampaignActive ? 1 : 0,
        orch.socialContentPosted ? 1 : 0, orch.fulfillmentReady ? 1 : 0,
        orch.createdAt, orch.updatedAt,
      )
    },
    update(id: string, updates: Partial<LaunchOrchestration>): void {
      const db = getDb()
      const fields: string[] = []
      const values: any[] = []
      if (updates.stage !== undefined) { fields.push('stage = ?'); values.push(updates.stage) }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.etsyLaunched !== undefined) { fields.push('etsy_launched = ?'); values.push(updates.etsyLaunched ? 1 : 0) }
      if (updates.shopifyLaunched !== undefined) { fields.push('shopify_launched = ?'); values.push(updates.shopifyLaunched ? 1 : 0) }
      if (updates.amazonReady !== undefined) { fields.push('amazon_ready = ?'); values.push(updates.amazonReady ? 1 : 0) }
      if (updates.adCampaignActive !== undefined) { fields.push('ad_campaign_active = ?'); values.push(updates.adCampaignActive ? 1 : 0) }
      if (updates.socialContentPosted !== undefined) { fields.push('social_content_posted = ?'); values.push(updates.socialContentPosted ? 1 : 0) }
      if (updates.fulfillmentReady !== undefined) { fields.push('fulfillment_ready = ?'); values.push(updates.fulfillmentReady ? 1 : 0) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }
      if (fields.length === 0) return
      values.push(id)
      db.prepare(`UPDATE launch_orchestrations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    },
    findAll(): LaunchOrchestration[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM launch_orchestrations ORDER BY created_at DESC').all() as any[]).map(rowToOrchestration)
    },
  }
}

function rowToOrchestration(row: any): LaunchOrchestration {
  return {
    id: row.id,
    productId: row.product_id,
    stage: row.stage,
    status: row.status,
    etsyLaunched: !!row.etsy_launched,
    shopifyLaunched: !!row.shopify_launched,
    amazonReady: !!row.amazon_ready,
    adCampaignActive: !!row.ad_campaign_active,
    socialContentPosted: !!row.social_content_posted,
    fulfillmentReady: !!row.fulfillment_ready,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function createChecklistStorage(): LaunchChecklistStorage {
  return {
    findByProductId(productId: string): LaunchChecklistItem[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM launch_checklist WHERE product_id = ? ORDER BY item_key').all(productId) as any[]).map(rowToChecklistItem)
    },
    findById(id: string): LaunchChecklistItem | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM launch_checklist WHERE id = ?').get(id) as any
      return row ? rowToChecklistItem(row) : undefined
    },
    insert(item: LaunchChecklistItem): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO launch_checklist (id, product_id, item_key, item_name, completed, completed_at, completed_by, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id, item.productId, `item_${item.itemId}`, item.itemName,
        item.completed ? 1 : 0,
        item.completedAt ?? null, item.completedBy ?? null, item.notes ?? null,
        new Date().toISOString(),
      )
    },
    update(id: string, updates: Partial<LaunchChecklistItem>): void {
      const db = getDb()
      const fields: string[] = []
      const values: any[] = []
      if (updates.completed !== undefined) { fields.push('completed = ?'); values.push(updates.completed ? 1 : 0) }
      if (updates.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(updates.completedAt ?? null) }
      if (updates.completedBy !== undefined) { fields.push('completed_by = ?'); values.push(updates.completedBy ?? null) }
      if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes ?? null) }
      if (fields.length === 0) return
      values.push(id)
      db.prepare(`UPDATE launch_checklist SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    },
  }
}

function rowToChecklistItem(row: any): LaunchChecklistItem {
  return {
    id: row.id,
    productId: row.product_id,
    itemId: parseInt(row.item_key.replace('item_', ''), 10),
    itemName: row.item_name,
    completed: !!row.completed,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    notes: row.notes ?? undefined,
  }
}

function createLifecycleStorage(): LifecycleStateStorage {
  return {
    findByProductId(productId: string): LifecycleState | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM product_lifecycle WHERE product_id = ?').get(productId) as any
      return row ? rowToLifecycle(row) : undefined
    },
    insert(state: LifecycleState): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO product_lifecycle (id, product_id, state, checkpoint_3day, checkpoint_7day, checkpoint_14day, checkpoint_30day, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        state.id, state.productId, state.state,
        state.checkpoint3day ?? null, state.checkpoint7day ?? null,
        state.checkpoint14day ?? null, state.checkpoint30day ?? null,
        state.createdAt, state.updatedAt,
      )
    },
    update(id: string, updates: Partial<LifecycleState>): void {
      const db = getDb()
      const fields: string[] = []
      const values: any[] = []
      if (updates.state !== undefined) { fields.push('state = ?'); values.push(updates.state) }
      if (updates.checkpoint3day !== undefined) { fields.push('checkpoint_3day = ?'); values.push(updates.checkpoint3day) }
      if (updates.checkpoint7day !== undefined) { fields.push('checkpoint_7day = ?'); values.push(updates.checkpoint7day) }
      if (updates.checkpoint14day !== undefined) { fields.push('checkpoint_14day = ?'); values.push(updates.checkpoint14day) }
      if (updates.checkpoint30day !== undefined) { fields.push('checkpoint_30day = ?'); values.push(updates.checkpoint30day) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }
      if (fields.length === 0) return
      values.push(id)
      db.prepare(`UPDATE product_lifecycle SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    },
  }
}

function rowToLifecycle(row: any): LifecycleState {
  return {
    id: row.id,
    productId: row.product_id,
    state: row.state,
    checkpoint3day: row.checkpoint_3day ?? undefined,
    checkpoint7day: row.checkpoint_7day ?? undefined,
    checkpoint14day: row.checkpoint_14day ?? undefined,
    checkpoint30day: row.checkpoint_30day ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────────

const orchStorage = createOrchestrationStorage()
const checklistStorage = createChecklistStorage()
const lifecycleStorage = createLifecycleStorage()

const orchestrator = new LaunchOrchestrator(orchStorage)
const checklistService = new LaunchChecklistService(checklistStorage)
const lifecycleService = new LifecycleStateService(lifecycleStorage)

// ─── Routes ───────────────────────────────────────────────────────────────────────

/**
 * Start a product launch orchestration.
 * POST /api/orchestration/start
 */
orchestrationRouter.post('/start', (req: any, res) => {
  const { productId } = req.body
  if (!productId) {
    return res.status(400).json({ error: true, message: 'productId is required' })
  }

  try {
    const orch = orchestrator.startLaunch({ productId })
    // Initialize checklist automatically
    const checklist = checklistService.initChecklist(productId)
    res.status(201).json({ orchestration: orch, checklist })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get orchestration status for a product.
 * GET /api/orchestration/:productId
 */
orchestrationRouter.get('/:productId', (req: any, res) => {
  const orch = orchestrator.getOrchestration(req.params.productId)
  if (!orch) {
    return res.status(404).json({ error: true, message: 'Orchestration not found for this product' })
  }
  res.json({ orchestration: orch })
})

/**
 * Advance orchestration to the next stage.
 * POST /api/orchestration/:id/advance
 */
orchestrationRouter.post('/:id/advance', (req: any, res) => {
  const { nextStage } = req.body
  if (!nextStage) {
    return res.status(400).json({ error: true, message: 'nextStage is required' })
  }

  try {
    const orch = orchestrator.advanceStage(req.params.id, nextStage)
    res.json({ orchestration: orch })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Mark current stage as completed.
 * POST /api/orchestration/:id/complete
 */
orchestrationRouter.post('/:id/complete', (req: any, res) => {
  try {
    const orch = orchestrator.completeStage(req.params.id)
    res.json({ orchestration: orch })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Set orchestration as blocked.
 * POST /api/orchestration/:id/block
 */
orchestrationRouter.post('/:id/block', (req: any, res) => {
  try {
    const orch = orchestrator.setBlocked(req.params.id, req.body.reason)
    res.json({ orchestration: orch })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Update launch flags.
 * PUT /api/orchestration/:id/flags
 */
orchestrationRouter.put('/:id/flags', (req: any, res) => {
  const { etsyLaunched, shopifyLaunched, amazonReady, adCampaignActive, socialContentPosted, fulfillmentReady } = req.body
  try {
    const orch = orchestrator.updateLaunchFlags(req.params.id, {
      etsyLaunched, shopifyLaunched, amazonReady, adCampaignActive, socialContentPosted, fulfillmentReady,
    })
    res.json({ orchestration: orch })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

// ─── Checklist Routes ─────────────────────────────────────────────────────────────

/**
 * Get launch checklist for a product.
 * GET /api/orchestration/:productId/checklist
 */
orchestrationRouter.get('/:productId/checklist', (req: any, res) => {
  const progress = checklistService.getProgress(req.params.productId)
  res.json({ checklist: progress })
})

/**
 * Initialize checklist for a product.
 * POST /api/orchestration/:productId/checklist/init
 */
orchestrationRouter.post('/:productId/checklist/init', (req: any, res) => {
  try {
    const items = checklistService.initChecklist(req.params.productId)
    res.json({ items })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Complete a checklist item.
 * POST /api/orchestration/checklist/:itemId/complete
 */
orchestrationRouter.post('/checklist/:itemId/complete', (req: any, res) => {
  const { completedBy, notes } = req.body
  try {
    const item = checklistService.completeItem(req.params.itemId, completedBy, notes)
    res.json({ item })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get blocked checklist items for a product.
 * GET /api/orchestration/:productId/blocked-items
 */
orchestrationRouter.get('/:productId/blocked-items', (req: any, res) => {
  const items = checklistService.getBlockedItems(req.params.productId)
  res.json({ blockedItems: items })
})

// ─── Checkpoint Routes ────────────────────────────────────────────────────────────

/**
 * Record a lifecycle checkpoint.
 * POST /api/orchestration/:productId/checkpoint
 */
orchestrationRouter.post('/:productId/checkpoint', (req: any, res) => {
  const { day, decision, notes } = req.body
  if (!day || !decision) {
    return res.status(400).json({ error: true, message: 'day and decision are required' })
  }
  try {
    const checkpoints = lifecycleService.recordCheckpoint(req.params.productId, day, decision, notes)
    res.json({ checkpoints })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get lifecycle checkpoints for a product.
 * GET /api/orchestration/:productId/checkpoints
 */
orchestrationRouter.get('/:productId/checkpoints', (req: any, res) => {
  const checkpoints = lifecycleService.getCheckpoints(req.params.productId)
  const daysSinceLaunch = lifecycleService.getDaysSinceLaunch(req.params.productId)
  res.json({ checkpoints, daysSinceLaunch })
})

// ─── Readiness Routes ─────────────────────────────────────────────────────────────

/**
 * Get launch readiness score for a product.
 * GET /api/orchestration/:productId/readiness
 */
orchestrationRouter.get('/:productId/readiness', (req: any, res) => {
  try {
    const readiness = orchestrator.getLaunchReadiness(req.params.productId)
    res.json({ readiness })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})
