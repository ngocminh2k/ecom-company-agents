/**
 * Etsy Pre-Publish Checklist — 10 SOP checks (ADR-018)
 *
 * Mỗi check return { pass: boolean, message: string }.
 * Checklist phải được pass hết trước khi publish listing lên Etsy.
 */

export interface ChecklistItem {
  key: string
  name: string
  check: (listing: ChecklistListing) => ChecklistResult
}

export interface ChecklistResult {
  pass: boolean
  message: string
}

export interface ChecklistListing {
  title: string
  description: string
  tags: string[]
  price: number
  processingTimeDays: number
  hasMainImage: boolean
  hasPersonalizationImage: boolean
  hasSizeImage: boolean
  hasMaterialImage: boolean
  hasOrderingGuideImage: boolean
  hasProductionPartner: boolean
  hasRefundPolicy: boolean
}

/**
 * Check 1: Title không bị keyword stuffing.
 * Title nên đọc tự nhiên, không nhồi nhét từ khóa.
 */
function checkTitleNotStuffed(listing: ChecklistListing): ChecklistResult {
  const words = listing.title.split(/\s+/)
  const wordCounts = new Map<string, number>()
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (lower.length > 2) {
      wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1)
    }
  }
  const stuffed = Array.from(wordCounts.entries()).filter(([, count]) => count > 2)
  if (stuffed.length > 0) {
    return {
      pass: false,
      message: `Title has keyword stuffing: words ${stuffed.map(([w, c]) => `"${w}" (${c}x)`).join(', ')} appear more than 2 times. Rewrite for natural readability.`,
    }
  }
  return { pass: true, message: 'Title reads naturally without keyword stuffing.' }
}

/**
 * Check 2: Main image clear in 1 second.
 * Kiểm tra basic: listing có main image.
 */
function checkMainImageClear(listing: ChecklistListing): ChecklistResult {
  if (!listing.hasMainImage) {
    return {
      pass: false,
      message: 'No main image provided. The main image must be immediately clear what the product is within 1 second.',
    }
  }
  return { pass: true, message: 'Main image is present.' }
}

/**
 * Check 3: Personalization image present (if applicable).
 */
function checkPersonalizationImage(listing: ChecklistListing): ChecklistResult {
  if (listing.hasPersonalizationImage === undefined) {
    return { pass: true, message: 'Not applicable — product does not require personalization.' }
  }
  if (!listing.hasPersonalizationImage) {
    return {
      pass: false,
      message: 'Personalization image is missing. A mockup showing the personalization area is required.',
    }
  }
  return { pass: true, message: 'Personalization image is present.' }
}

/**
 * Check 4: Size image present.
 */
function checkSizeImage(listing: ChecklistListing): ChecklistResult {
  if (!listing.hasSizeImage) {
    return {
      pass: false,
      message: 'Size chart or measurement image is missing. Buyers need size reference to order correctly.',
    }
  }
  return { pass: true, message: 'Size image is present.' }
}

/**
 * Check 5: Material image present.
 */
function checkMaterialImage(listing: ChecklistListing): ChecklistResult {
  if (!listing.hasMaterialImage) {
    return {
      pass: false,
      message: 'Material/fabric detail image is missing. Show the material texture or composition.',
    }
  }
  return { pass: true, message: 'Material image is present.' }
}

/**
 * Check 6: Ordering guide image present.
 */
function checkOrderingGuideImage(listing: ChecklistListing): ChecklistResult {
  if (!listing.hasOrderingGuideImage) {
    return {
      pass: false,
      message: 'Ordering guide image is missing. Include instructions for color, size selection, and personalization.',
    }
  }
  return { pass: true, message: 'Ordering guide image is present.' }
}

/**
 * Check 7: Description không hứa hẹn giao hàng nhanh hơn khả năng.
 */
function checkNoUnrealisticDeliveryPromise(listing: ChecklistListing): ChecklistResult {
  const desc = listing.description.toLowerCase()
  // Nếu processing time 3-5 ngày, không được hứa "ships in 1 day"
  const promisesFastDelivery = /\bships?\s+(in|within)\s+(1|2)\s*(day|business)/.test(listing.description.toLowerCase())
  if (promisesFastDelivery && listing.processingTimeDays > 2) {
    return {
      pass: false,
      message: `Description promises fast delivery (1-2 days) but processing time is ${listing.processingTimeDays} days. Update delivery promise to match actual processing time.`,
    }
  }
  return { pass: true, message: 'Delivery promises are consistent with processing time.' }
}

/**
 * Check 8: No unauthorized IP (brands, characters, logos, quotes).
 * Kiểm tra basic pattern matching cho IP violations.
 */
function checkNoUnauthorizedIP(listing: ChecklistListing): ChecklistResult {
  const ipKeywords = [
    // Brands
    'nike', 'adidas', 'gucci', 'prada', 'louis vuitton', 'chanel', 'versace', 'disney',
    'marvel', 'dc comics', 'harry potter', 'star wars', 'lego', 'hello kitty',
    // Characters
    'mickey mouse', 'pokemon', 'snoopy', 'pikachu', 'minion', 'spider-man', 'batman',
    'superman', 'wonder woman', 'peppa pig', 'bluey',
    // Logos
    'just do it', 'i\'m lovin\' it',
    // Quotes/IP
    'live laugh love', 'boss babe', 'girl boss',
  ]

  const searchable = (listing.title + ' ' + listing.description).toLowerCase()
  const foundIp = ipKeywords.filter((kw) => searchable.includes(kw))

  if (foundIp.length > 0) {
    return {
      pass: false,
      message: `Potential unauthorized IP detected: "${foundIp.join(', ')}". Remove any brand, character, or trademarked content unless you have a license.`,
    }
  }
  return { pass: true, message: 'No unauthorized IP detected.' }
}

/**
 * Check 9: Production partner declared if applicable.
 */
function checkProductionPartnerDeclared(listing: ChecklistListing): ChecklistResult {
  if (listing.hasProductionPartner === undefined) {
    return { pass: true, message: 'Not applicable — no production partner needed.' }
  }
  if (!listing.hasProductionPartner) {
    return {
      pass: false,
      message: 'Production partner (e.g., Printful, Printify) must be declared in the listing or shop policies.',
    }
  }
  return { pass: true, message: 'Production partner is declared.' }
}

/**
 * Check 10: Clear refund/return policy.
 */
function checkClearRefundPolicy(listing: ChecklistListing): ChecklistResult {
  if (!listing.hasRefundPolicy) {
    return {
      pass: false,
      message: 'Clear refund/return/exchange policy is missing. Include it in the description or shop policies.',
    }
  }
  if (!listing.description.toLowerCase().includes('return') && !listing.description.toLowerCase().includes('refund')) {
    return {
      pass: true,
      message: 'Refund policy is set at shop level but not mentioned in listing description — consider adding a brief note.',
    }
  }
  return { pass: true, message: 'Refund/return policy is clear in the description.' }
}

/**
 * Full pre-publish checklist — all 10 checks.
 */
export function getPrePublishChecklist(listing: ChecklistListing): ChecklistResult[] {
  const checks: ChecklistItem[] = [
    { key: 'title_not_stuffed', name: 'Title not keyword stuffed', check: checkTitleNotStuffed },
    { key: 'main_image_clear', name: 'Main image clear in 1 second', check: checkMainImageClear },
    { key: 'personalization_image', name: 'Personalization image present', check: checkPersonalizationImage },
    { key: 'size_image', name: 'Size image present', check: checkSizeImage },
    { key: 'material_image', name: 'Material image present', check: checkMaterialImage },
    { key: 'ordering_guide_image', name: 'Ordering guide image present', check: checkOrderingGuideImage },
    { key: 'no_unrealistic_delivery', name: 'No unrealistic delivery promises', check: checkNoUnrealisticDeliveryPromise },
    { key: 'no_unauthorized_ip', name: 'No unauthorized IP content', check: checkNoUnauthorizedIP },
    { key: 'production_partner', name: 'Production partner declared', check: checkProductionPartnerDeclared },
    { key: 'refund_policy', name: 'Clear refund/return policy', check: checkClearRefundPolicy },
  ]

  return checks.map((item) => item.check(listing))
}

/**
 * Check if all pre-publish checks pass.
 */
export function canPublish(results: ChecklistResult[]): boolean {
  return results.every((r) => r.pass)
}
