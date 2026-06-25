/**
 * Support Routes — REST endpoints for customer support ticket system.
 *
 * Implements Phase 8: Customer Support for ECC OmniStudio.
 * SOP Sections 14 (Customer Support) and 27 (Refund Log).
 */
import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import {
  TicketService,
  type TicketStorage,
  type SupportTicket,
  type TicketResponse,
  type TicketFilters,
  calculateSlaDeadline,
  RefundService,
  type RefundStorage,
  type RefundRequest,
  type InitiateRefundInput,
  type ApproverRole,
  REFUND_THRESHOLDS,
  getMacro,
  getMacrosForType,
  personalizeMacro,
  MACROS,
  shouldEscalate,
  getEscalationLevel,
} from '@ngocminh2k/ecommerce-core'

export const supportRouter: RouterType = Router()

// ─── Ticket Storage Adapter (SQLite) ─────────────────────────────────

function createTicketStorage(): TicketStorage {
  return {
    findAll(filters?: TicketFilters): SupportTicket[] {
      const db = getDb()
      let sql = 'SELECT * FROM support_tickets'
      const conditions: string[] = []
      const params: any[] = []

      if (filters?.channel) {
        conditions.push('channel = ?')
        params.push(filters.channel)
      }
      if (filters?.ticketType) {
        conditions.push('ticket_type = ?')
        params.push(filters.ticketType)
      }
      if (filters?.status) {
        conditions.push('status = ?')
        params.push(filters.status)
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ')
      }
      sql += ' ORDER BY created_at DESC'

      return db.prepare(sql).all(...params) as SupportTicket[]
    },

    findById(id: string): SupportTicket | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as SupportTicket | undefined
      return row || undefined
    },

    create(ticket: SupportTicket): SupportTicket {
      const db = getDb()
      db.prepare(`
        INSERT INTO support_tickets (id, channel, customer_id, customer_email, customer_name, order_id, ticket_type, content, status, assigned_to, macro_used, resolution, csat, sla_deadline, first_response_at, resolved_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ticket.id, ticket.channel,
        ticket.customerId ?? null, ticket.customerEmail ?? null, ticket.customerName ?? null,
        ticket.orderId ?? null,
        ticket.ticketType, ticket.content, ticket.status,
        ticket.assignedTo ?? null, ticket.macroUsed ?? null,
        ticket.resolution ?? null, ticket.csat ?? null,
        ticket.slaDeadline ?? null, ticket.firstResponseAt ?? null,
        ticket.resolvedAt ?? null,
        ticket.createdAt, ticket.updatedAt,
      )
      return ticket
    },

    update(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as any
      if (!existing) return undefined

      const fields: string[] = []
      const values: any[] = []

      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.assignedTo !== undefined) { fields.push('assigned_to = ?'); values.push(updates.assignedTo) }
      if (updates.macroUsed !== undefined) { fields.push('macro_used = ?'); values.push(updates.macroUsed) }
      if (updates.resolution !== undefined) { fields.push('resolution = ?'); values.push(updates.resolution) }
      if (updates.csat !== undefined) { fields.push('csat = ?'); values.push(updates.csat) }
      if (updates.firstResponseAt !== undefined) { fields.push('first_response_at = ?'); values.push(updates.firstResponseAt) }
      if (updates.resolvedAt !== undefined) { fields.push('resolved_at = ?'); values.push(updates.resolvedAt) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }

      if (fields.length === 0) return existing

      values.push(id)
      db.prepare(`UPDATE support_tickets SET ${fields.join(', ')} WHERE id = ?`).run(...values)

      const updated = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as SupportTicket | undefined
      return updated || undefined
    },

    addResponse(response: TicketResponse): TicketResponse {
      const db = getDb()
      db.prepare(`
        INSERT INTO ticket_responses (id, ticket_id, response, created_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        response.id, response.ticketId, response.response,
        response.createdBy ?? null, response.createdAt,
      )
      return response
    },

    getResponses(ticketId: string): TicketResponse[] {
      const db = getDb()
      return db.prepare('SELECT * FROM ticket_responses WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId) as TicketResponse[]
    },
  }
}

// ─── Refund Storage Adapter (SQLite) ───────────────────────────────────

function createRefundStorage(): RefundStorage {
  return {
    findAll(): RefundRequest[] {
      const db = getDb()
      return db.prepare('SELECT * FROM refund_logs ORDER BY created_at DESC').all() as RefundRequest[]
    },

    findById(id: string): RefundRequest | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM refund_logs WHERE id = ?').get(id) as any
      return row ? rowToRefund(row) : undefined
    },

    create(refund: RefundRequest): RefundRequest {
      const db = getDb()
      db.prepare(`
        INSERT INTO refund_logs (id, order_id, channel, sku, reason, fault, amount, resolution, handler, status, prevention_lesson, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        refund.id, refund.orderId, refund.channel,
        refund.sku, refund.reason, refund.fault,
        refund.amount, refund.resolution, refund.handler,
        refund.status, refund.preventionLesson ?? null,
        refund.createdAt, refund.updatedAt,
      )
      return refund
    },

    update(id: string, updates: Partial<RefundRequest>): RefundRequest | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM refund_logs WHERE id = ?').get(id) as any
      if (!existing) return undefined

      const fields: string[] = []
      const values: any[] = []

      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.resolution !== undefined) { fields.push('resolution = ?'); values.push(updates.resolution) }
      if (updates.preventionLesson !== undefined) { fields.push('prevention_lesson = ?'); values.push(updates.preventionLesson) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }

      if (fields.length === 0) return rowToRefund(existing)

      values.push(id)
      db.prepare(`UPDATE refund_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)

      const updated = db.prepare('SELECT * FROM refund_logs WHERE id = ?').get(id) as any
      return updated ? rowToRefund(updated) : undefined
    },
  }
}

function rowToRefund(row: any): RefundRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    channel: row.channel,
    sku: row.sku ?? '',
    reason: row.reason,
    fault: row.fault,
    amount: row.amount,
    resolution: row.resolution,
    handler: row.handler,
    status: row.status,
    preventionLesson: row.prevention_lesson,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Create singleton instances ──────────────────────────────────────────────

const ticketStorage = createTicketStorage()
const ticketService = new TicketService(ticketStorage)
const refundStorage = createRefundStorage()
const refundService = new RefundService(refundStorage)

// ─── Helper: get order total from orders table ─────────────────────────────

function getOrderTotalFromDb(orderId: string): number {
  const db = getDb()
  const order = db.prepare('SELECT total FROM orders WHERE id = ?').get(orderId) as any
  return order?.total ?? 0
}

// ─── Ticket Routes ─────────────────────────────────────────────────────────

/**
 * Create a new support ticket.
 * POST /api/support/tickets
 */
supportRouter.post('/tickets', (req: any, res) => {
  const { channel, customerId, customerEmail, customerName, orderId, ticketType, content, assignedTo } = req.body

  if (!channel || !ticketType || !content) {
    return res.status(400).json({ error: true, message: 'channel, ticketType, and content are required' })
  }

  const ticket = ticketService.createTicket({
    channel,
    customerId,
    customerEmail,
    customerName,
    orderId,
    ticketType,
    content,
    assignedTo,
  })

  res.status(201).json({ ticket })
})

/**
 * List tickets with optional filters.
 * GET /api/support/tickets?channel=&type=&status=
 */
supportRouter.get('/tickets', (req: any, res) => {
  const filters: TicketFilters = {}

  if (req.query.channel) filters.channel = req.query.channel
  if (req.query.type) filters.ticketType = req.query.type
  if (req.query.status) filters.status = req.query.status

  const tickets = ticketService.getTickets(filters)
  res.json({ tickets })
})

/**
 * Get a ticket by ID.
 * GET /api/support/tickets/:id
 */
supportRouter.get('/tickets/:id', (req: any, res) => {
  const ticket = ticketService.getTicket(req.params.id)
  if (!ticket) {
    return res.status(404).json({ error: true, message: 'Ticket not found' })
  }

  const responses = ticketStorage.getResponses(req.params.id)
  res.json({ ticket, responses })
})

/**
 * Respond to a ticket.
 * POST /api/support/tickets/:id/respond
 */
supportRouter.post('/tickets/:id/respond', (req: any, res) => {
  const { response, createdBy } = req.body

  if (!response) {
    return res.status(400).json({ error: true, message: 'response is required' })
  }

  const ticket = ticketService.respondToTicket(req.params.id, response, createdBy)
  if (!ticket) {
    return res.status(404).json({ error: true, message: 'Ticket not found' })
  }

  res.json({ ticket })
})

/**
 * Escalate a ticket.
 * POST /api/support/tickets/:id/escalate
 */
supportRouter.post('/tickets/:id/escalate', (req: any, res) => {
  const { reason } = req.body

  if (!reason) {
    return res.status(400).json({ error: true, message: 'reason is required' })
  }

  const ticket = ticketService.escalate(req.params.id, reason)
  if (!ticket) {
    return res.status(404).json({ error: true, message: 'Ticket not found' })
  }

  res.json({ ticket })
})

/**
 * Resolve a ticket.
 * POST /api/support/tickets/:id/resolve
 */
supportRouter.post('/tickets/:id/resolve', (req: any, res) => {
  const { resolution } = req.body

  if (!resolution) {
    return res.status(400).json({ error: true, message: 'resolution is required' })
  }

  const ticket = ticketService.resolve(req.params.id, resolution)
  if (!ticket) {
    return res.status(404).json({ error: true, message: 'Ticket not found' })
  }

  res.json({ ticket })
})

// ─── Macro Routes ──────────────────────────────────────────────────────────

/**
 * List all macros, optionally filtered by ticket type.
 * GET /api/support/macros?type=
 */
supportRouter.get('/macros', (req: any, res) => {
  const type = req.query.type as string | undefined

  if (type) {
    const macros = getMacrosForType(type)
    return res.json({ macros })
  }

  res.json({ macros: MACROS })
})

/**
 * Get a macro by key with optional personalization.
 * GET /api/support/macros/:key?customer_name=&order_id=
 */
supportRouter.get('/macros/:key', (req: any, res) => {
  const { key } = req.params
  const macro = getMacro(key)

  if (!macro) {
    return res.status(404).json({ error: true, message: `Macro '${key}' not found` })
  }

  // Personalize if query params provided
  const personalizableFields: Record<string, string> = {}
  for (const field of macro.personalizableFields) {
    if (req.query[field]) {
      personalizableFields[field] = req.query[field]
    }
  }

  const personalizedBody = Object.keys(personalizableFields).length > 0
    ? personalizeMacro(key, personalizableFields)
    : macro.body

  res.json({
    macro,
    personalizedBody,
    fieldsUsed: personalizableFields,
  })
})

// ─── Refund Routes ──────────────────────────────────────────────────────────

/**
 * Initiate a refund request.
 * POST /api/support/refunds
 */
supportRouter.post('/refunds', (req: any, res) => {
  const { orderId, channel, sku, reason, fault, amount, resolution, handler } = req.body

  if (!orderId || !channel || !reason || !fault || amount === undefined || !resolution || !handler) {
    return res.status(400).json({
      error: true,
      message: 'orderId, channel, reason, fault, amount, resolution, and handler are required',
    })
  }

  try {
    const refund = refundService.initiateRefund({
      orderId, channel, sku, reason, fault, amount, resolution, handler,
    })

    const escalation = shouldEscalate(
      { ticketType: 'refund' } as any,
      refund,
    )

    res.status(201).json({
      refund,
      needsApproval: refund.status === 'pending_approval',
      escalation: escalation ? { rule: escalation, level: getEscalationLevel(amount) } : null,
    })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Approve a refund request.
 * POST /api/support/refunds/:id/approve
 */
supportRouter.post('/refunds/:id/approve', (req: any, res) => {
  const { role } = req.body

  if (!role || !['agent', 'teamLead', 'manager', 'director'].includes(role)) {
    return res.status(400).json({
      error: true,
      message: 'role must be one of: agent, teamLead, manager, director',
    })
  }

  try {
    const refund = refundService.approveRefund(req.params.id, role as ApproverRole)
    res.json({ refund })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Process a refund (execute on platform).
 * POST /api/support/refunds/:id/process
 */
supportRouter.post('/refunds/:id/process', (req: any, res) => {
  try {
    const refund = refundService.processRefund(req.params.id)
    res.json({ refund })
  } catch (err: any) {
    res.status(400).json({ error: true, message: err.message })
  }
})

/**
 * Get refund requests.
 * GET /api/support/refunds
 */
supportRouter.get('/refunds', (_req, res) => {
  const refunds = refundService.getRefunds()
  res.json({ refunds })
})

/**
 * Get a refund request by ID.
 * GET /api/support/refunds/:id
 */
supportRouter.get('/refunds/:id', (req: any, res) => {
  const refund = refundService.getRefund(req.params.id)
  if (!refund) {
    return res.status(404).json({ error: true, message: 'Refund not found' })
  }
  res.json({ refund })
})

// ─── SLA Routes ─────────────────────────────────────────────────────────────

/**
 * Get active SLA breaches.
 * GET /api/support/sla-breaches
 */
supportRouter.get('/sla-breaches', (_req, res) => {
  const breaches = ticketService.getSlaBreaches()
  res.json({ breaches })
})
