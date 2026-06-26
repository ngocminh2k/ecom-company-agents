import { describe, it, expect, beforeEach } from 'vitest'
import { RefundService, type RefundRequest, type RefundStorage } from './refund-service.js'

class MockRefundStorage implements RefundStorage {
  private items: RefundRequest[] = []

  findAll(): RefundRequest[] {
    return this.items
  }

  findById(id: string): RefundRequest | undefined {
    return this.items.find((r) => r.id === id)
  }

  create(refund: RefundRequest): RefundRequest {
    this.items.push(refund)
    return refund
  }

  update(id: string, updates: Partial<RefundRequest>): RefundRequest | undefined {
    const idx = this.items.findIndex((r) => r.id === id)
    if (idx === -1) return undefined
    this.items[idx] = { ...this.items[idx], ...updates }
    return this.items[idx]
  }
}

describe('RefundService', () => {
  let storage: MockRefundStorage
  let service: RefundService

  beforeEach(() => {
    storage = new MockRefundStorage()
    service = new RefundService(storage)
  })

  describe('submitRefund / initiateRefund', () => {
    it('submits a refund request', () => {
      const refund = service.initiateRefund({
        orderId: 'order-1',
        channel: 'shopify',
        sku: 'TSHIRT-001',
        reason: 'Wrong size',
        fault: 'customer',
        amount: 15,
        resolution: 'partial_refund',
        handler: 'agent-1',
      })

      expect(refund.id).toBeDefined()
      expect(refund.orderId).toBe('order-1')
      expect(refund.amount).toBe(15)
      expect(refund.createdAt).toBeDefined()
    })

    it('auto-approves amount within agent threshold', () => {
      const refund = service.initiateRefund({
        orderId: 'order-1',
        channel: 'shopify',
        sku: 'MUG-001',
        reason: 'Chipped',
        fault: 'production',
        amount: 15,
        resolution: 'full_refund',
        handler: 'agent-1',
      })

      expect(refund.status).toBe('approved')
    })

    it('flags as pending_approval when amount exceeds agent threshold', () => {
      const refund = service.initiateRefund({
        orderId: 'order-2',
        channel: 'amazon',
        sku: 'HOODIE-001',
        reason: 'Wrong color',
        fault: 'design',
        amount: 50,
        resolution: 'full_refund',
        handler: 'agent-1',
      })

      expect(refund.status).toBe('pending_approval')
    })
  })

  describe('approveRefund', () => {
    it('approves a pending refund within role threshold', () => {
      const refund = service.initiateRefund({
        orderId: 'order-1',
        channel: 'shopify',
        sku: 'HOODIE-001',
        reason: 'Wrong color',
        fault: 'design',
        amount: 50,
        resolution: 'full_refund',
        handler: 'agent-1',
      })

      const approved = service.approveRefund(refund.id, 'teamLead')
      expect(approved.status).toBe('approved')
    })

    it('throws when amount exceeds approver threshold', () => {
      const refund = service.initiateRefund({
        orderId: 'order-1',
        channel: 'shopify',
        sku: 'HOODIE-001',
        reason: 'Wrong color',
        fault: 'design',
        amount: 100,
        resolution: 'full_refund',
        handler: 'agent-1',
      })

      expect(() => service.approveRefund(refund.id, 'agent')).toThrow(/exceeds/)
    })
  })

  describe('rejectRefund', () => {
    it('rejects a pending refund with reason', () => {
      const refund = service.initiateRefund({
        orderId: 'order-1',
        channel: 'shopify',
        sku: 'MUG-001',
        reason: 'Changed mind',
        fault: 'customer',
        amount: 50,
        resolution: 'full_refund',
        handler: 'agent-1',
      })

      const rejected = service.rejectRefund(refund.id, 'Customer not eligible')
      expect(rejected.status).toBe('disputed')
    })

    it('throws when refund not pending', () => {
      const refund = service.initiateRefund({
        orderId: 'order-1',
        channel: 'shopify',
        sku: 'MUG-001',
        reason: 'Wrong size',
        fault: 'customer',
        amount: 10,
        resolution: 'full_refund',
        handler: 'agent-1',
      })

      expect(() => service.rejectRefund(refund.id, 'Reason')).toThrow(/not pending approval/)
    })
  })
})
