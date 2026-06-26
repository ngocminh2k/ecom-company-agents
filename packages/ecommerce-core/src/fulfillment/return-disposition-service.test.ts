import { describe, it, expect, beforeEach } from 'vitest'
import {
  ReturnDispositionService,
  ReturnDispositionStorage,
  ReturnDispositionLog,
} from './return-disposition-service.js'

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

  beforeEach(() => {
    storage = new MockReturnDispositionStorage()
    service = new ReturnDispositionService(storage)
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

  it('throws error if required fields are missing', () => {
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
})
