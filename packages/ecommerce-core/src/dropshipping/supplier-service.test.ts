import { describe, it, expect } from 'vitest'
import { SupplierService, SupplierStorage, Supplier } from './supplier-service'

class MockSupplierStorage implements SupplierStorage {
  private suppliers: Supplier[] = []

  findAll(): Supplier[] {
    return this.suppliers
  }

  findById(id: string): Supplier | undefined {
    return this.suppliers.find(s => s.id === id)
  }

  insert(supplier: Supplier): void {
    this.suppliers.push(supplier)
  }

  update(id: string, supplier: Supplier): void {
    const idx = this.suppliers.findIndex(s => s.id === id)
    if (idx !== -1) this.suppliers[idx] = supplier
  }
}

describe('SupplierService', () => {
  describe('addSupplier', () => {
    it('should create a new active supplier', () => {
      const svc = new SupplierService(new MockSupplierStorage())
      const result = svc.addSupplier({ name: 'Test Co', platform: 'aliexpress', contactEmail: 'test@co.com', avgShippingDays: 7 })

      expect(result.id).toBeDefined()
      expect(result.name).toBe('Test Co')
      expect(result.status).toBe('active')
      expect(result.reliabilityScore).toBe(0)
      expect(result.avgShippingDays).toBe(7)
    })

    it('should reject empty name', () => {
      const svc = new SupplierService(new MockSupplierStorage())
      expect(() => svc.addSupplier({ name: '', platform: 'a', contactEmail: 'a@a.com', avgShippingDays: 5 }))
        .toThrow('Supplier name is required')
    })

    it('should reject invalid shipping days', () => {
      const svc = new SupplierService(new MockSupplierStorage())
      expect(() => svc.addSupplier({ name: 'X', platform: 'a', contactEmail: 'a@a.com', avgShippingDays: 0 }))
        .toThrow('Average shipping days must be a positive number')
    })
  })

  describe('updateSupplierScore', () => {
    it('should update score and round to 1 decimal', () => {
      const storage = new MockSupplierStorage()
      const svc = new SupplierService(storage)
      const s = svc.addSupplier({ name: 'X', platform: 'a', contactEmail: 'a@a.com', avgShippingDays: 5 })

      const updated = svc.updateSupplierScore(s.id, 85.55)
      expect(updated.reliabilityScore).toBe(85.6)
    })

    it('should reject score out of range', () => {
      const svc = new SupplierService(new MockSupplierStorage())
      expect(() => svc.updateSupplierScore('x', 101)).toThrow('must be between 0 and 100')
    })

    it('should throw on missing supplier', () => {
      const svc = new SupplierService(new MockSupplierStorage())
      expect(() => svc.updateSupplierScore('nope', 50)).toThrow('not found')
    })
  })

  describe('getTopSuppliers', () => {
    it('should return sorted active suppliers above min score', () => {
      const storage = new MockSupplierStorage()
      const svc = new SupplierService(storage)
      const a = svc.addSupplier({ name: 'A', platform: 'x', contactEmail: 'a@a.com', avgShippingDays: 2 })
      svc.updateSupplierScore(a.id, 90)
      const b = svc.addSupplier({ name: 'B', platform: 'x', contactEmail: 'b@a.com', avgShippingDays: 3 })
      svc.updateSupplierScore(b.id, 80)
      svc.addSupplier({ name: 'C', platform: 'x', contactEmail: 'c@a.com', avgShippingDays: 1 })

      const top = svc.getTopSuppliers(85, 10)
      expect(top).toHaveLength(1)
      expect(top[0].name).toBe('A')
    })

    it('should respect limit', () => {
      const storage = new MockSupplierStorage()
      const svc = new SupplierService(storage)
      for (let i = 0; i < 10; i++) {
        const s = svc.addSupplier({ name: `S${i}`, platform: 'x', contactEmail: `${i}@a.com`, avgShippingDays: 2 })
        svc.updateSupplierScore(s.id, 90 + (i % 3))
      }

      expect(svc.getTopSuppliers(90, 3)).toHaveLength(3)
    })
  })

  describe('flagSupplier', () => {
    it('should set status to flagged', () => {
      const storage = new MockSupplierStorage()
      const svc = new SupplierService(storage)
      const s = svc.addSupplier({ name: 'X', platform: 'x', contactEmail: 'x@a.com', avgShippingDays: 5 })

      const flagged = svc.flagSupplier(s.id, 'Late shipments')
      expect(flagged.status).toBe('flagged')
    })

    it('should throw if already flagged', () => {
      const storage = new MockSupplierStorage()
      const svc = new SupplierService(storage)
      const s = svc.addSupplier({ name: 'X', platform: 'x', contactEmail: 'x@a.com', avgShippingDays: 5 })
      svc.flagSupplier(s.id)

      expect(() => svc.flagSupplier(s.id)).toThrow('already flagged')
    })

    it('should throw on missing supplier', () => {
      const svc = new SupplierService(new MockSupplierStorage())
      expect(() => svc.flagSupplier('nope')).toThrow('not found')
    })
  })
})
