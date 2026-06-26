import { describe, it, expect, beforeEach } from 'vitest'
import { TicketService, type SupportTicket, type TicketStorage, type TicketFilters } from './ticket-service.js'

class MockTicketStorage implements TicketStorage {
  private tickets: SupportTicket[] = []

  findAll(filters?: TicketFilters): SupportTicket[] {
    let result = this.tickets
    if (filters?.channel) result = result.filter((t) => t.channel === filters.channel)
    if (filters?.ticketType) result = result.filter((t) => t.ticketType === filters.ticketType)
    if (filters?.status) result = result.filter((t) => t.status === filters.status)
    return result
  }

  findById(id: string): SupportTicket | undefined {
    return this.tickets.find((t) => t.id === id)
  }

  create(ticket: SupportTicket): SupportTicket {
    this.tickets.push(ticket)
    return ticket
  }

  update(id: string, updates: Partial<SupportTicket>): SupportTicket | undefined {
    const idx = this.tickets.findIndex((t) => t.id === id)
    if (idx === -1) return undefined
    this.tickets[idx] = { ...this.tickets[idx], ...updates }
    return this.tickets[idx]
  }

  addResponse(_response: any): any {}
  getResponses(_ticketId: string): any[] { return [] }
}

describe('TicketService', () => {
  let storage: MockTicketStorage
  let service: TicketService

  beforeEach(() => {
    storage = new MockTicketStorage()
    service = new TicketService(storage)
  })

  describe('createTicket', () => {
    it('creates a ticket with open status and SLA deadline', () => {
      const ticket = service.createTicket({
        channel: 'email',
        customerEmail: 'test@example.com',
        ticketType: 'tracking',
        content: 'Where is my order?',
      })

      expect(ticket.id).toBeDefined()
      expect(ticket.status).toBe('open')
      expect(ticket.channel).toBe('email')
      expect(ticket.customerEmail).toBe('test@example.com')
      expect(ticket.slaDeadline).toBeDefined()
      expect(new Date(ticket.slaDeadline!).getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('assignTicket', () => {
    it('assigns a ticket to an agent', () => {
      const ticket = service.createTicket({
        channel: 'email',
        ticketType: 'complaint',
        content: 'Bad product',
      })

      const assigned = service.assignTicket(ticket.id, 'agent-1')
      expect(assigned?.assignedTo).toBe('agent-1')
    })

    it('returns undefined for non-existent ticket', () => {
      expect(service.assignTicket('nonexistent', 'agent-1')).toBeUndefined()
    })
  })

  describe('resolveTicket / resolve', () => {
    it('resolves a ticket with resolution notes', () => {
      const ticket = service.createTicket({
        channel: 'email',
        ticketType: 'refund',
        content: 'Want refund',
      })

      const resolved = service.resolve(ticket.id, 'Refund issued')
      expect(resolved?.status).toBe('resolved')
      expect(resolved?.resolution).toBe('Refund issued')
      expect(resolved?.resolvedAt).toBeDefined()
    })
  })

  describe('escalateTicket / escalate', () => {
    it('escalates a ticket with reason', () => {
      const ticket = service.createTicket({
        channel: 'shopify',
        ticketType: 'chargeback',
        content: 'Chargeback dispute',
      })

      const escalated = service.escalate(ticket.id, 'Beyond agent authority')
      expect(escalated?.status).toBe('escalated')
      expect(escalated?.resolution).toContain('Beyond agent authority')
    })

    it('returns undefined for non-existent ticket', () => {
      expect(service.escalate('nonexistent', 'reason')).toBeUndefined()
    })
  })

  describe('getTicketsByCustomer', () => {
    it('returns tickets matching customer email (case-insensitive)', () => {
      service.createTicket({
        channel: 'email',
        customerEmail: 'Alice@Example.com',
        ticketType: 'tracking',
        content: 'Where is it?',
      })
      service.createTicket({
        channel: 'email',
        customerEmail: 'alice@example.com',
        ticketType: 'refund',
        content: 'Refund please',
      })
      service.createTicket({
        channel: 'email',
        customerEmail: 'bob@example.com',
        ticketType: 'complaint',
        content: 'Bad',
      })

      const aliceTickets = service.getTicketsByCustomer('alice@example.com')
      expect(aliceTickets).toHaveLength(2)

      const bobTickets = service.getTicketsByCustomer('BOB@example.com')
      expect(bobTickets).toHaveLength(1)
    })

    it('returns empty array for customer with no tickets', () => {
      expect(service.getTicketsByCustomer('nobody@example.com')).toHaveLength(0)
    })
  })

  describe('getSlaBreaches', () => {
    it('returns empty array when no tickets are past deadline', () => {
      const breaches = service.getSlaBreaches()
      expect(breaches).toHaveLength(0)
    })
  })
})
