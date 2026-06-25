/**
 * Etsy Listing Entity — real Etsy validation rules (ADR-018)
 *
 * Chứa validation rules theo SOP Etsy, margin calculation, và lifecycle state.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */

export interface EtsyListing {
  id: string
  productId: string
  title: string
  description: string
  tags: string[]
  price: number
  quantity: number
  processingTimeDays: number
  status: 'draft' | 'pending_review' | 'published' | 'optimizing' | 'paused' | 'removed'
  etsyListingId?: string
  url?: string
  views: number
  favorites: number
  orders: number
  createdAt: string
  updatedAt: string
}

export interface EtsyListingCreateInput {
  productId: string
  title: string
  description: string
  tags?: string[]
  price: number
  quantity?: number
  processingTimeDays?: number
  cost: number
  shippingCost: number
}

export interface EtsyListingUpdateInput {
  title?: string
  description?: string
  tags?: string[]
  price?: number
  quantity?: number
  processingTimeDays?: number
  status?: 'draft' | 'pending_review' | 'published' | 'optimizing' | 'paused' | 'removed'
}

export interface ValidationResult {
  field: string
  message: string
}

// ─── State Machine ───────────────────────────────

/** Etsy listing state machine transitions */
export const ETSY_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_review', 'removed'],
  pending_review: ['published', 'draft', 'removed'],
  published: ['optimizing', 'paused', 'removed'],
  optimizing: ['published', 'paused', 'removed'],
  paused: ['published', 'removed'],
  removed: [],
}

/**
 * Check if a status transition is valid.
 */
export function isValidEtsyStatusTransition(from: string, to: string): boolean {
  const allowed = ETSY_STATUS_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

/** Etsy platform fee percentage (6.5% transaction fee + 0.5% regulatory fee in some categories) */
export const ETSY_FEE_PERCENT = 0.065

/**
 * Validate Etsy listing title per ADR-018 and Etsy SOP.
 *
 * Rules:
 * - 20-140 characters
 * - Words should be capitalized (not all-caps)
 * - No keyword stuffing (same word repeated >2x)
 * - No ALL CAPS words (abbreviations like USA, DIY allowed if <=4 chars)
 */
export function validateEtsyTitle(title: string): ValidationResult[] {
  const errors: ValidationResult[] = []
  const trimmed = title.trim()

  if (trimmed.length === 0) {
    errors.push({ field: 'title', message: 'Title is required' })
    return errors
  }

  if (trimmed.length < 20) {
    errors.push({ field: 'title', message: `Title must be at least 20 characters (got ${trimmed.length})` })
  }

  if (trimmed.length > 140) {
    errors.push({ field: 'title', message: `Title must be at most 140 characters (got ${trimmed.length})` })
  }

  // Check for ALL CAPS words (exclude short abbreviations <=4 chars)
  const words = trimmed.split(/\s+/)
  const allCapsWords = words.filter((w) => w.length > 4 && w === w.toUpperCase() && /[A-Z]{2,}/.test(w))
  if (allCapsWords.length > 0) {
    errors.push({
      field: 'title',
      message: `Title contains ALL CAPS words: "${allCapsWords.join(', ')}". Use normal capitalization.`,
    })
  }

  // Check for keyword stuffing: same word appearing more than twice
  const wordCounts = new Map<string, number>()
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (lower.length > 2) {
      wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1)
    }
  }
  const stuffed = Array.from(wordCounts.entries()).filter(([, count]) => count > 2)
  if (stuffed.length > 0) {
    errors.push({
      field: 'title',
      message: `Keyword stuffing detected: "${stuffed.map(([w, c]) => `${w} (${c}x)`).join(', ')}". Avoid repeating keywords.`,
    })
  }

  return errors
}

/**
 * Validate Etsy tags per ADR-018 and Etsy SOP.
 *
 * Rules:
 * - Max 13 tags
 * - No duplicate tags
 * - Each tag max 20 characters
 * - Must include category-relevant tags
 */
export function validateEtsyTags(tags: string[]): ValidationResult[] {
  const errors: ValidationResult[] = []

  if (!tags || tags.length === 0) {
    errors.push({ field: 'tags', message: 'At least 1 tag is required' })
    return errors
  }

  if (tags.length > 13) {
    errors.push({ field: 'tags', message: `Maximum 13 tags allowed (got ${tags.length})` })
  }

  // Check for duplicates (case-insensitive)
  const seen = new Set<string>()
  for (const tag of tags) {
    const trimmed = tag.trim().toLowerCase()
    if (seen.has(trimmed)) {
      errors.push({ field: 'tags', message: `Duplicate tag: "${tag}"` })
    }
    seen.add(trimmed)
  }

  // Check tag length
  for (const tag of tags) {
    if (tag.length > 20) {
      errors.push({ field: 'tags', message: `Tag "${tag}" exceeds 20 characters (got ${tag.length})` })
    }
  }

  return errors
}

/**
 * Validate Etsy listing price per ADR-018.
 *
 * Rules:
 * - Price must be >= $0.50
 * - Must have positive margin after Etsy fees (6.5%)
 */
export function validateEtsyPrice(price: number, cost: number, shippingCost: number): ValidationResult[] {
  const errors: ValidationResult[] = []

  if (price < 0.5) {
    errors.push({ field: 'price', message: `Price must be at least $0.50 (got $${price.toFixed(2)})` })
  }

  const feeAmount = price * ETSY_FEE_PERCENT
  const netRevenue = price - feeAmount
  const totalCost = cost + shippingCost
  const margin = netRevenue - totalCost

  if (margin <= 0) {
    errors.push({
      field: 'price',
      message: `No positive margin after Etsy fees (6.5% = $${feeAmount.toFixed(2)}). `
        + `Net revenue: $${netRevenue.toFixed(2)}, Total cost: $${totalCost.toFixed(2)}, Margin: $${margin.toFixed(2)}. `
        + `Price must be higher or costs lower.`,
    })
  }

  return errors
}

/**
 * Validate Etsy listing description per SOP.
 *
 * Rules:
 * - Must contain material information
 * - Must contain size information
 * - Must contain personalization info (if applicable)
 * - Must contain shipping policy
 * - Must contain return/refund policy
 */
export function validateEtsyDescription(description: string): ValidationResult[] {
  const errors: ValidationResult[] = []

  if (!description || description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' })
    return errors
  }

  const desc = description.toLowerCase()

  if (!desc.includes('material') && !desc.includes('fabric') && !desc.includes('cotton') && !desc.includes('polyester')) {
    errors.push({ field: 'description', message: 'Description must include material or fabric information' })
  }

  if (!desc.includes('size') && !desc.includes('dimension') && !desc.includes('measurement') && !desc.includes('inch') && !desc.includes('cm')) {
    errors.push({ field: 'description', message: 'Description must include size or dimension information' })
  }

  if (!desc.includes('personalization') && !desc.includes('personalize') && !desc.includes('custom')) {
    errors.push({ field: 'description', message: 'Description must include personalization information (even if not customizable, state it explicitly)' })
  }

  if (!desc.includes('shipping') && !desc.includes('delivery') && !desc.includes('dispatch') && !desc.includes('processing time')) {
    errors.push({ field: 'description', message: 'Description must include shipping or delivery policy' })
  }

  if (!desc.includes('return') && !desc.includes('refund') && !desc.includes('exchange') && !desc.includes('guarantee') && !desc.includes('satisfaction')) {
    errors.push({ field: 'description', message: 'Description must include return/refund or guarantee policy' })
  }

  return errors
}

/**
 * Aggregate all Etsy listing validations.
 */
export function validateEtsyListing(listing: EtsyListingCreateInput): ValidationResult[] {
  const allErrors: ValidationResult[] = [
    ...validateEtsyTitle(listing.title),
    ...validateEtsyTags(listing.tags || []),
    ...validateEtsyPrice(listing.price, listing.cost, listing.shippingCost),
    ...validateEtsyDescription(listing.description),
  ]

  // Validate processing time
  if (listing.processingTimeDays !== undefined) {
    if (listing.processingTimeDays < 1) {
      allErrors.push({ field: 'processingTimeDays', message: 'Processing time must be at least 1 day' })
    } else if (listing.processingTimeDays > 30) {
      allErrors.push({ field: 'processingTimeDays', message: 'Processing time cannot exceed 30 days' })
    }
  }

  // Validate quantity
  if (listing.quantity !== undefined && listing.quantity < 1) {
    allErrors.push({ field: 'quantity', message: 'Quantity must be at least 1' })
  }

  return allErrors
}
