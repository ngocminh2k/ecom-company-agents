/**
 * Orchestration Routes — Product launch pipeline, checklist, lifecycle checkpoints.
 *
 * Phase 9: Product Launch Orchestration (SOP Sections 22-23).
 * Routes aligned with frontend api.ts contract.
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
  getValidLaunchTransitions,
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

// ─── Response Helpers (align backend → frontend api.ts shapes) ───────

function toApiOrch(orch: LaunchOrchestration) {
  return {
    id: orch.id,
    product_id: orch.productId,
    stage: orch.stage,
    status: orch.status,
    channel: '', // ponytail: add channel column to launch_orchestrations
    flags: {
      etsyLaunched: orch.etsyLaunched,
      shopifyLaunched: orch.shopifyLaunched,
      amazonReady: orch.amazonReady,
      adCampaignActive: orch.adCampaignActive,
      socialContentPosted: orch.socialContentPosted,
      fulfillmentReady: orch.fulfillmentReady,
    },
    created_at: orch.createdAt,
  }
}

function toApiChecklist(item: LaunchChecklistItem) {
  return {
    id: item.id,
    launch_id: item.productId,
    item: item.itemName,
    completed: item.completed,
    completed_at: item.completedAt,
  }
}

// ─── Orchestration ID → Product ID resolver ─────────────────────────
// Frontend passes orchestration ID in URLs; checklist/checkpoint services
// need the product ID. Resolve transparently.
function resolveProductId(id: string): string {
  const orch = orchStorage.findById(id)
  return orch ? orch.productId : id
}

// ─── Routes ───────────────────────────────────────────────────────────────────────

/**
 * Start a product launch orchestration.
 * POST /api/orchestration
 * Body: { product_id, channel }
 */
orchestrationRouter.post('/', (req: any, res) => {
  const { product_id } = req.body
  if (!product_id) {
    return res.status(400).json({ error: true, message: 'product_id is required' })
  }

  try {
    const orch = orchestrator.startLaunch({ productId: product_id })
    // Initialize checklist automatically
    checklistService.initChecklist(product_id)
    res.status(201).json({ orchestration: toApiOrch(orch) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * List all orchestrations.
 * GET /api/orchestration/
 */
orchestrationRouter.get('/', (_req: any, res) => {
  try {
    const all = orchestrator.getAll()
    res.json({ orchestrations: all.map(toApiOrch) })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

/**
 * Get orchestration by ID.
 * GET /api/orchestration/:id
 */
orchestrationRouter.get('/:id', (req: any, res) => {
  const orch = orchStorage.findById(req.params.id)
  if (!orch) {
    return res.status(404).json({ error: true, message: 'Orchestration not found' })
  }
  res.json({ orchestration: toApiOrch(orch) })
})

/**
 * Advance orchestration to next stage.
 * POST /api/orchestration/:id/advance
 * Body (optional): { nextStage } — if omitted, auto-computes from transitions.
 */
orchestrationRouter.post('/:id/advance', (req: any, res) => {
  const orch = orchStorage.findById(req.params.id)
  if (!orch) return res.status(404).json({ error: true, message: 'Orchestration not found' })

  let { nextStage } = req.body
  if (!nextStage) {
    const transitions = getValidLaunchTransitions(orch.stage)
    if (transitions.length === 0) {
      return res.status(400).json({ error: true, message: 'No further stages to advance to' })
    }
    nextStage = transitions[0]
  }

  try {
    const updated = orchestrator.advanceStage(req.params.id, nextStage)
    res.json({ orchestration: toApiOrch(updated) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Complete current stage.
 * POST /api/orchestration/:id/complete
 */
orchestrationRouter.post('/:id/complete', (req: any, res) => {
  try {
    const updated = orchestrator.completeStage(req.params.id)
    res.json({ orchestration: toApiOrch(updated) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Block orchestration.
 * POST /api/orchestration/:id/block
 * Body: { reason }
 */
orchestrationRouter.post('/:id/block', (req: any, res) => {
  try {
    const updated = orchestrator.setBlocked(req.params.id, req.body.reason)
    res.json({ orchestration: toApiOrch(updated) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Update launch flags.
 * POST /api/orchestration/:id/flags
 * Body: { etsyLaunched?, shopifyLaunched?, amazonReady?, ... }
 */
orchestrationRouter.post('/:id/flags', (req: any, res) => {
  const { etsyLaunched, shopifyLaunched, amazonReady, adCampaignActive, socialContentPosted, fulfillmentReady } = req.body
  try {
    const updated = orchestrator.updateLaunchFlags(req.params.id, {
      etsyLaunched, shopifyLaunched, amazonReady, adCampaignActive, socialContentPosted, fulfillmentReady,
    })
    res.json({ orchestration: toApiOrch(updated) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get launch readiness score.
 * GET /api/orchestration/:id/readiness
 * Returns: { ready: boolean, checks: { item, passed }[] }
 */
orchestrationRouter.get('/:id/readiness', (req: any, res) => {
  try {
    const orch = orchStorage.findById(req.params.id)
    if (!orch) return res.status(404).json({ error: true, message: 'Orchestration not found' })

    const checks = [
      { item: 'Etsy Launched', passed: orch.etsyLaunched },
      { item: 'Shopify Published', passed: orch.shopifyLaunched },
      { item: 'Amazon Ready', passed: orch.amazonReady },
      { item: 'Ad Campaign Active', passed: orch.adCampaignActive },
      { item: 'Social Content Posted', passed: orch.socialContentPosted },
      { item: 'Fulfillment Ready', passed: orch.fulfillmentReady },
    ]
    res.json({ ready: checks.every(c => c.passed), checks })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// ─── Checklist Routes ─────────────────────────────────────────────────────────────

/**
 * Get launch checklist.
 * GET /api/orchestration/:id/checklist
 */
orchestrationRouter.get('/:id/checklist', (req: any, res) => {
  const productId = resolveProductId(req.params.id)
  const progress = checklistService.getProgress(productId)
  res.json({ items: progress.items.map(toApiChecklist) })
})

/**
 * Initialize checklist.
 * POST /api/orchestration/:id/checklist/init
 */
orchestrationRouter.post('/:id/checklist/init', (req: any, res) => {
  const productId = resolveProductId(req.params.id)
  try {
    const items = checklistService.initChecklist(productId)
    res.json({ items: items.map(toApiChecklist) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Complete a checklist item.
 * POST /api/orchestration/:id/checklist/:itemId/complete
 */
orchestrationRouter.post('/:id/checklist/:itemId/complete', (req: any, res) => {
  try {
    const item = checklistService.completeItem(req.params.itemId)
    res.json({ item: toApiChecklist(item) })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get blocked/incomplete checklist items.
 * GET /api/orchestration/:id/checklist/blocked
 */
orchestrationRouter.get('/:id/checklist/blocked', (req: any, res) => {
  const productId = resolveProductId(req.params.id)
  const items = checklistService.getBlockedItems(productId)
  res.json({ items: items.map(toApiChecklist) })
})

// ─── Checkpoint Routes ────────────────────────────────────────────────────────────

/**
 * Record a lifecycle checkpoint.
 * POST /api/orchestration/:id/checkpoints
 * Body: { stage, status, notes? }
 *  stage: '3' | '7' | '14' | '30' → maps to day3/day7/day14/day30
 *  status: decision (continue/pause/stop/scale/keep/optimize)
 */
orchestrationRouter.post('/:id/checkpoints', (req: any, res) => {
  const { stage, status, notes } = req.body
  if (!stage || !status) {
    return res.status(400).json({ error: true, message: 'stage and status are required' })
  }

  const productId = resolveProductId(req.params.id)
  const dayMap: Record<string, 'day3' | 'day7' | 'day14' | 'day30'> = {
    '3': 'day3', '7': 'day7', '14': 'day14', '30': 'day30',
  }
  const day = dayMap[String(stage)] || 'day3'

  try {
    const checkpoints = lifecycleService.recordCheckpoint(productId, day, status, notes)
    res.json({ checkpoint: checkpoints })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get lifecycle checkpoints.
 * GET /api/orchestration/:id/checkpoints
 */
orchestrationRouter.get('/:id/checkpoints', (req: any, res) => {
  const productId = resolveProductId(req.params.id)
  const checkpoints = lifecycleService.getCheckpoints(productId)
  const daysSinceLaunch = lifecycleService.getDaysSinceLaunch(productId)
  res.json({ checkpoints, daysSinceLaunch })
})
