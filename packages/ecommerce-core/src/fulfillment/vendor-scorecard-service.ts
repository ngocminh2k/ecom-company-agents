/**
 * Vendor Scorecard Service — 8-criteria monthly vendor evaluation
 *
 * SOP Section 16.3: Vendor performance evaluation with weighted scoring
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export interface VendorScore {
  vendorId: string
  period: string // e.g. "2026-06"
  onTimeDelivery: number       // 0-100
  defectRate: number           // 0-100 (inverted: lower defect = higher score)
  responseTimeHours: number    // 0-100 (inverted: faster = higher score)
  actualCost: number           // 0-100 (inverted: lower cost = higher score)
  peakCapacityScore: number    // 0-100
  trackingErrorRate: number    // 0-100 (inverted: lower errors = higher score)
  complaintRate: number        // 0-100 (inverted: lower complaints = higher score)
  inventoryStability: number   // 0-100
  overallScore?: number
  notes?: string
  createdAt: string
}

export interface VendorScoreInput {
  vendorId: string
  period: string
  onTimeDelivery: number
  defectRate: number
  responseTimeHours: number
  actualCost: number
  peakCapacityScore: number
  trackingErrorRate: number
  complaintRate: number
  inventoryStability: number
  notes?: string
}

export const VENDOR_SCORE_WEIGHTS = {
  onTimeDelivery: 0.20,
  defectRate: 0.15,
  responseTimeHours: 0.10,
  actualCost: 0.15,
  peakCapacityScore: 0.10,
  trackingErrorRate: 0.10,
  complaintRate: 0.10,
  inventoryStability: 0.10,
} as const

export const SCORE_CATEGORIES = {
  excellent: { min: 90, label: 'Excellent' },
  good: { min: 75, label: 'Good' },
  average: { min: 60, label: 'Average' },
  poor: { min: 40, label: 'Poor' },
  critical: { min: 0, label: 'Critical' },
} as const

export interface VendorScoreStorage {
  insert(score: VendorScore): void
  findByVendorIdAndPeriod(vendorId: string, period: string): VendorScore | undefined
  findByVendorId(vendorId: string): VendorScore[]
  findAll(): VendorScore[]
}

export function calculateOverallScore(scores: Omit<VendorScoreInput, 'vendorId' | 'period' | 'notes'>): number {
  const weighted =
    scores.onTimeDelivery * VENDOR_SCORE_WEIGHTS.onTimeDelivery +
    scores.defectRate * VENDOR_SCORE_WEIGHTS.defectRate +
    scores.responseTimeHours * VENDOR_SCORE_WEIGHTS.responseTimeHours +
    scores.actualCost * VENDOR_SCORE_WEIGHTS.actualCost +
    scores.peakCapacityScore * VENDOR_SCORE_WEIGHTS.peakCapacityScore +
    scores.trackingErrorRate * VENDOR_SCORE_WEIGHTS.trackingErrorRate +
    scores.complaintRate * VENDOR_SCORE_WEIGHTS.complaintRate +
    scores.inventoryStability * VENDOR_SCORE_WEIGHTS.inventoryStability

  return Math.round(weighted * 100) / 100
}

export function getScoreCategory(score: number): { label: string; level: keyof typeof SCORE_CATEGORIES } {
  const levels = Object.entries(SCORE_CATEGORIES).sort((a, b) => b[1].min - a[1].min)
  for (const [level, config] of levels) {
    if (score >= config.min) {
      return { label: config.label, level: level as keyof typeof SCORE_CATEGORIES }
    }
  }
  return { label: 'Critical', level: 'critical' }
}

export class VendorScorecardService {
  constructor(private storage: VendorScoreStorage) {}

  recordScorecard(input: VendorScoreInput): VendorScore {
    if (!input.vendorId) throw new Error('vendorId is required')
    if (!input.period) throw new Error('period is required (format: YYYY-MM)')

    this.validateScoreRange(input.onTimeDelivery, 'onTimeDelivery')
    this.validateScoreRange(input.defectRate, 'defectRate')
    this.validateScoreRange(input.responseTimeHours, 'responseTimeHours')
    this.validateScoreRange(input.actualCost, 'actualCost')
    this.validateScoreRange(input.peakCapacityScore, 'peakCapacityScore')
    this.validateScoreRange(input.trackingErrorRate, 'trackingErrorRate')
    this.validateScoreRange(input.complaintRate, 'complaintRate')
    this.validateScoreRange(input.inventoryStability, 'inventoryStability')

    const existing = this.storage.findByVendorIdAndPeriod(input.vendorId, input.period)
    if (existing) {
      throw new Error(`Scorecard already exists for vendor ${input.vendorId} period ${input.period}`)
    }

    const overallScore = calculateOverallScore(input)

    const score: VendorScore = {
      ...input,
      overallScore,
      createdAt: new Date().toISOString(),
    }

    this.storage.insert(score)
    return score
  }

  getScorecard(vendorId: string, period: string): VendorScore | undefined {
    if (!vendorId) throw new Error('vendorId is required')
    if (!period) throw new Error('period is required')
    return this.storage.findByVendorIdAndPeriod(vendorId, period)
  }

  getVendorHistory(vendorId: string): VendorScore[] {
    if (!vendorId) throw new Error('vendorId is required')
    return this.storage.findByVendorId(vendorId)
  }

  getVendorComparison(): Array<VendorScore & { category: string }> {
    const allScores = this.storage.findAll()
    const latestByVendor = new Map<string, VendorScore>()

    for (const score of allScores) {
      const existing = latestByVendor.get(score.vendorId)
      if (!existing || score.period > existing.period) {
        latestByVendor.set(score.vendorId, score)
      }
    }

    return Array.from(latestByVendor.values())
      .map((s) => ({
        ...s,
        category: getScoreCategory(s.overallScore ?? 0).label,
      }))
      .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
  }

  private validateScoreRange(value: number, field: string): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${field} must be a number`)
    }
    if (value < 0 || value > 100) {
      throw new Error(`${field} must be between 0 and 100`)
    }
  }
}
