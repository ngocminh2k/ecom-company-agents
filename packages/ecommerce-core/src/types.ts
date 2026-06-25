/**
 * E-Commerce Core — shared types for domain services.
 */

export interface PodProductRequest {
  productType: 'tshirt' | 'mug' | 'hoodie' | 'poster' | 'tote-bag' | 'phone-case'
  designBrief: string
  brand?: string
  colors?: string[]
  placement?: 'center' | 'front' | 'back' | 'full'
  printProvider?: 'printful' | 'printify'
}

export interface PodMockupResult {
  productType: string
  mockupUrl: string
  printReadyUrl: string
  colorVariants: string[]
  dimensions: string
  dpi: number
  placement: string
}

export interface DropshippingResearchRequest {
  niche: string
  minPrice?: number
  maxPrice?: number
  minMargin?: number
}

export interface ProductRecommendation {
  name: string
  category: string
  costPrice: number
  sellingPrice: number
  estimatedMargin: number
  competition: 'low' | 'medium' | 'high'
  demandSignal: 'trending' | 'stable' | 'declining'
  suppliers: string[]
  risk: string[]
  goNoGo: 'go' | 'no-go'
}

export interface CampaignRequest {
  name: string
  platform: 'facebook' | 'instagram' | 'tiktok' | 'google'
  productIds: string[]
  budget: number
  objective: 'conversions' | 'traffic' | 'awareness' | 'engagement'
  targetAudience: string
  startDate?: string
  endDate?: string
}

export interface CampaignPlan {
  name: string
  platform: string
  budget: number
  objective: string
  audience: string
  adFormats: string[]
  creativeBrief: string
  suggestedBudgetBreakdown: Array<{ channel: string; percentage: number }>
  kpis: string[]
}

export interface AnalyticsReport {
  period: string
  revenue: { total: number; byChannel: Record<string, number> }
  orders: { count: number; aov: number; conversionRate: number }
  ads: { spend: number; revenue: number; roas: number }
  customers: { new: number; returning: number; ltv: number }
  topProducts: Array<{ name: string; revenue: number; units: number }>
}
