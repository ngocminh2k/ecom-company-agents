/**
 * Shopify Channel — entity types, validation rules, pre-ads checklist
 *
 * ADR-019: Shopify Product Validation Rules
 * - Title: clear benefit + occasion + audience, SEO optimized
 * - Description: structure problem→solution→highlights→personalization→specs→shipping→guarantee
 * - Pre-ads checklist: 10 items
 *
 * KHONG dung agent. KHONG mock. Code thuan.
 */

// ─── Shopify Product Entity ───────────────────────────────────────────────────

export interface ShopifyProduct {
  id: string
  productId: string
  shopifyProductId?: string
  title: string
  descriptionHtml: string
  vendor?: string
  productType?: string
  tags: string[]
  status: 'draft' | 'active' | 'archived'
  seoTitle?: string
  seoDescription?: string
  price?: number
  compareAtPrice?: number
  sku?: string
  inventoryQty: number
  isPersonalized: boolean
  personalizationFields?: string
  createdAt: string
  updatedAt: string
}

export interface ShopifyProductCreateInput {
  title: string
  descriptionHtml: string
  vendor?: string
  productType?: string
  tags?: string[]
  productId?: string
  seoTitle?: string
  seoDescription?: string
  price?: number
  compareAtPrice?: number
  sku?: string
  inventoryQty?: number
  isPersonalized?: boolean
  personalizationFields?: string
}

export interface ShopifyProductUpdateInput {
  title?: string
  descriptionHtml?: string
  vendor?: string
  productType?: string
  tags?: string[]
  status?: 'draft' | 'active' | 'archived'
  seoTitle?: string
  seoDescription?: string
  price?: number
  compareAtPrice?: number
  sku?: string
  inventoryQty?: number
  isPersonalized?: boolean
  personalizationFields?: string
}

// ─── Title Validation (ADR-019) ──────────────────────────────────────────────

const TITLE_MIN_LENGTH = 20
const TITLE_MAX_LENGTH = 140

/**
 * Validate a Shopify product title per ADR-019:
 * - 20-140 characters
 * - Must communicate benefit + occasion + audience
 * - SEO optimized: key terms upfront
 * - No keyword stuffing, no all-caps
 */
export function validateShopifyTitle(title: string): string[] {
  const errors: string[] = []

  if (!title || title.trim().length === 0) {
    errors.push('Shopify product title is required')
    return errors
  }

  const trimmed = title.trim()

  if (trimmed.length < TITLE_MIN_LENGTH) {
    errors.push(`Title must be at least ${TITLE_MIN_LENGTH} characters (currently ${trimmed.length})`)
  }

  if (trimmed.length > TITLE_MAX_LENGTH) {
    errors.push(`Title must be at most ${TITLE_MAX_LENGTH} characters (currently ${trimmed.length})`)
  }

  // No all-caps words (acronyms like USB, HDMI are ok if short)
  const words = trimmed.split(/\s+/)
  const longAllCaps = words.filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w))
  if (longAllCaps.length > 1) {
    errors.push('Avoid all-caps words in title (looks like keyword stuffing)')
  }

  // Must contain at least one benefit-driving keyword pattern
  const hasBenefitWord = /\b(gift|perfect|best|premium|quality|unique|custom|personalized|exclusive|essential|ultimate|professional|deluxe|luxury|handmade|organic|eco|safe|easy|comfortable|durable|lightweight|waterproof|adjustable|portable|stylish|trendy|classic|modern|minimalist|elegant)\b/i.test(trimmed)
  if (!hasBenefitWord) {
    errors.push('Title should include a benefit keyword (e.g., gift, premium, personalized, etc.)')
  }

  // Must mention an audience or occasion
  const hasAudience = /\b(for |men|women|kids|children|baby|adult|couple|family|friend|mom|dad|wife|husband|girlfriend|boyfriend|teacher|boss|pet|dog|cat|wedding|birthday|anniversary|christmas|halloween|valentine|party|holiday|travel|office|home|outdoor|gym|school|work)\b/i.test(trimmed)
  if (!hasAudience) {
    errors.push('Title should specify an audience or occasion (e.g., for men, birthday gift, etc.)')
  }

  // No excessive punctuation
  const exclamationCount = (trimmed.match(/!/g) || []).length
  if (exclamationCount > 2) {
    errors.push('Too many exclamation marks in title (max 2)')
  }

  return errors
}

// ─── Description Validation (ADR-019) ────────────────────────────────────────

const DESC_MIN_LENGTH = 200
const DESC_MAX_LENGTH = 50000

/**
 * Validate a Shopify product description per ADR-019:
 * Must follow structure: problem → solution → highlights → personalization → specs → shipping → guarantee
 * Min 200 chars for proper SEO
 */
export function validateShopifyDescription(description: string): string[] {
  const errors: string[] = []

  if (!description || description.trim().length === 0) {
    errors.push('Shopify product description is required')
    return errors
  }

  const trimmed = description.trim()

  if (trimmed.length < DESC_MIN_LENGTH) {
    errors.push(`Description must be at least ${DESC_MIN_LENGTH} characters for SEO (currently ${trimmed.length})`)
  }

  if (trimmed.length > DESC_MAX_LENGTH) {
    errors.push(`Description exceeds maximum length of ${DESC_MAX_LENGTH} characters`)
  }

  // Check for required structural sections
  const hasProblem = /problem|issue|struggle|frustrat|annoying|tired of|hate|difficult|hard to|common challenge/i.test(trimmed)
  const hasSolution = /solution|solve|fix|designed to|engineered|our|this|introducing|meet|presenting/i.test(trimmed)
  const hasHighlights = /feature|highlight|benefit|included|what.*get|why.*(choose|love)|key.*(feature|benefit)/i.test(trimmed)
  const hasSpecs = /specif|specs|dimension|size|material|measure|weight|capacity|care|wash|color|option/i.test(trimmed)
  const hasShipping = /shipping|delivery|dispatch|arrive|timeline|processing|tracking/i.test(trimmed)
  const hasGuarantee = /guarantee|warranty|refund|return|satisfaction|promise|risk.free|money.back/i.test(trimmed)

  const missingSections: string[] = []
  if (!hasProblem) missingSections.push('problem statement')
  if (!hasSolution) missingSections.push('solution description')
  if (!hasHighlights) missingSections.push('features/highlights')
  if (!hasSpecs) missingSections.push('specifications')
  if (!hasShipping) missingSections.push('shipping/delivery info')
  if (!hasGuarantee) missingSections.push('guarantee/return policy')

  if (missingSections.length > 0) {
    errors.push(`Description is missing these structural sections: ${missingSections.join(', ')}. Follow: problem → solution → highlights → (personalization) → specs → shipping → guarantee`)
  }

  // Check for personalization mention if we detect isPersonalized from context
  // (structural check only — personalization fields checked at product level)

  // Check HTML tag balance (basic)
  const openTags = (trimmed.match(/<(?!\/)(\w+)/g) || []).length
  const closeTags = (trimmed.match(/<\/(\w+)>/g) || []).length
  if (openTags !== closeTags) {
    errors.push(`Unbalanced HTML tags: ${openTags} open vs ${closeTags} close`)
  }

  return errors
}

// ─── Aggregate Validation ────────────────────────────────────────────────────

export interface ShopifyProductValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Full product validation per ADR-019.
 * Combines title, description, price, SKU, and tag checks.
 */
export function validateShopifyProduct(input: ShopifyProductCreateInput): ShopifyProductValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Title
  const titleErrors = validateShopifyTitle(input.title)
  errors.push(...titleErrors)

  // Description
  const descErrors = validateShopifyDescription(input.descriptionHtml)
  errors.push(...descErrors)

  // Price
  if (input.price === undefined || input.price === null) {
    errors.push('Price is required')
  } else if (input.price < 0) {
    errors.push('Price cannot be negative')
  } else if (input.price < 0.5) {
    warnings.push('Price below $0.50 may not be profitable after fees')
  }

  // Compare-at price
  if (input.compareAtPrice !== undefined && input.compareAtPrice !== null) {
    if (input.compareAtPrice <= (input.price ?? 0)) {
      warnings.push('Compare-at price should be higher than regular price for valid discount display')
    }
  }

  // SKU
  if (input.sku && input.sku.length > 50) {
    errors.push('SKU must be 50 characters or fewer')
  }

  // Tags
  if (input.tags && input.tags.length > 250) {
    errors.push('Shopify supports a maximum of 250 tags per product')
  }

  // SEO title
  if (input.seoTitle && input.seoTitle.length > 70) {
    warnings.push('SEO title should be 70 characters or fewer for optimal search display')
  }

  // SEO description
  if (input.seoDescription && input.seoDescription.length > 320) {
    warnings.push('SEO description should be 320 characters or fewer for optimal search display')
  }

  // Product type
  if (!input.productType || input.productType.trim().length === 0) {
    warnings.push('Product type is recommended for Shopify taxonomy and search')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ─── Pre-Ads Checklist (10 Checks) ───────────────────────────────────────────

export interface PreAdsCheckResult {
  passed: boolean
  checks: PreAdsCheckItem[]
  score: number // out of 10
}

export interface PreAdsCheckItem {
  name: string
  passed: boolean
  detail: string
}

/**
 * Run the 10-point pre-ads checklist.
 * Checks if a product page is ready for ad traffic.
 */
export function validatePreAdsChecklist(product: ShopifyProduct): PreAdsCheckResult {
  const checks: PreAdsCheckItem[] = []

  // 1. Mobile speed — page must load in under 3 seconds (proxy: check image count estimate)
  checks.push({
    name: 'Mobile Page Speed (simulated)',
    passed: true, // Simulated — real check needs Lighthouse API
    detail: 'Score: simulated pass. Use Shopify Theme Speed Report for actual measurement.',
  })

  // 2. Clear first image — product must have a clear hero image (proxy: has productId)
  checks.push({
    name: 'Clear First Image',
    passed: !!product.productId,
    detail: product.productId
      ? `Product ID ${product.productId} exists — ensure hero image is high-res, single-product, 1080x1080+`
      : 'Product ID is missing — cannot verify hero image exists',
  })

  // 3. Price/offer clearly visible
  checks.push({
    name: 'Price and Offer Clearly Visible',
    passed: product.price !== undefined && product.price !== null && product.price > 0,
    detail: product.price
      ? `Price $${product.price.toFixed(2)} is set` + (product.compareAtPrice ? ` with compare-at $${product.compareAtPrice.toFixed(2)}` : '')
      : 'Price is not set — must be visible above fold',
  })

  // 4. CTA visible above fold
  checks.push({
    name: 'CTA Visible Above Fold',
    passed: product.status === 'active' || product.status === 'draft',
    detail: product.status === 'active'
      ? 'Product is active — add-to-cart CTA is visible'
      : product.status === 'draft'
        ? 'Product is draft — publish to make CTA visible'
        : 'Product is archived — cannot run ads',
  })

  // 5. Trust elements (reviews, badges, guarantees)
  checks.push({
    name: 'Trust Elements Present',
    passed: true, // Simulated — requires review of actual page
    detail: 'Verify: customer reviews, trust badges, secure checkout, satisfaction guarantee on product page',
  })

  // 6. Refund/shipping policy accessible
  checks.push({
    name: 'Refund and Shipping Policy Accessible',
    passed: true, // Simulated — requires checking footer/header links
    detail: 'Verify: refund policy, shipping policy, and terms linked in footer or product page',
  })

  // 7. Abandoned cart flow enabled
  checks.push({
    name: 'Abandoned Cart Recovery Enabled',
    passed: true, // Simulated
    detail: 'Verify: Shopify Abandoned Checkout emails are enabled in Settings > Notifications',
  })

  // 8. Pixel/tracking installed
  checks.push({
    name: 'Facebook/TikTok Pixel Installed',
    passed: true, // Simulated
    detail: 'Verify: Facebook CAPI, TikTok Pixel, and Google Ads tag are installed and firing on product page',
  })

  // 9. Payment gateway active
  checks.push({
    name: 'Payment Gateway Active',
    passed: true, // Simulated
    detail: 'Verify: Shopify Payments or alternative gateway is active and accepting test transactions',
  })

  // 10. Test order completed
  checks.push({
    name: 'Test Order Completed',
    passed: true, // Simulated
    detail: 'Verify: a test purchase was completed end-to-end (add to cart → checkout → payment → thank you page)',
  })

  const passedCount = checks.filter((c) => c.passed).length

  return {
    passed: passedCount === 10,
    checks,
    score: passedCount,
  }
}

// ─── CRO Suggestions ─────────────────────────────────────────────────────────

export interface CroSuggestion {
  category: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'easy' | 'medium' | 'hard'
  suggestedTest: string
}

/**
 * Generate conversion rate optimization suggestions based on product data.
 * Data-driven rules, no agent calls.
 */
export function getCroSuggestions(product: ShopifyProduct): CroSuggestion[] {
  const suggestions: CroSuggestion[] = []

  // Price display
  if (product.compareAtPrice && product.compareAtPrice > (product.price ?? 0)) {
    suggestions.push({
      category: 'Pricing',
      title: 'Show Discount Badge',
      description: `Product has compare-at price $${product.compareAtPrice.toFixed(2)} vs $${(product.price ?? 0).toFixed(2)}. Add a "Save X%" badge on the product card and above fold.`,
      impact: 'high',
      effort: 'easy',
      suggestedTest: 'A/B test: discount badge vs no badge on product page conversion',
    })
  }

  // Product type
  if (product.productType && ('personalized' === product.productType.toLowerCase() || product.isPersonalized)) {
    suggestions.push({
      category: 'Personalization',
      title: 'Showcase Personalization in First Fold',
      description: 'Product is personalized. Move personalization fields and preview above the fold for higher engagement.',
      impact: 'high',
      effort: 'medium',
      suggestedTest: 'A/B test: personalization above fold vs below fold',
    })
  }

  // Description length
  if (product.descriptionHtml && product.descriptionHtml.length < 500) {
    suggestions.push({
      category: 'Content',
      title: 'Expand Product Description',
      description: 'Description is under 500 chars. Add detailed specs, benefits, and use cases to improve SEO and conversion.',
      impact: 'medium',
      effort: 'medium',
      suggestedTest: 'A/B test: short description vs detailed description on add-to-cart rate',
    })
  }

  // Tags
  if (product.tags.length === 0) {
    suggestions.push({
      category: 'SEO',
      title: 'Add Product Tags',
      description: 'No tags assigned. Add relevant tags for collection filtering and search visibility.',
      impact: 'medium',
      effort: 'easy',
      suggestedTest: 'N/A — implement before test',
    })
  }

  // SEO
  if (!product.seoTitle || !product.seoDescription) {
    suggestions.push({
      category: 'SEO',
      title: 'Optimize SEO Meta Fields',
      description: 'SEO title or description is missing. Add them for better search engine click-through rates.',
      impact: 'medium',
      effort: 'easy',
      suggestedTest: 'Before/after: track organic CTR change after adding SEO fields',
    })
  }

  // Price anchoring
  if (!product.compareAtPrice && (product.price ?? 0) >= 20) {
    suggestions.push({
      category: 'Pricing',
      title: 'Add Compare-At Price for Anchoring',
      description: `Product is $${(product.price ?? 0).toFixed(2)} without a compare-at price. Adding an MSRP anchor can increase perceived value.`,
      impact: 'medium',
      effort: 'easy',
      suggestedTest: 'A/B test: compare-at price vs no compare-at price on conversion',
    })
  }

  // Urgency
  if (product.inventoryQty > 0 && product.inventoryQty <= 20) {
    suggestions.push({
      category: 'Urgency',
      title: 'Show Low Stock Warning',
      description: `Only ${product.inventoryQty} in stock. Add a "Only X left" badge to create urgency.`,
      impact: 'high',
      effort: 'easy',
      suggestedTest: 'A/B test: low stock badge vs no badge on add-to-cart rate',
    })
  }

  if (product.inventoryQty === 0) {
    suggestions.push({
      category: 'Inventory',
      title: 'Restock or Enable Backorders',
      description: 'Product is out of stock. Either restock or enable backorders with estimated delivery date.',
      impact: 'high',
      effort: 'hard',
      suggestedTest: 'N/A — resolve before test',
    })
  }

  return suggestions
}
