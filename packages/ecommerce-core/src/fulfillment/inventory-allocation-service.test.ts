import { describe, it, expect, beforeEach } from 'vitest'
import {
  InventoryAllocationService,
  InventoryStorage,
  InventoryRecord
} from './inventory-allocation-service'

class MockInventoryStorage implements InventoryStorage {
  private records: Map<string, InventoryRecord> = new Map()

  findBySku(sku: string): InventoryRecord | undefined {
    return this.records.get(sku)
  }

  upsert(record: InventoryRecord): void {
    this.records.set(record.sku, { ...record })
  }

  // helper for tests
  __setRecord(record: InventoryRecord) {
    this.records.set(record.sku, { ...record })
  }
}

describe('InventoryAllocationService', () => {
  let storage: MockInventoryStorage
  let service: InventoryAllocationService

  beforeEach(() => {
    storage = new MockInventoryStorage()
    service = new InventoryAllocationService(storage)
  })

  describe('reserveStock', () => {
    it('successfully reserves stock when available', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 10,
        reserved: 0,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      const result = service.reserveStock('TEST-SKU', 3, 'ORDER-123')

      expect(result).toEqual({ success: true, sku: 'TEST-SKU', reservedQuantity: 3 })

      const record = storage.findBySku('TEST-SKU')
      expect(record?.available).toBe(7)
      expect(record?.reserved).toBe(3)
    })

    it('returns insufficient_stock when stock is lower than requested', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 2,
        reserved: 0,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      const result = service.reserveStock('TEST-SKU', 5, 'ORDER-123')

      expect(result).toEqual({ success: false, reason: 'insufficient_stock', available: 2 })

      const record = storage.findBySku('TEST-SKU')
      expect(record?.available).toBe(2)
      expect(record?.reserved).toBe(0)
    })

    it('returns insufficient_stock when sku does not exist', () => {
      const result = service.reserveStock('UNKNOWN-SKU', 5, 'ORDER-123')

      expect(result).toEqual({ success: false, reason: 'insufficient_stock', available: 0 })
    })

    it('throws error for invalid quantity', () => {
      expect(() => service.reserveStock('TEST-SKU', 0, 'ORDER-123')).toThrow('Quantity must be greater than zero')
    })
  })

  describe('releaseStock', () => {
    it('releases reserved stock back to available', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 7,
        reserved: 3,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      service.releaseStock('TEST-SKU', 2, 'ORDER-123')

      const record = storage.findBySku('TEST-SKU')
      expect(record?.available).toBe(9)
      expect(record?.reserved).toBe(1)
    })

    it('throws error if releasing more than reserved', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 7,
        reserved: 3,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      expect(() => service.releaseStock('TEST-SKU', 4, 'ORDER-123')).toThrow('Cannot release 4 stock: only 3 reserved for TEST-SKU')
    })

    it('throws error if SKU does not exist', () => {
      expect(() => service.releaseStock('TEST-SKU', 1, 'ORDER-123')).toThrow('Cannot release stock for unknown SKU: TEST-SKU')
    })
  })

  describe('deductShippedStock', () => {
    it('deducts reserved stock when shipped', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 7,
        reserved: 3,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      service.deductShippedStock('TEST-SKU', 3, 'ORDER-123')

      const record = storage.findBySku('TEST-SKU')
      expect(record?.available).toBe(7)
      expect(record?.reserved).toBe(0)
    })

    it('throws error if deducting more than reserved', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 7,
        reserved: 3,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      expect(() => service.deductShippedStock('TEST-SKU', 4, 'ORDER-123')).toThrow('Cannot deduct 4 shipped stock: only 3 reserved for TEST-SKU')
    })
  })

  describe('adjustStock', () => {
    it('increases available stock', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 10,
        reserved: 0,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      service.adjustStock('TEST-SKU', 5, 'available', 'RESTOCK')

      const record = storage.findBySku('TEST-SKU')
      expect(record?.available).toBe(15)
    })

    it('decreases available stock', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 10,
        reserved: 0,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      service.adjustStock('TEST-SKU', -3, 'available', 'CYCLE_COUNT')

      const record = storage.findBySku('TEST-SKU')
      expect(record?.available).toBe(7)
    })

    it('increases damaged stock', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 10,
        reserved: 0,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      service.adjustStock('TEST-SKU', 2, 'damaged', 'FOUND_DAMAGE')

      const record = storage.findBySku('TEST-SKU')
      expect(record?.damaged).toBe(2)
      expect(record?.available).toBe(10) // Note: this simple adjust method doesn't move from available, just adjusts
    })

    it('throws error if adjusting available below 0', () => {
      storage.__setRecord({
        sku: 'TEST-SKU',
        available: 5,
        reserved: 0,
        damaged: 0,
        updatedAt: '2023-01-01T00:00:00.000Z'
      })

      expect(() => service.adjustStock('TEST-SKU', -6, 'available', 'CYCLE_COUNT')).toThrow('Cannot adjust stock below 0 for SKU: TEST-SKU')
    })

    it('creates new record if it does not exist', () => {
      service.adjustStock('NEW-SKU', 10, 'available', 'INITIAL_STOCK')

      const record = storage.findBySku('NEW-SKU')
      expect(record?.available).toBe(10)
      expect(record?.reserved).toBe(0)
      expect(record?.damaged).toBe(0)
    })
  })
})
