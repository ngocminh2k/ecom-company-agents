/**
 * Etsy Listing Service — real business logic for Etsy listing management.
 *
 * Chứa CRUD, validation, margin calculation, và optimization suggestions.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */

import { randomUUID } from 'node:crypto'
import {
  type EtsyListing,
  type EtsyListingCreateInput,
  type EtsyListingUpdateInput,
  type ValidationResult,
  ETSY_FEE_PERCENT,
  ETSY_STATUS_TRANSITIONS,
  isValidEtsyStatusTransition,
  validateEtsyListing,
  validateEtsyTitle,
  validateEtsyTags,
  validateEtsyPrice,
  validateEtsyDescription,
} from './etsy-entity.js'
import { type ChecklistListing, type ChecklistResult, getPrePublishChecklist, canPublish } from './etsy-checklist.js'

/**
 * Storage interface để service không phụ thuộc trực tiếp vào SQLite.
 * Routes sẽ implement interface này với better-sqlite3.
 */
export interface EtsyListingStorage {
  findAll(): EtsyListing[]
  findById(id: string): EtsyListing | undefined
  create(listing: EtsyListing): EtsyListing
  update(id: string, listing: Partial<EtsyListing>): EtsyListing | undefined
  delete(id: string): boolean
}

/**
 * Result type cho createListing
 */
export interface CreateListingResult {
  success: boolean
  listing?: EtsyListing
  errors?: ValidationResult[]
}

/**
 * Result type cho publishListing
 */
export interface PublishListingResult {
  success: boolean
  listing?: EtsyListing
  checklistResults?: ChecklistResult[]
  errors?: string[]
}

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  type: 'title' | 'tags' | 'images' | 'description' | 'pricing'
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
}

export class EtsyListingService {
  constructor(private storage: EtsyListingStorage) {}

  /**
   * Create Etsy listing with full validation.
   * Tính toán margin, persist to DB.
   */
  createListing(input: EtsyListingCreateInput): CreateListingResult {
    // Validate all fields
    const errors = validateEtsyListing(input)
    if (errors.length > 0) {
      return { success: false, errors }
    }

    const now = new Date().toISOString()
    const listing: EtsyListing = {
      id: randomUUID(),
      productId: input.productId,
      title: input.title.trim(),
      description: input.description.trim(),
      tags: input.tags || [],
      price: input.price,
      quantity: input.quantity ?? 1,
      processingTimeDays: input.processingTimeDays ?? 3,
      status: 'draft',
      views: 0,
      favorites: 0,
      orders: 0,
      createdAt: now,
      updatedAt: now,
    }

    const saved = this.storage.create(listing)
    return { success: true, listing: saved }
  }

  /**
   * Get listing by id from storage.
   */
  getListing(id: string): EtsyListing | undefined {
    return this.storage.findById(id)
  }

  /**
   * Partial update with re-validation of changed fields.
   */
  updateListing(id: string, input: EtsyListingUpdateInput): EtsyListing | undefined {
    const existing = this.storage.findById(id)
    if (!existing) return undefined

    const errors: ValidationResult[] = []

    // Validate status transition
    if (input.status !== undefined && input.status !== existing.status) {
      if (!isValidEtsyStatusTransition(existing.status, input.status)) {
        throw new ValidationError(
          `Invalid status transition: "${existing.status}" -> "${input.status}". Allowed transitions: ${(ETSY_STATUS_TRANSITIONS[existing.status] ?? []).join(', ')}`
        )
      }
    }

    // Validate changed fields
    if (input.title !== undefined) {
      errors.push(...validateEtsyTitle(input.title))
    }
    if (input.tags !== undefined) {
      errors.push(...validateEtsyTags(input.tags))
    }
    if (input.price !== undefined && existing.price !== input.price) {
      errors.push(...validateEtsyPrice(input.price, 0, 0))
    }
    if (input.description !== undefined) {
      errors.push(...validateEtsyDescription(input.description))
    }

    if (errors.length > 0) {
      // Validation failed — return undefined but caller can check errors from validators
      throw new ValidationError(`Validation failed: ${errors.map((e) => e.message).join('; ')}`)
    }

    const update: Partial<EtsyListing> = {}
    if (input.title !== undefined) update.title = input.title.trim()
    if (input.description !== undefined) update.description = input.description.trim()
    if (input.tags !== undefined) update.tags = input.tags
    if (input.price !== undefined) update.price = input.price
    if (input.quantity !== undefined) update.quantity = input.quantity
    if (input.processingTimeDays !== undefined) update.processingTimeDays = input.processingTimeDays
    if (input.status !== undefined) update.status = input.status
    update.updatedAt = new Date().toISOString()

    return this.storage.update(id, update)
  }

  /**
   * Soft delete (status = 'removed').
   */
  deleteListing(id: string): boolean {
    const existing = this.storage.findById(id)
    if (!existing) return false

    this.storage.update(id, {
      status: 'removed',
      updatedAt: new Date().toISOString(),
    })
    return true
  }

  /**
   * Publish listing: run pre-publish checklist, validate all checks pass, update status.
   *
   * Returns checklist results even on failure so the caller can show what's missing.
   */
  publishListing(id: string, listingMeta: Partial<ChecklistListing>): PublishListingResult {
    const existing = this.storage.findById(id)
    if (!existing) {
      return { success: false, errors: [`Listing ${id} not found`] }
    }

    // Build checklist input
    const checklistInput: ChecklistListing = {
      title: existing.title,
      description: existing.description,
      tags: existing.tags,
      price: existing.price,
      processingTimeDays: existing.processingTimeDays,
      hasMainImage: listingMeta.hasMainImage ?? false,
      hasPersonalizationImage: listingMeta.hasPersonalizationImage ?? false,
      hasSizeImage: listingMeta.hasSizeImage ?? false,
      hasMaterialImage: listingMeta.hasMaterialImage ?? false,
      hasOrderingGuideImage: listingMeta.hasOrderingGuideImage ?? false,
      hasProductionPartner: listingMeta.hasProductionPartner ?? false,
      hasRefundPolicy: listingMeta.hasRefundPolicy ?? false,
    }

    const checklistResults = getPrePublishChecklist(checklistInput)

    if (!canPublish(checklistResults)) {
      const failed = checklistResults.filter((r) => !r.pass)
      return {
        success: false,
        checklistResults,
        errors: failed.map((r) => r.message),
      }
    }

    const updated = this.storage.update(id, {
      status: 'published',
      updatedAt: new Date().toISOString(),
    })

    return {
      success: true,
      listing: updated,
      checklistResults,
    }
  }

  /**
   * Generate optimization suggestions based on listing performance data.
   *
   * Phân tích views/favorites/orders ratio để đưa ra suggestions:
   * - Nhiều views nhưng ít favorites → title/thumbnail issue
   * - Nhiều favorites nhưng ít orders → price/description issue
   * - Ít views → SEO/tags issue
   */
  getOptimizationSuggestions(listing: EtsyListing): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // Analyze engagement ratio
    if (listing.views > 0) {
      const favoriteRate = listing.favorites / listing.views
      const orderRate = listing.orders / listing.views

      // High views, low favorites → title/thumbnail issue
      if (listing.views > 100 && favoriteRate < 0.05) {
        suggestions.push({
          type: 'title',
          severity: 'high',
          message: `Low favorite rate (${(favoriteRate * 100).toFixed(1)}%). Consider testing a different main image or optimizing the title for better click-through.`,
        })
      }

      // High favorites, low orders → price/description issue
      if (listing.favorites > 20 && orderRate < 0.02) {
        suggestions.push({
          type: 'description',
          severity: 'high',
          message: `Low conversion rate (${(orderRate * 100).toFixed(1)}%) despite ${listing.favorites} favorites. Review pricing, description clarity, and shipping costs.`,
        })
      }

      // Very low views → SEO issue
      if (listing.views < 50 && listing.status === 'published') {
        suggestions.push({
          type: 'tags',
          severity: 'high',
          message: 'Very low views. Review tags and title SEO — current tags may not match buyer search intent.',
        })
      }
    }

    // Suggest tag optimization if not using all 13 tags
    if (listing.tags.length < 10) {
      suggestions.push({
        type: 'tags',
        severity: 'medium',
        message: `Only ${listing.tags.length}/13 tags used. Adding more relevant tags can improve search visibility.`,
      })
    }

    // Check description length
    if (listing.description.length < 500) {
      suggestions.push({
        type: 'description',
        severity: 'medium',
        message: `Description is only ${listing.description.length} characters. Etsy rewards detailed descriptions (1000+ chars recommended).`,
      })
    }

    return suggestions
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
