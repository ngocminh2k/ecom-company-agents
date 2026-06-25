/**
 * Amazon Ads Service — campaign management, keyword suggestion, and performance tracking.
 *
 * Pure business logic for Amazon Advertising (AMS).
 * No agent calls. No mock fallback in production.
 * Uses AmazonAdsStorage interface for persistence (SQLite in production).
 */

export interface AmazonCampaignInput {
  name: string
  listingId: string
  dailyBudget: number
  startDate: string
  campaignType: 'sponsored_products' | 'sponsored_brands' | 'sponsored_display'
  targetingType: 'auto' | 'manual' | 'auto_plus_manual'
  bidStrategy: 'dynamic_down_only' | 'dynamic_up_down' | 'fixed'
  defaultBid: number
  keywords?: AmazonKeyword[]
}

export interface AmazonCampaign {
  id: string
  name: string
  listingId: string
  dailyBudget: number
  startDate: string
  campaignType: string
  targetingType: string
  bidStrategy: string
  defaultBid: number
  status: 'draft' | 'running' | 'paused' | 'archived'
  keywords: AmazonKeyword[]
  createdAt: string
  updatedAt: string
}

export interface AmazonKeyword {
  keyword: string
  matchType: 'exact' | 'phrase' | 'broad'
  bid?: number
}

export interface CampaignPerformance {
  campaignId: string
  impressions: number
  clicks: number
  spend: number
  sales: number
  orders: number
  acos: number       // Advertising Cost of Sale (spend / sales)
  tacos: number      // Total Advertising Cost of Sale
  ctr: number        // Click-Through Rate
  conversionRate: number
  roas: number       // Return on Ad Spend
}

/**
 * Storage interface for Amazon Ads.
 */
export interface AmazonAdsStorage {
  createCampaign(campaign: AmazonCampaign): AmazonCampaign
  getCampaign(id: string): AmazonCampaign | undefined
  getCampaigns(): AmazonCampaign[]
  updateCampaign(id: string, updates: Partial<AmazonCampaign>): AmazonCampaign | undefined
  trackPerformance(campaignId: string, performance: CampaignPerformance): CampaignPerformance | null
  getCampaignPerformance(campaignId: string): CampaignPerformance | null
}

export class AmazonAdsService {
  constructor(private storage: AmazonAdsStorage) {}

  /**
   * Create a new Amazon advertising campaign.
   */
  createCampaign(input: AmazonCampaignInput): { campaign?: AmazonCampaign; errors: string[] } {
    const errors: string[] = []

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Campaign name is required')
    }

    if (!input.listingId) {
      errors.push('Listing ID is required')
    }

    if (!input.dailyBudget || input.dailyBudget <= 0) {
      errors.push('Daily budget must be greater than 0')
    }

    if (!['sponsored_products', 'sponsored_brands', 'sponsored_display'].includes(input.campaignType)) {
      errors.push('Campaign type must be sponsored_products, sponsored_brands, or sponsored_display')
    }

    if (!['auto', 'manual', 'auto_plus_manual'].includes(input.targetingType)) {
      errors.push('Targeting type must be auto, manual, or auto_plus_manual')
    }

    if (!input.defaultBid || input.defaultBid <= 0) {
      errors.push('Default bid must be greater than 0')
    }

    if (errors.length > 0) {
      return { errors }
    }

    const now = new Date().toISOString()
    const campaign: AmazonCampaign = {
      id: `ams-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      listingId: input.listingId,
      dailyBudget: input.dailyBudget,
      startDate: input.startDate,
      campaignType: input.campaignType,
      targetingType: input.targetingType,
      bidStrategy: input.bidStrategy,
      defaultBid: input.defaultBid,
      status: 'draft',
      keywords: input.keywords ?? [],
      createdAt: now,
      updatedAt: now,
    }

    const saved = this.storage.createCampaign(campaign)
    return { campaign: saved, errors: [] }
  }

  /**
   * Get recommended keywords for a listing.
   * Returns auto-targeting suggestions and manual keyword ideas.
   */
  getRecommendedKeywords(listingTitle: string, listingBullets: string[], category?: string): AmazonKeyword[] {
    const keywords: AmazonKeyword[] = []

    // Extract significant words from title (3+ chars, not common words)
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'our', 'its', 'are', 'was', 'all', 'can', 'has', 'not', 'but', 'you', 'one'])
    const titleWords = listingTitle.toLowerCase().split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w))

    // Build keyword combinations from title
    for (let i = 0; i < Math.min(titleWords.length, 5); i++) {
      keywords.push({
        keyword: titleWords[i],
        matchType: 'broad',
      })
    }

    // Create phrase matches from title bigrams
    for (let i = 0; i < Math.min(titleWords.length - 1, 3); i++) {
      keywords.push({
        keyword: `${titleWords[i]} ${titleWords[i + 1]}`,
        matchType: 'phrase',
      })
    }

    // Extract benefit keywords from bullets
    const benefitWords = new Set<string>()
    for (const bullet of listingBullets.slice(0, 3)) {
      const words = bullet.toLowerCase().split(/\s+/).filter((w) => w.length >= 4 && !stopWords.has(w))
      for (const word of words.slice(0, 3)) {
        benefitWords.add(word)
      }
    }
    for (const word of benefitWords) {
      keywords.push({
        keyword: word,
        matchType: 'exact',
        bid: 0.75,
      })
    }

    // Category-based auto-suggestions
    if (category) {
      const categoryTerms = category.toLowerCase().split(/[_/\s]+/)
      for (const term of categoryTerms.slice(0, 2)) {
        if (term.length >= 3) {
          keywords.push({
            keyword: term,
            matchType: 'broad',
          })
        }
      }
    }

    return keywords
  }

  /**
   * Track campaign performance metrics.
   */
  trackPerformance(campaignId: string, performance: CampaignPerformance): CampaignPerformance | null {
    return this.storage.trackPerformance(campaignId, performance)
  }

  /**
   * Get campaign performance data.
   */
  getCampaignPerformance(campaignId: string): CampaignPerformance | null {
    return this.storage.getCampaignPerformance(campaignId)
  }

  /**
   * Get all campaigns.
   */
  getCampaigns(): AmazonCampaign[] {
    return this.storage.getCampaigns()
  }

  /**
   * Get a campaign by ID.
   */
  getCampaign(id: string): AmazonCampaign | undefined {
    return this.storage.getCampaign(id)
  }

  /**
   * Update campaign status.
   */
  updateCampaignStatus(id: string, status: AmazonCampaign['status']): boolean {
    const updated = this.storage.updateCampaign(id, {
      status,
      updatedAt: new Date().toISOString(),
    })
    return !!updated
  }
}
