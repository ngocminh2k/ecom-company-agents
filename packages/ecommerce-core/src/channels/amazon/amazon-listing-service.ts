/**
 * Amazon Listing Service — CRUD and lifecycle management for Amazon listings.
 *
 * Pure business logic. No agent calls.
 * State machine: draft -> active -> blocked -> removed
 * Uses AmazonListingStorage interface for persistence (SQLite in production).
 */
import { validateAmazonListing, validateAmazonTitle, validateAmazonBullets } from './amazon-entity.js'
import type { AmazonListing, AmazonListingCreateInput, AmazonListingUpdateInput } from './amazon-entity.js'

const LISTING_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'removed'],
  active: ['blocked', 'removed'],
  blocked: ['active', 'removed'],
  removed: [],
}

/**
 * Storage interface for Amazon listings.
 * Routes implement this with SQLite (better-sqlite3).
 */
export interface AmazonListingStorage {
  findAll(status?: string): AmazonListing[]
  findById(id: string): AmazonListing | undefined
  create(listing: AmazonListing): AmazonListing
  update(id: string, listing: Partial<AmazonListing>): AmazonListing | undefined
  delete(id: string): boolean
}

export class AmazonListingService {
  constructor(private storage: AmazonListingStorage) {}

  /**
   * Create a new Amazon listing with full validation.
   */
  createListing(input: AmazonListingCreateInput): { listing?: AmazonListing; errors: string[] } {
    const errors = validateAmazonListing(input)
    if (errors.length > 0) {
      return { errors }
    }

    const now = new Date().toISOString()
    const listing: AmazonListing = {
      id: `amz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: input.productId,
      title: input.title,
      bullets: input.bullets,
      description: input.description,
      price: input.price,
      fulfillmentType: input.fulfillmentType ?? 'fbm',
      status: 'draft',
      sku: input.sku,
      category: input.category,
      variationTheme: input.variationTheme,
      parentAsin: input.parentAsin,
      createdAt: now,
      updatedAt: now,
    }

    const saved = this.storage.create(listing)
    return { listing: saved, errors: [] }
  }

  /**
   * Get a listing by ID.
   */
  getListing(id: string): AmazonListing | undefined {
    return this.storage.findById(id)
  }

  /**
   * Get all listings with optional status filter.
   */
  getListings(status?: string): AmazonListing[] {
    return this.storage.findAll(status)
  }

  /**
   * Update a listing with validation.
   */
  updateListing(id: string, input: AmazonListingUpdateInput): { listing?: AmazonListing; errors: string[] } {
    const existing = this.storage.findById(id)
    if (!existing) {
      return { errors: ['Listing not found'] }
    }

    // Validate individual fields if provided
    if (input.title !== undefined) {
      const titleErrors = validateAmazonTitle(input.title)
      if (titleErrors.length > 0) {
        return { errors: titleErrors.map((e) => `Title: ${e}`) }
      }
    }

    if (input.bullets !== undefined) {
      const bulletErrors = validateAmazonBullets(input.bullets)
      if (bulletErrors.length > 0) {
        return { errors: bulletErrors.map((e) => `Bullets: ${e}`) }
      }
    }

    const update: Partial<AmazonListing> = {
      updatedAt: new Date().toISOString(),
    }
    if (input.title !== undefined) update.title = input.title
    if (input.bullets !== undefined) update.bullets = input.bullets
    if (input.description !== undefined) update.description = input.description
    if (input.price !== undefined) update.price = input.price
    if (input.fulfillmentType !== undefined) update.fulfillmentType = input.fulfillmentType
    if (input.sku !== undefined) update.sku = input.sku
    if (input.category !== undefined) update.category = input.category
    if (input.variationTheme !== undefined) update.variationTheme = input.variationTheme
    if (input.parentAsin !== undefined) update.parentAsin = input.parentAsin

    const updated = this.storage.update(id, update)
    if (!updated) {
      return { errors: ['Listing not found on update'] }
    }

    return { listing: updated, errors: [] }
  }

  /**
   * Delete a listing.
   */
  deleteListing(id: string): boolean {
    return this.storage.delete(id)
  }

  /**
   * Publish a listing to Amazon (validate and change status to active).
   */
  publishToAmazon(id: string): { listing?: AmazonListing; errors: string[] } {
    const existing = this.storage.findById(id)
    if (!existing) {
      return { errors: ['Listing not found'] }
    }

    // Validate transition
    const validTransitions = LISTING_TRANSITIONS[existing.status]
    if (!validTransitions || !validTransitions.includes('active')) {
      return { errors: [`Cannot publish listing in "${existing.status}" status`] }
    }

    // Re-validate full listing before publishing
    const validationErrors = validateAmazonListing({
      productId: existing.productId,
      title: existing.title,
      bullets: existing.bullets,
      description: existing.description,
      price: existing.price,
      fulfillmentType: existing.fulfillmentType,
      sku: existing.sku,
      category: existing.category,
      variationTheme: existing.variationTheme,
      parentAsin: existing.parentAsin,
    })

    if (validationErrors.length > 0) {
      return { errors: validationErrors }
    }

    const updated = this.storage.update(id, {
      status: 'active',
      updatedAt: new Date().toISOString(),
    })

    if (!updated) {
      return { errors: ['Listing not found on update'] }
    }

    return { listing: updated, errors: [] }
  }
}
