import { describe, it, expect } from 'vitest'
import { PodOrderRouter, PodOrderStorage, PodOrder, PodOrderStatus } from './order-router'

class MockPodOrderStorage implements PodOrderStorage {
  private orders: PodOrder[] = []

  findAll(): PodOrder[] {
    return this.orders
  }

  findById(id: string): PodOrder | undefined {
    return this.orders.find(o => o.id === id)
  }

  findByStatus(status: PodOrderStatus): PodOrder[] {
    return this.orders.filter(o => o.status === status)
  }

  insert(order: PodOrder): void {
    this.orders.push(order)
  }

  update(id: string, order: PodOrder): void {
    const idx = this.orders.findIndex(o => o.id === id)
    if (idx !== -1) this.orders[idx] = order
  }
}

describe('PodOrderRouter', () => {
  describe('routeToPrintProvider', () => {
    it('should create a routed order', () => {
      const svc = new PodOrderRouter(new MockPodOrderStorage())
      const order = svc.routeToPrintProvider({
        sku: 'tshirt',
        variant: 'white-m',
        quantity: 2,
        shippingAddress: '123 Main St, US',
        printProvider: 'printful',
      })

      expect(order.id).toBeDefined()
      expect(order.sku).toBe('tshirt')
      expect(order.status).toBe('routed')
      expect(order.printProvider).toBe('printful')
    })

    it('should reject unsupported print provider', () => {
      const svc = new PodOrderRouter(new MockPodOrderStorage())
      expect(() => svc.routeToPrintProvider({
        sku: 'tshirt', variant: 'white-m', quantity: 1,
        shippingAddress: '123 Main', printProvider: 'custom' as any,
      })).toThrow('Unsupported print provider')
    })

    it('should reject quantity exceeding max for provider', () => {
      const svc = new PodOrderRouter(new MockPodOrderStorage())
      expect(() => svc.routeToPrintProvider({
        sku: 'tshirt', variant: 'white-m', quantity: 200,
        shippingAddress: '123 Main', printProvider: 'printful',
      })).toThrow('exceeds printful max of 100')
    })

    it('should reject empty sku', () => {
      const svc = new PodOrderRouter(new MockPodOrderStorage())
      expect(() => svc.routeToPrintProvider({
        sku: '', variant: 'v', quantity: 1,
        shippingAddress: 'a', printProvider: 'printful',
      })).toThrow('SKU is required')
    })
  })

  describe('checkPrintStatus', () => {
    it('should transition along valid paths', () => {
      const storage = new MockPodOrderStorage()
      const svc = new PodOrderRouter(storage)
      const order = svc.routeToPrintProvider({
        sku: 'tshirt', variant: 'white-m', quantity: 1,
        shippingAddress: '123 Main', printProvider: 'printful',
      })

      const processing = svc.checkPrintStatus(order.id, 'processing')
      expect(processing.status).toBe('processing')

      const produced = svc.checkPrintStatus(order.id, 'in_production')
      expect(produced.status).toBe('in_production')

      const shipped = svc.checkPrintStatus(order.id, 'shipped', { trackingNumber: 'TRK123', shipDate: '2026-06-27' })
      expect(shipped.status).toBe('shipped')
      expect(shipped.trackingNumber).toBe('TRK123')
    })

    it('should reject invalid transition', () => {
      const storage = new MockPodOrderStorage()
      const svc = new PodOrderRouter(storage)
      const order = svc.routeToPrintProvider({
        sku: 'tshirt', variant: 'white-m', quantity: 1,
        shippingAddress: '123 Main', printProvider: 'printful',
      })

      expect(() => svc.checkPrintStatus(order.id, 'delivered')).toThrow('Cannot transition')
    })

    it('should throw on missing order', () => {
      const svc = new PodOrderRouter(new MockPodOrderStorage())
      expect(() => svc.checkPrintStatus('nope', 'shipped')).toThrow('not found')
    })
  })

  describe('getActivePrintOrders', () => {
    it('should return only pending/routed/processing/in_production orders', () => {
      const storage = new MockPodOrderStorage()
      const svc = new PodOrderRouter(storage)

      const o1 = svc.routeToPrintProvider({
        sku: 'tshirt', variant: 'w', quantity: 1,
        shippingAddress: 'A', printProvider: 'printful',
      })
      svc.checkPrintStatus(o1.id, 'processing')
      svc.checkPrintStatus(o1.id, 'in_production')
      svc.checkPrintStatus(o1.id, 'shipped', { trackingNumber: 'T1', shipDate: '2026-06-27' })
      svc.checkPrintStatus(o1.id, 'delivered')

      const o2 = svc.routeToPrintProvider({
        sku: 'mug', variant: 'b', quantity: 2,
        shippingAddress: 'B', printProvider: 'printful',
      })

      const active = svc.getActivePrintOrders()
      expect(active).toHaveLength(1)
      expect(active[0].id).toBe(o2.id)
    })
  })
})
