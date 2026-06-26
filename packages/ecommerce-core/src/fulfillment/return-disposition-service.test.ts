import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  ReturnDispositionService,
  ReturnDispositionStorage,
  ReturnDispositionLog,
  ReturnCondition,
} from './return-disposition-service.js'
import { ValidationError } from '../order/service.js'

class MockReturnDispositionStorage implements ReturnDispositionStorage {
  private logs: Map<string, ReturnDispositionLog> = new Map()

  insert(log: ReturnDispositionLog): void {
    this.logs.set(log.id, log)
  }

  findById(id: string): ReturnDispositionLog | undefined {
    return this.logs.get(id)
  }

  findByOrderId(orderId: string): ReturnDispositionLog[] {
    return Array.from(this.logs.values()).filter((l) => l.orderId === orderId)
  }
}

describe('ReturnDispositionService', () => {
  let storage: MockReturnDispositionStorage
  let service: ReturnDispositionService
  const mockDate = new Date('2026-06-26T12:00:00Z')

  beforeEach(() => {
    storage = new MockReturnDispositionStorage()
    service = new ReturnDispositionService(storage)
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('processes a new item return correctly', () => {
    const result = service.processReturn({
      orderId: 'ORD-123',
      sku: 'SKU-001',
      condition: 'new',
      reasonCode: 'customer_changed_mind',
      inspectedBy: 'inspector-1',
    })

    expect(result.id).toBeDefined()
    expect(result.disposition).toBe('restock')
    expect(result.claimOpened).toBe(false)
    expect(result.createdAt).toBe(mockDate.toISOString())
    expect(storage.findById(result.id)).toEqual(result)
  })

  it('processes a defective item correctly', () => {
    const result = service.processReturn({
      orderId: 'ORD-124',
      sku: 'SKU-002',
      condition: 'defective',
      reasonCode: 'does_not_work',
      inspectedBy: 'inspector-1',
    })

    expect(result.disposition).toBe('rtv')
    expect(result.claimOpened).toBe(true)
  })

  it('processes a damaged item correctly', () => {
    const result = service.processReturn({
      orderId: 'ORD-125',
      sku: 'SKU-003',
      condition: 'damaged',
      reasonCode: 'box_crushed',
      inspectedBy: 'inspector-2',
    })

    expect(result.disposition).toBe('scrap')
    expect(result.claimOpened).toBe(true)
  })

  it('processes a wrong_item return correctly', () => {
    const result = service.processReturn({
      orderId: 'ORD-126',
      sku: 'SKU-004',
      condition: 'wrong_item',
      reasonCode: 'ordered_blue_got_red',
      inspectedBy: 'inspector-1',
    })

    expect(result.disposition).toBe('restock')
    expect(result.claimOpened).toBe(false)
  })

  describe('validation errors', () => {
    it('throws ValidationError if orderId is missing', () => {
      expect(() =>
        service.processReturn({
          orderId: '',
          sku: 'SKU-001',
          condition: 'new',
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow(ValidationError)
      expect(() =>
        service.processReturn({
          orderId: '',
          sku: 'SKU-001',
          condition: 'new',
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow('orderId is required')
    })

    it('throws ValidationError if sku is missing', () => {
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: '',
          condition: 'new',
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow(ValidationError)
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: '',
          condition: 'new',
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow('sku is required')
    })

    it('throws ValidationError if condition is missing', () => {
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-001',
          condition: '' as ReturnCondition,
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow(ValidationError)
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-001',
          condition: '' as ReturnCondition,
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow('condition is required')
    })

    it('throws ValidationError if reasonCode is missing', () => {
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-001',
          condition: 'new',
          reasonCode: '',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow(ValidationError)
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-001',
          condition: 'new',
          reasonCode: '',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow('reasonCode is required')
    })

    it('throws ValidationError if inspectedBy is missing', () => {
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-001',
          condition: 'new',
          reasonCode: 'test',
          inspectedBy: '',
        }),
      ).toThrow(ValidationError)
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-001',
          condition: 'new',
          reasonCode: 'test',
          inspectedBy: '',
        }),
      ).toThrow('inspectedBy is required')
    })

    it('throws ValidationError for unknown condition', () => {
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-005',
          condition: 'unknown' as ReturnCondition,
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow(ValidationError)
      expect(() =>
        service.processReturn({
          orderId: 'ORD-127',
          sku: 'SKU-005',
          condition: 'unknown' as ReturnCondition,
          reasonCode: 'test',
          inspectedBy: 'inspector-1',
        }),
      ).toThrow('Invalid return condition')
    })
  })
})
