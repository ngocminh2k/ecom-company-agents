/**
 * Channel Sync Service — multi-channel inventory synchronization.
 *
 * SOP Section 11: Multi-channel inventory management.
 * Pure TypeScript, no agent, no mock.
 */

import { randomUUID } from 'node:crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChannelListingStatus = 'active' | 'inactive' | 'discontinued'

export interface ChannelListing {
  id: string
  channel: string
  sku: string
  price: number
  quantity: number
  status: ChannelListingStatus
  lastSyncedAt: string
  createdAt: string
  updatedAt: string
}

export interface SyncInventoryInput {
  channel: string
  sku: string
  price: number
  quantity: number
}

export interface Discrepancy {
  listingId: string
  channel: string
  sku: string
  expectedQuantity: number
  actualQuantity: number
  difference: number
}

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface ChannelSyncStorage {
  findAll(): ChannelListing[]
  findById(id: string): ChannelListing | undefined
  findByChannel(channel: string): ChannelListing[]
  findBySku(sku: string): ChannelListing[]
  findByChannelAndSku(channel: string, sku: string): ChannelListing | undefined
  insert(listing: ChannelListing): void
  update(id: string, listing: ChannelListing): void
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ChannelSyncService {
  constructor(private storage: ChannelSyncStorage) {}

  syncInventoryToChannel(input: SyncInventoryInput): ChannelListing {
    if (!input.channel || !input.channel.trim()) throw new Error('Channel is required')
    if (!input.sku || !input.sku.trim()) throw new Error('SKU is required')
    if (!Number.isFinite(input.price) || input.price < 0) throw new Error('Price must be a non-negative number')
    if (!Number.isInteger(input.quantity) || input.quantity < 0) throw new Error('Quantity must be a non-negative integer')

    const now = new Date().toISOString()
    const existing = this.storage.findByChannelAndSku(input.channel, input.sku)

    if (existing) {
      const updated: ChannelListing = {
        ...existing,
        price: Math.round(input.price * 100) / 100,
        quantity: input.quantity,
        status: input.quantity > 0 ? 'active' : 'inactive',
        lastSyncedAt: now,
        updatedAt: now,
      }
      this.storage.update(existing.id, updated)
      return updated
    }

    const listing: ChannelListing = {
      id: randomUUID(),
      channel: input.channel.trim(),
      sku: input.sku.trim(),
      price: Math.round(input.price * 100) / 100,
      quantity: input.quantity,
      status: input.quantity > 0 ? 'active' : 'inactive',
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    }

    this.storage.insert(listing)
    return listing
  }

  getChannelListings(channel?: string): ChannelListing[] {
    if (channel) {
      return this.storage.findByChannel(channel)
    }
    return this.storage.findAll()
  }

  detectDiscrepancies(expectedInventory: Record<string, number>): Discrepancy[] {
    const discrepancies: Discrepancy[] = []

    for (const [sku, expectedQty] of Object.entries(expectedInventory)) {
      const listings = this.storage.findBySku(sku)
      for (const listing of listings) {
        const diff = listing.quantity - expectedQty
        if (diff !== 0) {
          discrepancies.push({
            listingId: listing.id,
            channel: listing.channel,
            sku: listing.sku,
            expectedQuantity: expectedQty,
            actualQuantity: listing.quantity,
            difference: diff,
          })
        }
      }
    }

    return discrepancies
  }
}
