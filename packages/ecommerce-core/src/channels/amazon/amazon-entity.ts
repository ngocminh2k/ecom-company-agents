/**
 * Amazon Entity — real business logic for Amazon listing management
 *
 * ADR-020: Amazon Listing Validation Rules
 * - Chi dua len Amazon khi da ban tot tren Etsy/Shopify
 * - Margin sau Amazon fees (referral 15% + fulfillment) >= 20%
 * - Bullet points: benefit-driven, moi bullet mot loi ich chinh
 * - Account health check: ODR < 1%, cancellation < 2.5%, late shipment < 4%
 *
 * KHONG dung agent. KHONG mock. Code thuan.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface AmazonListing {
  id: string
  productId: string
  asin?: string
  sku?: string
  title: string
  bullets: string[]
  description: string
  price?: number
  fulfillmentType: 'fbm' | 'fba'
  status: 'draft' | 'active' | 'blocked' | 'removed'
  accountHealth?: string
  odr?: number
  category?: string
  variationTheme?: string
  parentAsin?: string
  createdAt: string
  updatedAt: string
}

export interface AmazonListingCreateInput {
  productId: string
  title: string
  bullets: string[]
  description: string
  price?: number
  fulfillmentType?: 'fbm' | 'fba'
  sku?: string
  category?: string
  variationTheme?: string
  parentAsin?: string
}

export interface AmazonListingUpdateInput {
  title?: string
  bullets?: string[]
  description?: string
  price?: number
  fulfillmentType?: 'fbm' | 'fba'
  sku?: string
  category?: string
  variationTheme?: string
  parentAsin?: string
}

export interface ProductEligibilityInput {
  price: number
  cost: number
  shippingCost: number
  hasSoldOnEtsyOrShopify: boolean
  monthlySalesOnOtherPlatforms: number
  existingReviews: number
  averageRating: number
  odr?: number
  category?: string
}

export interface ProductEligibilityResult {
  pass: boolean
  criteriaResults: Array<{
    criterion: string
    passed: boolean
    detail: string
  }>
  score: number
  recommendation: string
}

// ─── Validation Constants ─────────────────────────────────────────────

export const AMAZON_TITLE_MAX_LENGTH = 200
export const AMAZON_BULLETS_MAX = 5
export const AMAZON_REFERRAL_PERCENT = 0.15
export const AMAZON_FULFILLMENT_FEE_FBM = 4.50
export const AMAZON_FULFILLMENT_FEE_FBA = 6.00
export const MIN_MARGIN_AFTER_FEES = 0.20
export const MIN_REVIEWS = 10
export const MIN_RATING = 3.5
export const MIN_MONTHLY_SALES = 10
export const ODR_THRESHOLD = 0.01 // 1%
export const CANCELLATION_RATE_THRESHOLD = 0.025 // 2.5%
export const LATE_SHIPMENT_RATE_THRESHOLD = 0.04 // 4%
export const VALID_TRACKING_RATE_THRESHOLD = 0.95 // 95%

// ─── Validation Functions ─────────────────────────────────────────────

/**
 * Validate product eligibility for Amazon (6 criteria per ADR-020).
 */
export function validateAmazonSelection(product: ProductEligibilityInput): ProductEligibilityResult {
  const criteriaResults: ProductEligibilityResult['criteriaResults'] = []
  let passedCount = 0

  // Default cost and shippingCost to 0 to prevent NaN when values are undefined at runtime
  const cost = product.cost ?? 0
  const shippingCost = product.shippingCost ?? 0

  // Criterion 1: Proven on Etsy/Shopify
  const c1Passed = product.hasSoldOnEtsyOrShopify && product.monthlySalesOnOtherPlatforms >= MIN_MONTHLY_SALES
  criteriaResults.push({
    criterion: 'Proven on other channels',
    passed: c1Passed,
    detail: c1Passed
      ? `Product has ${product.monthlySalesOnOtherPlatforms}+ monthly sales on Etsy/Shopify`
      : `Product needs at least ${MIN_MONTHLY_SALES} monthly sales on Etsy or Shopify before Amazon`,
  })
  if (c1Passed) passedCount++

  // Criterion 2: Margin after fees >= 20%
  const totalFees = product.price * AMAZON_REFERRAL_PERCENT + AMAZON_FULFILLMENT_FEE_FBM
  const netAfterFees = product.price - cost - shippingCost - totalFees
  const marginAfterFees = product.price > 0 ? netAfterFees / product.price : 0
  const c2Passed = marginAfterFees >= MIN_MARGIN_AFTER_FEES
  criteriaResults.push({
    criterion: 'Margin after Amazon fees',
    passed: c2Passed,
    detail: c2Passed
      ? `Margin after 15% referral + fulfillment: ${(marginAfterFees * 100).toFixed(1)}% (threshold: ${MIN_MARGIN_AFTER_FEES * 100}%)`
      : `Margin after fees is ${(marginAfterFees * 100).toFixed(1)}%, below ${MIN_MARGIN_AFTER_FEES * 100}% threshold`,
  })
  if (c2Passed) passedCount++

  // Criterion 3: IP / category risk
  const safeCategories = ['home', 'kitchen', 'sports', 'toys', 'beauty', 'electronics', 'clothing', 'accessories', 'office', 'garden']
  const restrictedCategories = ['health_medical', 'alcohol', 'food', 'fine_art', 'collectibles']
  const c3Passed = !product.category || !restrictedCategories.includes(product.category)
  criteriaResults.push({
    criterion: 'IP and category risk',
    passed: c3Passed,
    detail: c3Passed
      ? `Category "${product.category ?? 'general'}" is eligible for Amazon`
      : `Category "${product.category}" is restricted or high-risk on Amazon`,
  })
  if (c3Passed) passedCount++

  // Criterion 4: Variation standardizability
  const c4Passed = product.category ? safeCategories.includes(product.category) : true
  criteriaResults.push({
    criterion: 'Variation standardizability',
    passed: c4Passed,
    detail: c4Passed
      ? 'Product category supports standard Amazon variations (size, color, style)'
      : 'Product category may not support standard Amazon variation themes',
  })
  if (c4Passed) passedCount++

  // Criterion 5: Review check
  const c5Passed = product.averageRating >= MIN_RATING && product.existingReviews >= MIN_REVIEWS
  criteriaResults.push({
    criterion: 'Review quality',
    passed: c5Passed,
    detail: c5Passed
      ? `Product has ${product.existingReviews} reviews at ${product.averageRating} stars`
      : `Product needs at least ${MIN_REVIEWS} reviews with ${MIN_RATING}+ stars`,
  })
  if (c5Passed) passedCount++

  // Criterion 6: Defect rate
  const c6Passed = product.odr === undefined || product.odr < ODR_THRESHOLD
  criteriaResults.push({
    criterion: 'Order defect rate',
    passed: c6Passed,
    detail: c6Passed
      ? `ODR is ${((product.odr ?? 0) * 100).toFixed(2)}% (threshold: ${ODR_THRESHOLD * 100}%)`
      : `ODR is ${((product.odr ?? 0) * 100).toFixed(2)}%, exceeds ${ODR_THRESHOLD * 100}% threshold`,
  })
  if (c6Passed) passedCount++

  const totalCriteria = criteriaResults.length
  const score = Math.round((passedCount / totalCriteria) * 100)

  let recommendation: string
  if (passedCount === totalCriteria) {
    recommendation = 'Product is fully eligible for Amazon listing'
  } else if (passedCount >= totalCriteria - 2) {
    recommendation = 'Product has strong potential. Address minor issues before listing'
  } else if (passedCount >= totalCriteria / 2) {
    recommendation = 'Product needs significant improvement before Amazon listing'
  } else {
    recommendation = 'Product is not ready for Amazon. Consider improving fundamentals first'
  }

  return {
    pass: passedCount === totalCriteria,
    criteriaResults,
    score,
    recommendation,
  }
}

/**
 * Validate an Amazon product title.
 * Rules: readable + keywords, max 200 chars, not all caps, no keyword stuffing.
 */
export function validateAmazonTitle(title: string): string[] {
  const errors: string[] = []

  if (!title || title.trim().length === 0) {
    errors.push('Title is required')
    return errors
  }

  if (title.length > AMAZON_TITLE_MAX_LENGTH) {
    errors.push(`Title must be ${AMAZON_TITLE_MAX_LENGTH} characters or fewer (currently ${title.length})`)
  }

  if (title.length < 20) {
    errors.push('Title should be at least 20 characters for discoverability')
  }

  if (title === title.toUpperCase() && title.length > 5) {
    errors.push('Title should not be in ALL CAPS')
  }

  // Check for keyword stuffing (same word repeated 3+ times)
  const words = title.toLowerCase().split(/\s+/)
  const wordFreq = new Map<string, number>()
  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '')
    if (clean.length > 2) {
      wordFreq.set(clean, (wordFreq.get(clean) ?? 0) + 1)
    }
  }
  for (const [word, count] of wordFreq) {
    if (count >= 3) {
      errors.push(`Keyword stuffing detected: "${word}" appears ${count} times`)
    }
  }

  // Should contain product-relevant structure: brand + product line + key features
  // This is a soft check — warn if title seems too short to contain useful info
  const titleParts = title.split(/\s+/)
  if (titleParts.length < 5) {
    errors.push('Title should include brand, product type, and key features for SEO')
  }

  return errors
}

/**
 * Validate Amazon bullet points.
 * Rules: benefit-driven, each bullet one main benefit, max 5.
 */
export function validateAmazonBullets(bullets: string[]): string[] {
  const errors: string[] = []

  if (!bullets || bullets.length === 0) {
    errors.push('At least one bullet point is required')
    return errors
  }

  if (bullets.length > AMAZON_BULLETS_MAX) {
    errors.push(`Maximum ${AMAZON_BULLETS_MAX} bullet points allowed (found ${bullets.length})`)
  }

  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i].trim()

    if (bullet.length === 0) {
      errors.push(`Bullet ${i + 1} is empty`)
      continue
    }

    if (bullet.length > 500) {
      errors.push(`Bullet ${i + 1} exceeds 500 characters (${bullet.length})`)
    }

    if (bullet.length < 10) {
      errors.push(`Bullet ${i + 1} is too short (${bullet.length} chars). Each bullet should describe a key benefit`)
    }

    // Check if bullet starts with a benefit word
    const benefitStarters = ['perfect', 'ideal', 'great', 'designed', 'crafted', 'made', 'features', 'includes', 'ensures', 'provides', 'offers', 'delivers', 'guarantees', 'comes with']
    const startsWithBenefit = benefitStarters.some((starter) => bullet.toLowerCase().startsWith(starter))
    if (!startsWithBenefit && i === 0) {
      errors.push('First bullet should start with a benefit-driven statement')
    }
  }

  return errors
}

/**
 * Aggregate validation for a complete Amazon listing.
 */
export function validateAmazonListing(listing: AmazonListingCreateInput): string[] {
  const errors: string[] = []

  if (!listing.productId) {
    errors.push('productId is required')
  }

  if (!listing.description || listing.description.trim().length === 0) {
    errors.push('Description is required')
  } else if (listing.description.length < 50) {
    errors.push('Description should be at least 50 characters')
  }

  const titleErrors = validateAmazonTitle(listing.title)
  errors.push(...titleErrors.map((e) => `Title: ${e}`))

  const bulletErrors = validateAmazonBullets(listing.bullets)
  errors.push(...bulletErrors.map((e) => `Bullets: ${e}`))

  if (listing.price !== undefined) {
    if (listing.price < 1) {
      errors.push('Price must be at least $1.00')
    }
    if (listing.price > 99999) {
      errors.push('Price seems unrealistically high')
    }
  }

  return errors
}
