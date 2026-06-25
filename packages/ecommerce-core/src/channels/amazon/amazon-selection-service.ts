/**
 * Amazon Selection Service — product eligibility evaluation for Amazon.
 *
 * Pure business logic. No agent calls.
 * Evaluate products against the 6 ADR-020 criteria before listing.
 */
import { validateAmazonSelection } from './amazon-entity.js'
import type { ProductEligibilityInput, ProductEligibilityResult } from './amazon-entity.js'

export interface ProductEligibilityScore {
  productId: string
  pass: boolean
  score: number
  criteriaResults: ProductEligibilityResult['criteriaResults']
  recommendation: string
}

export class AmazonSelectionService {
  private products: Map<string, ProductEligibilityInput> = new Map()

  /**
   * Evaluate a product for Amazon eligibility.
   */
  evaluateProductForAmazon(productId: string, eligibility: ProductEligibilityInput): ProductEligibilityScore {
    const result = validateAmazonSelection(eligibility)
    this.products.set(productId, eligibility)

    return {
      productId,
      pass: result.pass,
      score: result.score,
      criteriaResults: result.criteriaResults,
      recommendation: result.recommendation,
    }
  }

  /**
   * Get all products that pass all 6 eligibility criteria.
   */
  getApprovedProducts(): Array<{ productId: string; score: number; recommendation: string }> {
    const approved: Array<{ productId: string; score: number; recommendation: string }> = []

    for (const [productId, eligibility] of this.products) {
      const result = validateAmazonSelection(eligibility)
      if (result.pass) {
        approved.push({
          productId,
          score: result.score,
          recommendation: result.recommendation,
        })
      }
    }

    return approved
  }

  /**
   * Score a product 0-100 based on eligibility criteria.
   */
  getProductScore(productId: string): number | null {
    const eligibility = this.products.get(productId)
    if (!eligibility) return null

    const result = validateAmazonSelection(eligibility)
    return result.score
  }

  /**
   * Check if a specific criterion passes.
   */
  checkCriterion(productId: string, criterionIndex: number): boolean | null {
    const eligibility = this.products.get(productId)
    if (!eligibility) return null

    const result = validateAmazonSelection(eligibility)
    const criterion = result.criteriaResults[criterionIndex]
    return criterion ? criterion.passed : null
  }
}
