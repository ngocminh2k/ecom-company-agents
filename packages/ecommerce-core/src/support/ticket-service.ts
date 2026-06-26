/**
 * Ticket Service — support ticket lifecycle management.
 *
 * SOP Section 14.3: 10-step message handling process.
 * Pure business logic, SQLite backed via TicketStorage interface.
 */

import { randomUUID } from 'node:crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TicketChannel = 'etsy' | 'shopify' | 'amazon' | 'facebook' | 'instagram' | 'tiktok' | 'email'
export type TicketType = 'pre_purchase' | 'personalization' | 'tracking' | 'exchange' | 'refund' | 'complaint' | 'bad_review' | 'chargeback'
export type TicketStatus = 'open' | 'waiting_customer' | 'escalated' | 'resolved' | 'closed'

export interface SupportTicket {
  id: string
  channel: TicketChannel
  customerId?: string
  customerEmail?: string
  customerName?: string
  orderId?: string
  ticketType: TicketType
  content: string
  status: TicketStatus
  assignedTo?: string
  macroUsed?: string
  resolution?: string
  csat?: number
  slaDeadline?: string
  firstResponseAt?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TicketResponse {
  id: string
  ticketId: string
  response: string
  createdBy?: string
  createdAt: string
}

export interface TicketFilters {
  channel?: TicketChannel
  ticketType?: TicketType
  status?: TicketStatus
}

export interface SlaBreachInfo {
  ticket: SupportTicket
  deadline: string
  severity: 'warning' | 'breach'
}

export interface CreateTicketInput {
  channel: TicketChannel
  customerId?: string
  customerEmail?: string
  customerName?: string
  orderId?: string
  ticketType: TicketType
  content: string
  assignedTo?: string
}

// ─── Storage Interface ───────────────────────────────────────────────────────

export interface TicketStorage {
  findAll(filters?: TicketFilters): SupportTicket[]
  findById(id: string): SupportTicket | undefined
  create(ticket: SupportTicket): SupportTicket
  update(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined
  addResponse(response: TicketResponse): TicketResponse
  getResponses(ticketId: string): TicketResponse[]
}

// ─── SLA Calculation ─────────────────────────────────────────────────────────

const HIGH_RISK_TYPES: TicketType[] = ['refund', 'chargeback', 'complaint']

/**
 * Calculate SLA deadline based on ticket type.
 * 4 hours for high risk (refund, chargeback, complaint)
 * 12 hours for standard types
 */
export function calculateSlaDeadline(ticketType: TicketType): string {
  const hours = HIGH_RISK_TYPES.includes(ticketType) ? 4 : 12
  const now = new Date()
  now.setHours(now.getHours() + hours)
  return now.toISOString()
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TicketService {
  constructor(private storage: TicketStorage) {}

  /**
   * Create a new support ticket with SLA deadline.
   * SOP Section 14.3 steps 1-5: determine channel, type, check order/tracking/production.
   */
  createTicket(input: CreateTicketInput): SupportTicket {
    const now = new Date().toISOString()
    const ticket: SupportTicket = {
      id: randomUUID(),
      channel: input.channel,
      customerId: input.customerId,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      orderId: input.orderId,
      ticketType: input.ticketType,
      content: input.content,
      status: 'open',
      assignedTo: input.assignedTo,
      slaDeadline: calculateSlaDeadline(input.ticketType),
      createdAt: now,
      updatedAt: now,
    }

    return this.storage.create(ticket)
  }

  /**
   * Respond to a ticket.
   * SOP Section 14.3 step 6: respond with appropriate macro, personalize content.
   * Records firstResponseAt if this is the first response.
   */
  respondToTicket(id: string, response: string, createdBy?: string): SupportTicket | undefined {
    const ticket = this.storage.findById(id)
    if (!ticket) return undefined

    const now = new Date().toISOString()
    const updates: Partial<SupportTicket> = {
      updatedAt: now,
      status: ticket.status === 'open' ? ('waiting_customer' as TicketStatus) : ticket.status,
    }

    // SOP 14.3 step 10: track first response time for SLA
    if (!ticket.firstResponseAt) {
      updates.firstResponseAt = now
    }

    // SOP 14.3 step 6-7: log response and tag
    this.storage.addResponse({
      id: randomUUID(),
      ticketId: id,
      response,
      createdBy,
      createdAt: now,
    })

    return this.storage.update(id, updates)
  }

  /**
   * Escalate a ticket.
   * SOP Section 14.3 step 8: escalate if beyond handling authority.
   */
  escalate(id: string, reason: string): SupportTicket | undefined {
    const ticket = this.storage.findById(id)
    if (!ticket) return undefined

    return this.storage.update(id, {
      status: 'escalated',
      updatedAt: new Date().toISOString(),
      resolution: `Escalated: ${reason}`,
    })
  }

  /**
   * Assign a ticket to an agent.
   */
  assignTicket(id: string, assignedTo: string): SupportTicket | undefined {
    const ticket = this.storage.findById(id)
    if (!ticket) return undefined

    return this.storage.update(id, {
      assignedTo,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Resolve a ticket.
   * SOP Section 14.3 step 9: record resolution in internal notes.
   */
  resolve(id: string, resolution: string): SupportTicket | undefined {
    const ticket = this.storage.findById(id)
    if (!ticket) return undefined

    const now = new Date().toISOString()
    return this.storage.update(id, {
      status: 'resolved',
      resolution,
      resolvedAt: now,
      updatedAt: now,
    })
  }

  /**
   * Get tickets with optional filters.
   */
  getTickets(filters?: TicketFilters): SupportTicket[] {
    return this.storage.findAll(filters)
  }

  /**
   * Get a single ticket by ID.
   */
  getTicket(id: string): SupportTicket | undefined {
    return this.storage.findById(id)
  }

  /**
   * Get all tickets for a customer by email.
   */
  getTicketsByCustomer(customerEmail: string): SupportTicket[] {
    return this.storage
      .findAll()
      .filter((t) => t.customerEmail?.toLowerCase() === customerEmail.toLowerCase())
  }

  /**
   * Get tickets that have breached their SLA deadline.
   * Returns tickets that are still open/waiting_customer but past deadline.
   */
  getSlaBreaches(): SlaBreachInfo[] {
    const now = new Date().toISOString()
    const openTickets = [
      ...this.storage.findAll({ status: 'open' }),
      ...this.storage.findAll({ status: 'waiting_customer' }),
    ]

    return openTickets
      .filter((t) => t.slaDeadline && t.slaDeadline < now)
      .map((t) => ({
        ticket: t,
        deadline: t.slaDeadline!,
        severity: 'breach' as const,
      }))
  }
}
