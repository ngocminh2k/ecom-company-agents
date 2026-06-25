/**
 * Product Research Sheet Entity — SOP Section 24 form.
 *
 * Chứa interface, validation rules, và scoring cho product research sheet.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */

export type ResearchSheetStatus = 'draft' | 'in_review' | 'approved' | 'rejected'

export interface ProductResearchSheet {
  id: string
  productName: string
  niche: string
  targetCustomer: string
  occasion: string
  firstTestChannel: string
  mainCompetitors: string[]
  keywords: string[]
  priceProposed: number
  cogsEstimated: number
  shippingEstimated: number
  platformFeesEstimated: number
  cpaTarget: number
  marginTarget: number
  ipRisks: string
  fulfillmentRisks: string
  contentAngles: string[]
  score: number
  conclusion: string
  proposer: string
  approver: string
  status: ResearchSheetStatus
}

export function validateResearchSheet(input: Partial<ProductResearchSheet>): string[] {
  const errors: string[] = []

  if (!input.productName || input.productName.trim().length === 0) {
    errors.push('Product name is required')
  } else {
    if (input.productName.length < 3) errors.push('Product name must be at least 3 characters')
    if (input.productName.length > 200) errors.push('Product name must be less than 200 characters')
  }

  if (input.priceProposed !== undefined && input.priceProposed < 0) {
    errors.push('Proposed price cannot be negative')
  }

  if (input.cogsEstimated !== undefined && input.cogsEstimated < 0) {
    errors.push('Estimated COGS cannot be negative')
  }

  if (input.shippingEstimated !== undefined && input.shippingEstimated < 0) {
    errors.push('Estimated shipping cost cannot be negative')
  }

  if (input.platformFeesEstimated !== undefined && input.platformFeesEstimated < 0) {
    errors.push('Estimated platform fees cannot be negative')
  }

  if (input.cpaTarget !== undefined && input.cpaTarget < 0) {
    errors.push('CPA target cannot be negative')
  }

  if (input.marginTarget !== undefined) {
    if (input.marginTarget < 0) errors.push('Margin target cannot be negative')
    if (input.marginTarget > 100) errors.push('Margin target cannot exceed 100%')
  }

  if (input.status && !['draft', 'in_review', 'approved', 'rejected'].includes(input.status)) {
    errors.push('Status must be draft, in_review, approved, or rejected')
  }

  return errors
}

/**
 * Quick composite score based on margin and data completeness.
 * For the full 7-criteria scoring (SOP Section 6.4), use calculateTotalScore
 * from product-scoring-service.ts.
 */
export function calculateScore(sheet: ProductResearchSheet): number {
  let score = 0

  // Margin component (max 40 points)
  if (sheet.marginTarget >= 50) score += 40
  else if (sheet.marginTarget >= 40) score += 35
  else if (sheet.marginTarget >= 30) score += 25
  else if (sheet.marginTarget >= 20) score += 15
  else if (sheet.marginTarget >= 10) score += 5

  // Keywords component (max 20 points)
  const kwCount = sheet.keywords?.length || 0
  if (kwCount >= 8) score += 20
  else if (kwCount >= 5) score += 15
  else if (kwCount >= 3) score += 10
  else if (kwCount >= 1) score += 5

  // Content angles component (max 15 points)
  const angleCount = sheet.contentAngles?.length || 0
  if (angleCount >= 4) score += 15
  else if (angleCount >= 3) score += 12
  else if (angleCount >= 2) score += 8
  else if (angleCount >= 1) score += 4

  // Competitors component (max 15 points)
  const compCount = sheet.mainCompetitors?.length || 0
  if (compCount >= 15) score += 15
  else if (compCount >= 10) score += 12
  else if (compCount >= 5) score += 8
  else if (compCount >= 1) score += 4

  // Niche & occasion (max 10 points)
  if (sheet.niche?.trim()) score += 5
  if (sheet.occasion?.trim()) score += 5

  return Math.min(score, 100)
}

/**
 * Validate state transition for research sheet status workflow.
 * draft -> in_review -> approved | rejected
 * Any status can go back to draft for revision.
 */
export function isValidResearchTransition(current: ResearchSheetStatus, next: ResearchSheetStatus): boolean {
  const transitions: Record<ResearchSheetStatus, ResearchSheetStatus[]> = {
    draft: ['in_review'],
    in_review: ['approved', 'rejected', 'draft'],
    approved: ['draft'],
    rejected: ['draft'],
  }
  return transitions[current]?.includes(next) ?? false
}
