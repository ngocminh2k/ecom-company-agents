import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { randomUUID } from 'node:crypto'
import { EtsyListingService, type EtsyListingStorage, type EtsyListing, ValidationError } from '@ngocminh2k/ecommerce-core'
import {
  validateEtsyListing,
} from '@ngocminh2k/ecommerce-core'

export const etsyRouter: RouterType = Router()

// --- Storage adapter: maps EtsyListingStorage interface to SQLite ---

function createStorage(): EtsyListingStorage {
  return {
    findAll(): EtsyListing[] {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM etsy_listings ORDER BY created_at DESC').all() as any[]
      return rows.map(rowToListing)
    },

    findById(id: string): EtsyListing | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM etsy_listings WHERE id = ?').get(id) as any
      return row ? rowToListing(row) : undefined
    },

    create(listing: EtsyListing): EtsyListing {
      const db = getDb()
      db.prepare(`
        INSERT INTO etsy_listings (id, product_id, title, description, tags, price, quantity, processing_time_days, status, views, favorites, orders, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listing.id, listing.productId, listing.title, listing.description,
        JSON.stringify(listing.tags), listing.price, listing.quantity,
        listing.processingTimeDays, listing.status, listing.views,
        listing.favorites, listing.orders, listing.createdAt, listing.updatedAt,
      )
      return listing
    },

    update(id: string, update: Partial<EtsyListing>): EtsyListing | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM etsy_listings WHERE id = ?').get(id) as any
      if (!existing) return undefined

      const fields: string[] = []
      const values: any[] = []

      if (update.title !== undefined) { fields.push('title = ?'); values.push(update.title) }
      if (update.description !== undefined) { fields.push('description = ?'); values.push(update.description) }
      if (update.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(update.tags)) }
      if (update.price !== undefined) { fields.push('price = ?'); values.push(update.price) }
      if (update.quantity !== undefined) { fields.push('quantity = ?'); values.push(update.quantity) }
      if (update.processingTimeDays !== undefined) { fields.push('processing_time_days = ?'); values.push(update.processingTimeDays) }
      if (update.status !== undefined) { fields.push('status = ?'); values.push(update.status) }
      if (update.views !== undefined) { fields.push('views = ?'); values.push(update.views) }
      if (update.favorites !== undefined) { fields.push('favorites = ?'); values.push(update.favorites) }
      if (update.orders !== undefined) { fields.push('orders = ?'); values.push(update.orders) }
      if (update.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(update.updatedAt) }

      if (fields.length === 0) return rowToListing(existing)

      fields.push('updated_at = datetime(\'now\')')
      values.push(id)

      db.prepare(`UPDATE etsy_listings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      const updated = db.prepare('SELECT * FROM etsy_listings WHERE id = ?').get(id) as any
      return updated ? rowToListing(updated) : undefined
    },

    delete(id: string): boolean {
      const db = getDb()
      const result = db.prepare('DELETE FROM etsy_listings WHERE id = ?').run(id)
      return result.changes > 0
    },
  }
}

function rowToListing(row: any): EtsyListing {
  return {
    id: row.id,
    productId: row.product_id,
    title: row.title,
    description: row.description || '',
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    price: row.price,
    quantity: row.quantity,
    processingTimeDays: row.processing_time_days,
    status: row.status,
    etsyListingId: row.etsy_listing_id || undefined,
    url: row.url || undefined,
    views: row.views,
    favorites: row.favorites,
    orders: row.orders,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const storage = createStorage()
const service = new EtsyListingService(storage)

// --- Routes ---

// GET /api/etsy/listings — list all
etsyRouter.get('/', (_req, res) => {
  try {
    const listings = storage.findAll()
    res.json({ listings })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// POST /api/etsy/listings — create with validation
etsyRouter.post('/', (req: any, res) => {
  try {
    const result = service.createListing(req.body)
    if (!result.success) {
      return res.status(400).json({ error: true, errors: result.errors })
    }
    res.status(201).json({ listing: result.listing })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// GET /api/etsy/listings/:id — get by id
etsyRouter.get('/:id', (req: any, res) => {
  try {
    const listing = service.getListing(req.params.id)
    if (!listing) {
      return res.status(404).json({ error: true, message: 'Listing not found' })
    }
    res.json({ listing })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// PATCH /api/etsy/listings/:id — partial update
etsyRouter.patch('/:id', (req: any, res) => {
  try {
    const listing = service.updateListing(req.params.id, req.body)
    if (!listing) {
      return res.status(404).json({ error: true, message: 'Listing not found' })
    }
    res.json({ listing })
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: true, message: err.message })
    }
    res.status(500).json({ error: true, message: err.message })
  }
})

// POST /api/etsy/listings/:id/publish — publish with checklist
etsyRouter.post('/:id/publish', (req: any, res) => {
  try {
    const result = service.publishListing(req.params.id, req.body)
    if (!result.success) {
      return res.status(400).json({
        error: true,
        message: 'Publish failed pre-publish checks',
        checklistResults: result.checklistResults,
        errors: result.errors,
      })
    }
    res.json({ listing: result.listing, checklistResults: result.checklistResults })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// GET /api/etsy/listings/:id/optimization — get optimization suggestions
etsyRouter.get('/:id/optimization', (req: any, res) => {
  try {
    const listing = service.getListing(req.params.id)
    if (!listing) {
      return res.status(404).json({ error: true, message: 'Listing not found' })
    }
    const suggestions = service.getOptimizationSuggestions(listing)
    res.json({ suggestions })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})
