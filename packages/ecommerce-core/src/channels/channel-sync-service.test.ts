import { describe, it, expect } from 'vitest'
import { ChannelSyncService, ChannelSyncStorage, ChannelListing } from './channel-sync-service'

class MockChannelSyncStorage implements ChannelSyncStorage {
  private listings: ChannelListing[] = []

  findAll(): ChannelListing[] {
    return this.listings
  }

  findById(id: string): ChannelListing | undefined {
    return this.listings.find(l => l.id === id)
  }

  findByChannel(channel: string): ChannelListing[] {
    return this.listings.filter(l => l.channel === channel)
  }

  findBySku(sku: string): ChannelListing[] {
    return this.listings.filter(l => l.sku === sku)
  }

  findByChannelAndSku(channel: string, sku: string): ChannelListing | undefined {
    return this.listings.find(l => l.channel === channel && l.sku === sku)
  }

  insert(listing: ChannelListing): void {
    this.listings.push(listing)
  }

  update(id: string, listing: ChannelListing): void {
    const idx = this.listings.findIndex(l => l.id === id)
    if (idx !== -1) this.listings[idx] = listing
  }
}

describe('ChannelSyncService', () => {
  describe('syncInventoryToChannel', () => {
    it('should create a new listing', () => {
      const svc = new ChannelSyncService(new MockChannelSyncStorage())
      const result = svc.syncInventoryToChannel({ channel: 'shopify', sku: 'TSH-001', price: 29.99, quantity: 10 })

      expect(result.id).toBeDefined()
      expect(result.channel).toBe('shopify')
      expect(result.sku).toBe('TSH-001')
      expect(result.price).toBe(29.99)
      expect(result.quantity).toBe(10)
      expect(result.status).toBe('active')
    })

    it('should set status inactive when quantity is 0', () => {
      const svc = new ChannelSyncService(new MockChannelSyncStorage())
      const result = svc.syncInventoryToChannel({ channel: 'etsy', sku: 'MUG-001', price: 15, quantity: 0 })
      expect(result.status).toBe('inactive')
    })

    it('should update existing listing on re-sync', () => {
      const storage = new MockChannelSyncStorage()
      const svc = new ChannelSyncService(storage)
      svc.syncInventoryToChannel({ channel: 'shopify', sku: 'TSH-001', price: 29.99, quantity: 10 })

      const updated = svc.syncInventoryToChannel({ channel: 'shopify', sku: 'TSH-001', price: 24.99, quantity: 25 })
      expect(updated.price).toBe(24.99)
      expect(updated.quantity).toBe(25)
      expect(storage.findAll()).toHaveLength(1)
    })

    it('should reject empty channel', () => {
      const svc = new ChannelSyncService(new MockChannelSyncStorage())
      expect(() => svc.syncInventoryToChannel({ channel: '', sku: 'A', price: 10, quantity: 1 }))
        .toThrow('Channel is required')
    })

    it('should reject invalid price', () => {
      const svc = new ChannelSyncService(new MockChannelSyncStorage())
      expect(() => svc.syncInventoryToChannel({ channel: 'a', sku: 'A', price: -1, quantity: 1 }))
        .toThrow('Price must be a non-negative number')
    })

    it('should reject non-integer quantity', () => {
      const svc = new ChannelSyncService(new MockChannelSyncStorage())
      expect(() => svc.syncInventoryToChannel({ channel: 'a', sku: 'A', price: 10, quantity: 1.5 }))
        .toThrow('Quantity must be a non-negative integer')
    })
  })

  describe('getChannelListings', () => {
    it('should return all listings when no channel filter', () => {
      const storage = new MockChannelSyncStorage()
      const svc = new ChannelSyncService(storage)
      svc.syncInventoryToChannel({ channel: 'a', sku: 'S1', price: 10, quantity: 1 })
      svc.syncInventoryToChannel({ channel: 'b', sku: 'S2', price: 20, quantity: 2 })

      expect(svc.getChannelListings()).toHaveLength(2)
    })

    it('should filter by channel', () => {
      const storage = new MockChannelSyncStorage()
      const svc = new ChannelSyncService(storage)
      svc.syncInventoryToChannel({ channel: 'shopify', sku: 'S1', price: 10, quantity: 1 })
      svc.syncInventoryToChannel({ channel: 'etsy', sku: 'S2', price: 20, quantity: 2 })

      const shopify = svc.getChannelListings('shopify')
      expect(shopify).toHaveLength(1)
      expect(shopify[0].channel).toBe('shopify')
    })
  })

  describe('detectDiscrepancies', () => {
    it('should detect quantity mismatches', () => {
      const storage = new MockChannelSyncStorage()
      const svc = new ChannelSyncService(storage)
      svc.syncInventoryToChannel({ channel: 'shopify', sku: 'TSH-001', price: 20, quantity: 10 })
      svc.syncInventoryToChannel({ channel: 'etsy', sku: 'TSH-001', price: 22, quantity: 8 })

      const dis = svc.detectDiscrepancies({ 'TSH-001': 5 })
      expect(dis).toHaveLength(2)
      expect(dis[0].difference).toBe(5) // 10 - 5
      expect(dis[1].difference).toBe(3) // 8 - 5
    })

    it('should return empty when no discrepancies', () => {
      const storage = new MockChannelSyncStorage()
      const svc = new ChannelSyncService(storage)
      svc.syncInventoryToChannel({ channel: 'shopify', sku: 'A', price: 10, quantity: 5 })

      expect(svc.detectDiscrepancies({ 'A': 5 })).toHaveLength(0)
    })
  })
})
