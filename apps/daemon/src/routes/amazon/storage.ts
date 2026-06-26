/**
 * Amazon Listing Storage (SQLite) — extracted from amazon.ts
 */
import { getDb } from '../../db.js'
import type { AmazonListingStorage, AmazonListing } from '@ngocminh2k/ecommerce-core'

export function createListingStorage(): AmazonListingStorage {
  return {
    findAll(status?: string): AmazonListing[] {
      const db = getDb()
      if (status) {
        return db.prepare('SELECT * FROM amazon_listings WHERE status = ? ORDER BY created_at DESC').all(status) as AmazonListing[]
      }
      return db.prepare('SELECT * FROM amazon_listings ORDER BY created_at DESC').all() as AmazonListing[]
    },

    findById(id: string): AmazonListing | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_listings WHERE id = ?').get(id) as AmazonListing | undefined
      return row || undefined
    },

    create(listing: AmazonListing): AmazonListing {
      const db = getDb()
      db.prepare(`
        INSERT INTO amazon_listings (id, product_id, asin, sku, title, bullets, description, price, fulfillment_type, status, category, variation_theme, parent_asin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listing.id, listing.productId, listing.asin ?? null, listing.sku ?? null,
        listing.title, JSON.stringify(listing.bullets), listing.description,
        listing.price ?? null, listing.fulfillmentType, listing.status,
        listing.category ?? null, listing.variationTheme ?? null, listing.parentAsin ?? null,
        listing.createdAt, listing.updatedAt,
      )
      return listing
    },

    update(id: string, updates: Partial<AmazonListing>): AmazonListing | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM amazon_listings WHERE id = ?').get(id) as any
      if (!existing) return undefined
      const fields: string[] = []; const values: any[] = []
      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title) }
      if (updates.bullets !== undefined) { fields.push('bullets = ?'); values.push(JSON.stringify(updates.bullets)) }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
      if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price) }
      if (updates.fulfillmentType !== undefined) { fields.push('fulfillment_type = ?'); values.push(updates.fulfillmentType) }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.sku !== undefined) { fields.push('sku = ?'); values.push(updates.sku) }
      if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category) }
      if (updates.variationTheme !== undefined) { fields.push('variation_theme = ?'); values.push(updates.variationTheme) }
      if (updates.parentAsin !== undefined) { fields.push('parent_asin = ?'); values.push(updates.parentAsin) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }
      if (fields.length === 0) return existing
      values.push(id)
      db.prepare(`UPDATE amazon_listings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      const updated = db.prepare('SELECT * FROM amazon_listings WHERE id = ?').get(id) as any
      return updated || undefined
    },

    delete(id: string): boolean {
      const db = getDb()
      const result = db.prepare('DELETE FROM amazon_listings WHERE id = ?').run(id)
      return result.changes > 0
    },
  }
}
