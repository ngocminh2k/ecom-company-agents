import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  DsarService,
  DsarStorage,
  DsarRequest,
  DsarRequestType,
  DsarStatus,
} from './dsar-service.js'
import { ValidationError } from '../order/service.js'

class MockDsarStorage implements DsarStorage {
  private requests: Map<string, DsarRequest> = new Map()

  create(request: DsarRequest): DsarRequest {
    this.requests.set(request.id, { ...request })
    return this.requests.get(request.id)!
  }

  findById(id: string): DsarRequest | undefined {
    const req = this.requests.get(id)
    return req ? { ...req } : undefined
  }

  update(id: string, updates: Partial<DsarRequest>): DsarRequest | undefined {
    const existing = this.requests.get(id)
    if (!existing) return undefined
    
    const updated = { ...existing, ...updates }
    this.requests.set(id, updated)
    return { ...updated }
  }

  findOverdue(currentDate: string): DsarRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.status !== 'fulfilled' && r.status !== 'rejected' && r.dueDate < currentDate
    )
  }
}

describe('DsarService', () => {
  let storage: MockDsarStorage
  let service: DsarService
  const mockDate = new Date('2026-06-26T12:00:00.000Z')

  beforeEach(() => {
    storage = new MockDsarStorage()
    service = new DsarService(storage)
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('submitRequest', () => {
    it('creates a new DSAR request correctly', () => {
      const result = service.submitRequest('cust-123', 'deletion', 'Delete my account')

      expect(result.id).toBeDefined()
      expect(result.customerId).toBe('cust-123')
      expect(result.requestType).toBe('deletion')
      expect(result.status).toBe('received')
      expect(result.details).toBe('Delete my account')
      
      // dueDate should be exactly 72 hours from createdAt
      const expectedDueDate = new Date(mockDate.getTime() + 72 * 60 * 60 * 1000).toISOString()
      expect(result.dueDate).toBe(expectedDueDate)
      expect(result.createdAt).toBe(mockDate.toISOString())
      
      expect(storage.findById(result.id)).toEqual(result)
    })

    it('throws ValidationError if required fields are missing', () => {
      expect(() => service.submitRequest('', 'access', 'details')).toThrow(ValidationError)
      expect(() => service.submitRequest('cust', '' as DsarRequestType, 'details')).toThrow(ValidationError)
      expect(() => service.submitRequest('cust', 'access', '')).toThrow(ValidationError)
    })
  })

  describe('resolveRequest', () => {
    it('resolves an open request', () => {
      const request = service.submitRequest('cust-123', 'access', 'Give me data')
      
      vi.advanceTimersByTime(24 * 60 * 60 * 1000) // 1 day later
      const resolveDate = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000)
      
      const resolved = service.resolveRequest(request.id, 'Data sent via email')
      
      expect(resolved.status).toBe('fulfilled')
      expect(resolved.resolutionNotes).toBe('Data sent via email')
      expect(resolved.updatedAt).toBe(resolveDate.toISOString())
    })

    it('throws error for invalid input', () => {
      expect(() => service.resolveRequest('', 'notes')).toThrow(ValidationError)
      expect(() => service.resolveRequest('id', '')).toThrow(ValidationError)
    })

    it('throws error if request does not exist', () => {
      expect(() => service.resolveRequest('non-existent', 'notes')).toThrow(ValidationError)
    })

    it('throws error if request is already closed', () => {
      const request = service.submitRequest('cust-123', 'access', 'Give me data')
      service.resolveRequest(request.id, 'Data sent via email')
      
      expect(() => service.resolveRequest(request.id, 'Done again')).toThrow(ValidationError)
      expect(() => service.resolveRequest(request.id, 'Done again')).toThrow('Request is already closed')
    })
  })

  describe('rejectRequest', () => {
    it('rejects an open request with legal justification', () => {
      const request = service.submitRequest('cust-123', 'deletion', 'Delete orders')
      
      const rejected = service.rejectRequest(request.id, 'Must retain for tax purposes for 5 years')
      
      expect(rejected.status).toBe('rejected')
      expect(rejected.resolutionNotes).toBe('Must retain for tax purposes for 5 years')
    })

    it('throws error if request is already closed', () => {
      const request = service.submitRequest('cust-123', 'deletion', 'Delete orders')
      service.rejectRequest(request.id, 'Cannot delete')
      
      expect(() => service.rejectRequest(request.id, 'Still cannot')).toThrow('Request is already closed')
    })
  })

  describe('checkSlaBreaches', () => {
    it('returns empty array when no requests are overdue', () => {
      service.submitRequest('cust-1', 'access', 'details')
      service.submitRequest('cust-2', 'deletion', 'details')
      
      // Advance 2 days (48 hours < 72 hours SLA)
      vi.advanceTimersByTime(48 * 60 * 60 * 1000)
      
      expect(service.checkSlaBreaches()).toHaveLength(0)
    })

    it('returns overdue requests', () => {
      const req1 = service.submitRequest('cust-1', 'access', 'details')
      
      // Request 2 happens 1 day later
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
      const req2 = service.submitRequest('cust-2', 'deletion', 'details')
      
      // Request 3 happens, but we resolve it
      const req3 = service.submitRequest('cust-3', 'correction', 'details')
      service.resolveRequest(req3.id, 'Done')
      
      // Advance to day 4 (total 96 hours from start)
      // req1 is at 96 hours (overdue, > 72)
      // req2 is at 72 hours (exactly at deadline, not technically < currentDate if comparing strict, but check how findOverdue works)
      // Let's advance past req2's deadline just to be safe
      vi.advanceTimersByTime(73 * 60 * 60 * 1000)
      
      const breaches = service.checkSlaBreaches()
      
      expect(breaches).toHaveLength(2)
      const breachIds = breaches.map(b => b.id)
      expect(breachIds).toContain(req1.id)
      expect(breachIds).toContain(req2.id)
      expect(breachIds).not.toContain(req3.id) // Was resolved
    })
  })
})
