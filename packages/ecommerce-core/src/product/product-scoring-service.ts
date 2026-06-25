/**
 * Product Scoring Service — SOP Section 6.4 7-criteria scoring system.
 *
 * 7 tiêu chí chấm điểm sản phẩm theo thang 100.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */
import type { ProductResearchSheet } from './research-sheet-entity.js'

/**
 * Score search demand based on keyword count and competitor count.
 * Max: 20 points.
 *
 * @param keywords - List of keywords for the product
 * @param competitors - Number of direct competitors found
 */
export function scoreSearchDemand(keywords: string[], competitors: number): number {
  const kwScore = Math.min((keywords?.length || 0) * 2.5, 15)
  let compScore = 0
  if (competitors <= 5) compScore = 5
  else if (competitors <= 10) compScore = 3
  else if (competitors <= 20) compScore = 1
  return Math.round(Math.min(kwScore + compScore, 20))
}

/**
 * Score content potential based on number of content angles.
 * Max: 15 points.
 *
 * @param angles - List of content/angle ideas
 */
export function scoreContentPotential(angles: string[]): number {
  const count = angles?.length || 0
  if (count >= 4) return 15
  if (count >= 3) return 12
  if (count >= 2) return 8
  if (count >= 1) return 4
  return 0
}

/**
 * Score profit margin based on margin target percentage.
 * Max: 20 points.
 *
 * @param marginTarget - Target margin percentage (0-100)
 */
export function scoreProfitMargin(marginTarget: number): number {
  if (marginTarget >= 50) return 20
  if (marginTarget >= 40) return 18
  if (marginTarget >= 30) return 15
  if (marginTarget >= 20) return 10
  if (marginTarget >= 10) return 5
  return 0
}

/**
 * Score ease of fulfillment based on number of risks listed.
 * Max: 15 points.
 *
 * @param risks - Comma/semicolon/newline-separated list of fulfillment risks
 */
export function scoreFulfillmentEase(risks: string): number {
  const riskCount = risks
    ? risks.split(/[,;\n]/).filter((r: string) => r.trim().length > 0).length
    : 0
  if (riskCount === 0) return 15
  if (riskCount === 1) return 12
  if (riskCount === 2) return 8
  if (riskCount === 3) return 5
  return 2
}

/**
 * Score IP risk level based on risk description keywords.
 * Max: 15 points.
 *
 * @param ipRisks - Description of IP risks
 */
export function scoreIpRisk(ipRisks: string): number {
  const lower = (ipRisks || '').toLowerCase()
  if (lower.includes('critical') || lower.includes('cease') || lower.includes('takedown')) return 0
  if (lower.includes('high') || lower.includes('trademark')) return 5
  if (lower.includes('medium')) return 10
  return 15
}

/**
 * Score variation potential based on product name keywords.
 * Products with personalization, color/size options, or bundle potential score higher.
 * Max: 10 points.
 *
 * @param productName - The product name to analyze
 */
export function scoreVariationPotential(productName: string): number {
  const name = productName.toLowerCase()
  let score = 3
  if (name.includes('personalized') || name.includes('custom')) score += 3
  if (name.includes('color') || name.includes('colour')) score += 2
  if (name.includes('size') || /\d+\s*x\s*\d+/.test(name)) score += 2
  if (name.includes('set') || name.includes('kit') || name.includes('bundle')) score += 2
  if (/mug|shirt|hoodie|hat|tote|blanket/.test(name)) score += 1
  return Math.min(score, 10)
}

/**
 * Score season fit based on occasion.
 * Specific seasonal events score highest, life events score medium, generic scores low.
 * Max: 5 points.
 *
 * @param occasion - The occasion or event the product targets
 */
export function scoreSeasonFit(occasion: string): number {
  const o = (occasion || '').toLowerCase()
  const seasonalEvents = [
    'christmas', 'valentine', 'mother\'s day', 'father\'s day',
    'halloween', 'thanksgiving', 'easter', 'black friday',
    'cyber monday', 'new year', 'hanukkah', 'st. patrick',
    'graduation', 'fourth of july', 'independence day',
  ]
  if (seasonalEvents.some((s) => o.includes(s))) return 5
  if (['birthday', 'wedding', 'anniversary', 'engagement', 'baby shower'].some((s) => o.includes(s))) return 3
  if (o.length > 0) return 2
  return 0
}

/**
 * Calculate total product score using all 7 criteria.
 * Returns integer 0-100.
 *
 * Criteria weight:
 * 1. Search demand: max 20
 * 2. Content potential: max 15
 * 3. Profit margin: max 20
 * 4. Ease of fulfillment: max 15
 * 5. Low IP risk: max 15
 * 6. Variation potential: max 10
 * 7. Season fit: max 5
 */
export function calculateTotalScore(sheet: ProductResearchSheet): number {
  const total =
    scoreSearchDemand(sheet.keywords, sheet.mainCompetitors.length) +
    scoreContentPotential(sheet.contentAngles) +
    scoreProfitMargin(sheet.marginTarget) +
    scoreFulfillmentEase(sheet.fulfillmentRisks) +
    scoreIpRisk(sheet.ipRisks) +
    scoreVariationPotential(sheet.productName) +
    scoreSeasonFit(sheet.occasion)
  return Math.min(Math.round(total), 100)
}
