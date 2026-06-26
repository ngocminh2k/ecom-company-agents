import { describe, it, expect, beforeEach } from 'vitest'
import { DsarService, DsarRequest, DsarStorage } from './dsar-service.js'

class MockDsarStorage implements DsarStorage {
  private requests: Map<string, DsarRequest> = new Map()

  findById(id: string): DsarRequest | undefined {
    return this.requests.get(id)
  }

  findAllActive(): DsarRequest[] {
    return Array.from(this.requests.values()).filter(
      r => r.status !== 'fulfilled' && r.status !== 'rejected'
    )
  }

  upsert(request: DsarRequest): DsarRequest {
    // Return a copy to ensure immutability is maintained by caller
    const copy = { ...request }
    this.requests.set(request.id, copy)
    return copy
  }
}

describe('DsarService', () => {
  let storage: MockDsarStorage
  let service: DsarService

  beforeEach(() => {
    storage = new MockDsarStorage()
    service = new DsarService(storage)
  })

  it('submits a new request with correct SLA deadline', () => {
    const start = new Date()
    const request = service.submitRequest('customer-1', 'access')

    expect(request.id).toBeDefined()
    expect(request.customerId).toBe('customer-1')
    expect(request.requestType).toBe('access')
    expect(request.status).toBe('submitted')

    const submitted = new Date(request.submittedAt)
    const deadline = new Date(request.deadlineAt)
    
    // SLA is 72 hours
    const diffHours = (deadline.getTime() - submitted.getTime()) / (1000 * 60 * 60)
    expect(diffHours).toBe(72)
    
    expect(submitted.getTime()).toBeGreaterThanOrEqual(start.getTime())
  })

  it('enforces valid status transitions', () => {
    const req = service.submitRequest('customer-1', 'deletion')
    
    // submitted -> in_review
    const updated1 = service.transitionStatus(req.id, 'in_review')
    expect(updated1.status).toBe('in_review')
    
    // in_review -> processing
    const updated2 = service.transitionStatus(req.id, 'processing')
    expect(updated2.status).toBe('processing')
    
    // processing -> fulfilled (needs notes)
    const updated3 = service.transitionStatus(req.id, 'fulfilled', 'Deleted user data')
    expect(updated3.status).toBe('fulfilled')
    expect(updated3.resolutionNotes).toBe('Deleted user data')
  })

  it('prevents transitioning from terminal states', () => {
    const req = service.submitRequest('customer-1', 'deletion')
    service.transitionStatus(req.id, 'rejected', 'Invalid request')
    
    expect(() => {
      service.transitionStatus(req.id, 'in_review')
    }).toThrow(/Cannot transition from terminal state/)
  })

  it('prevents invalid transitions', () => {
    const req = service.submitRequest('customer-1', 'deletion')
    
    expect(() => {
      service.transitionStatus(req.id, 'fulfilled', 'Notes')
    }).toThrow(/Invalid status transition/)
  })

  it('requires notes for terminal states', () => {
    const req = service.submitRequest('customer-1', 'deletion')
    
    expect(() => {
      service.transitionStatus(req.id, 'rejected')
    }).toThrow(/resolutionNotes required/)
    
    expect(() => {
      service.transitionStatus(req.id, 'rejected', '   ')
    }).toThrow(/resolutionNotes required/)
  })

  it('identifies overdue requests', () => {
    // Create an overdue request by manually mocking storage
    const overdueReq: DsarRequest = {
      id: 'overdue-1',
      customerId: 'customer-overdue',
      requestType: 'access',
      status: 'submitted',
      submittedAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
      deadlineAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    }
    storage.upsert(overdueReq)
    
    // Create an active, on-time request
    service.submitRequest('customer-2', 'deletion')
    
    const overdue = service.checkOverdueRequests()
    expect(overdue.length).toBe(1)
    expect(overdue[0].id).toBe('overdue-1')
  })
})
