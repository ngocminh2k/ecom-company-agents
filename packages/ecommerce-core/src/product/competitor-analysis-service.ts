/**
 * Competitor Analysis Service — SOP Section 6.3 competitor tracking.
 *
 * Ghi lại thông tin đối thủ và tạo báo cáo phân tích.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */
import { randomUUID } from 'node:crypto'

export interface CompetitorEntry {
  id: string
  productId: string
  competitorName: string
  price: number
  reviews: number
  rating: number
  mainImageUrl?: string
  offer?: string
  shippingTime?: string
  keyMessage?: string
  createdAt: string
}

export interface CompetitorCreateInput {
  productId: string
  competitorName: string
  price?: number
  reviews?: number
  rating?: number
  mainImageUrl?: string
  offer?: string
  shippingTime?: string
  keyMessage?: string
}

export interface CompetitorAnalysisReport {
  productId: string
  totalCompetitors: number
  avgPrice: number
  avgRating: number
  priceRange: { min: number; max: number }
  topKeywords: string[]
  opportunities: string[]
  threats: string[]
}

export interface CompetitorStorage {
  create(entry: CompetitorEntry): CompetitorEntry
  findByProductId(productId: string): CompetitorEntry[]
  delete(id: string): boolean
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'can', 'shall', 'not', 'no', 'nor', 'so', 'if', 'as',
  'it', 'its', 'this', 'that', 'these', 'those', 'we', 'he', 'she', 'they',
  'you', 'me', 'him', 'her', 'them', 'your', 'our', 'my', 'his', 'her',
  'their', 'its', 'from', 'up', 'down', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very',
  'just', 'because', 'about', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'since', 'until', 'also',
  'has', 'had', 'have', 'been', 'being', 'get', 'got', 'gets',
])

function extractTopKeywords(competitors: CompetitorEntry[]): string[] {
  const freq = new Map<string, number>()
  for (const c of competitors) {
    if (!c.keyMessage) continue
    const words = c.keyMessage.toLowerCase().split(/\s+/)
    for (const w of words) {
      if (w.length > 2 && !STOP_WORDS.has(w)) {
        freq.set(w, (freq.get(w) || 0) + 1)
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function generateOpportunities(competitors: CompetitorEntry[], avgRating: number): string[] {
  const ops: string[] = []
  const prices = competitors.filter((c) => c.price > 0).map((c) => c.price)

  if (prices.length > 0) {
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    if (maxPrice - minPrice > 10) {
      ops.push('Wide price range suggests opportunity for premium or value positioning')
    }
  }

  if (avgRating > 0 && avgRating < 4) {
    ops.push('Average competitor rating below 4.0 — opportunity to differentiate on quality')
  }

  const totalReviews = competitors.reduce((sum, c) => sum + c.reviews, 0)
  if (totalReviews < 100) {
    ops.push('Low total review count suggests market is not yet saturated')
  }

  if (ops.length === 0) {
    ops.push('Market appears competitive — focus on unique angle, personalization, or superior offer')
  }

  return ops
}

function generateThreats(competitors: CompetitorEntry[], avgPrice: number): string[] {
  const threats: string[] = []

  const prices = competitors.filter((c) => c.price > 0).map((c) => c.price)

  if (competitors.length > 20) {
    threats.push('Highly competitive market with many established sellers')
  }

  if (prices.length > 0) {
    const minPrice = Math.min(...prices)
    if (avgPrice > 0 && minPrice < avgPrice * 0.5) {
      threats.push('Price pressure from low-cost competitors')
    }
  }

  const highRated = competitors.filter((c) => c.rating >= 4.5)
  if (highRated.length > 5) {
    threats.push('Multiple highly-rated competitors make it difficult to stand out')
  }

  if (threats.length === 0) {
    threats.push('Monitor competitor activity for emerging threats')
  }

  return threats
}

export class CompetitorAnalysisService {
  constructor(private storage: CompetitorStorage) {}

  recordCompetitor(input: CompetitorCreateInput): CompetitorEntry {
    const entry: CompetitorEntry = {
      id: randomUUID(),
      productId: input.productId,
      competitorName: input.competitorName,
      price: input.price ?? 0,
      reviews: input.reviews ?? 0,
      rating: input.rating ?? 0,
      mainImageUrl: input.mainImageUrl,
      offer: input.offer,
      shippingTime: input.shippingTime,
      keyMessage: input.keyMessage,
      createdAt: new Date().toISOString(),
    }
    return this.storage.create(entry)
  }

  getCompetitors(productId: string): CompetitorEntry[] {
    return this.storage.findByProductId(productId)
  }

  generateReport(productId: string): CompetitorAnalysisReport {
    const competitors = this.storage.findByProductId(productId)

    if (competitors.length === 0) {
      return {
        productId,
        totalCompetitors: 0,
        avgPrice: 0,
        avgRating: 0,
        priceRange: { min: 0, max: 0 },
        topKeywords: [],
        opportunities: ['No competitor data recorded yet. Record at least 10 competitors for meaningful analysis.'],
        threats: [],
      }
    }

    const prices = competitors.filter((c) => c.price > 0).map((c) => c.price)
    const ratings = competitors.filter((c) => c.rating > 0).map((c) => c.rating)

    const avgPrice = prices.length > 0
      ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
      : 0

    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100
      : 0

    return {
      productId,
      totalCompetitors: competitors.length,
      avgPrice,
      avgRating,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      topKeywords: extractTopKeywords(competitors),
      opportunities: generateOpportunities(competitors, avgRating),
      threats: generateThreats(competitors, avgPrice),
    }
  }
}
