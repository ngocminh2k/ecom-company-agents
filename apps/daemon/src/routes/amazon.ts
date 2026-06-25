/**
 * Amazon Channel Routes — REST endpoints for all Amazon services.
 *
 * Implements Phase 4: Amazon Channel for ECC OmniStudio.
 */
import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import type { DaemonContext } from '../app.js'
import {
  AmazonSelectionService,
  AmazonListingService,
  type AmazonListingStorage,
  type AmazonListing,
  AmazonAccountHealthService,
  type AccountHealthStorage,
  type AccountHealthMetrics,
  type AccountIncident,
  AmazonAdsService,
  type AmazonAdsStorage,
  type AmazonCampaign,
  type AmazonCampaignInput,
  type CampaignPerformance,
} from '@ngocminh2k/ecommerce-core'

export const amazonRouter: RouterType = Router()

// ─── Selection Service (in-memory is acceptable - it's ephemeral evaluation data) ──

function createSelectionService() {
  return new AmazonSelectionService()
}

// ─── Listing Storage Adapter (SQLite) ────────────────────────────────────

function createListingStorage(): AmazonListingStorage {
  return {
    findAll(status?: string): AmazonListing[] {
      const db = getDb()
      if (status) {
        return db.prepare('SELECT * FROM amazon_listings WHERE status = ? ORDER BY created_at DESC').all(status) as AmazonListing[]
      }
      return db.prepare('SELECT * FROM amazon_listings ORDER BY created_at DESC').all() as AmazonListing[]
    },

    findById(id: string): AmazonListing | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_listings WHERE id = ?').get(id) as AmazonListing | undefined
      return row || undefined
    },

    create(listing: AmazonListing): AmazonListing {
      const db = getDb()
      db.prepare(`
        INSERT INTO amazon_listings (id, product_id, asin, sku, title, bullets, description, price, fulfillment_type, status, category, variation_theme, parent_asin, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        listing.id, listing.productId, listing.asin ?? null, listing.sku ?? null,
        listing.title, JSON.stringify(listing.bullets), listing.description,
        listing.price ?? null, listing.fulfillmentType, listing.status,
        listing.category ?? null, listing.variationTheme ?? null, listing.parentAsin ?? null,
        listing.createdAt, listing.updatedAt,
      )
      return listing
    },

    update(id: string, updates: Partial<AmazonListing>): AmazonListing | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM amazon_listings WHERE id = ?').get(id) as any
      if (!existing) return undefined

      const fields: string[] = []
      const values: any[] = []

      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title) }
      if (updates.bullets !== undefined) { fields.push('bullets = ?'); values.push(JSON.stringify(updates.bullets)) }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
      if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price) }
      if (updates.fulfillmentType !== undefined) { fields.push('fulfillment_type = ?'); values.push(updates.fulfillmentType) }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.sku !== undefined) { fields.push('sku = ?'); values.push(updates.sku) }
      if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category) }
      if (updates.variationTheme !== undefined) { fields.push('variation_theme = ?'); values.push(updates.variationTheme) }
      if (updates.parentAsin !== undefined) { fields.push('parent_asin = ?'); values.push(updates.parentAsin) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }

      if (fields.length === 0) return existing

      values.push(id)
      db.prepare(`UPDATE amazon_listings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      const updated = db.prepare('SELECT * FROM amazon_listings WHERE id = ?').get(id) as any
      return updated || undefined
    },

    delete(id: string): boolean {
      const db = getDb()
      const result = db.prepare('DELETE FROM amazon_listings WHERE id = ?').run(id)
      return result.changes > 0
    },
  }
}

// ─── Account Health Storage Adapter (SQLite) ────────────────────────────

function createAccountHealthStorage(): AccountHealthStorage {
  return {
    getMetrics(): AccountHealthMetrics {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_account_health ORDER BY updated_at DESC LIMIT 1').get() as any
      if (row) {
        return {
          odr: row.odr,
          cancellationRate: row.cancellation_rate,
          lateShipmentRate: row.late_shipment_rate,
          validTrackingRate: row.valid_tracking_rate,
          overallHealth: row.overall_health,
        }
      }
      return {
        odr: 0,
        cancellationRate: 0,
        lateShipmentRate: 0,
        validTrackingRate: 1,
        overallHealth: 'good',
      }
    },

    setMetrics(metrics: AccountHealthMetrics): void {
      const db = getDb()
      const existing = db.prepare('SELECT id FROM amazon_account_health ORDER BY updated_at DESC LIMIT 1').get() as any
      const now = new Date().toISOString()
      if (existing) {
        db.prepare(`
          UPDATE amazon_account_health SET odr = ?, cancellation_rate = ?, late_shipment_rate = ?, valid_tracking_rate = ?, overall_health = ?, updated_at = ? WHERE id = ?
        `).run(
          metrics.odr, metrics.cancellationRate, metrics.lateShipmentRate,
          metrics.validTrackingRate, metrics.overallHealth, now, existing.id,
        )
      } else {
        db.prepare(`
          INSERT INTO amazon_account_health (id, odr, cancellation_rate, late_shipment_rate, valid_tracking_rate, overall_health, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'health-1', metrics.odr, metrics.cancellationRate, metrics.lateShipmentRate,
          metrics.validTrackingRate, metrics.overallHealth, now, now,
        )
      }
    },

    getIncidents(): AccountIncident[] {
      const db = getDb()
      return db.prepare('SELECT * FROM amazon_account_incidents ORDER BY reported_at DESC').all() as AccountIncident[]
    },

    getIncidentsByStatus(status: AccountIncident['status']): AccountIncident[] {
      const db = getDb()
      return db.prepare('SELECT * FROM amazon_account_incidents WHERE status = ? ORDER BY reported_at DESC').all(status) as AccountIncident[]
    },

    logIncident(incident: AccountIncident): AccountIncident {
      const db = getDb()
      db.prepare(`
        INSERT INTO amazon_account_incidents (id, type, severity, description, category, reported_at, status, resolution)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        incident.id, incident.type, incident.severity,
        incident.description, incident.category ?? null,
        incident.reportedAt, incident.status, incident.resolution ?? null,
      )
      return incident
    },
  }
}

// ─── Ads Storage Adapter (SQLite) ───────────────────────────────────────

function createAdsStorage(): AmazonAdsStorage {
  return {
    createCampaign(campaign: AmazonCampaign): AmazonCampaign {
      const db = getDb()
      db.prepare(`
        INSERT INTO amazon_campaigns (id, name, listing_id, daily_budget, start_date, campaign_type, targeting_type, bid_strategy, default_bid, status, keywords, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        campaign.id, campaign.name, campaign.listingId, campaign.dailyBudget,
        campaign.startDate, campaign.campaignType, campaign.targetingType,
        campaign.bidStrategy, campaign.defaultBid, campaign.status,
        JSON.stringify(campaign.keywords), campaign.createdAt, campaign.updatedAt,
      )
      return campaign
    },

    getCampaign(id: string): AmazonCampaign | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_campaigns WHERE id = ?').get(id) as any
      return row ? rowToCampaign(row) : undefined
    },

    getCampaigns(): AmazonCampaign[] {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM amazon_campaigns ORDER BY created_at DESC').all() as any[]
      return rows.map(rowToCampaign)
    },

    updateCampaign(id: string, updates: Partial<AmazonCampaign>): AmazonCampaign | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM amazon_campaigns WHERE id = ?').get(id) as any
      if (!existing) return undefined

      const fields: string[] = []
      const values: any[] = []

      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.dailyBudget !== undefined) { fields.push('daily_budget = ?'); values.push(updates.dailyBudget) }
      if (updates.defaultBid !== undefined) { fields.push('default_bid = ?'); values.push(updates.defaultBid) }
      if (updates.keywords !== undefined) { fields.push('keywords = ?'); values.push(JSON.stringify(updates.keywords)) }
      if (updates.updatedAt !== undefined) { fields.push('updated_at = ?'); values.push(updates.updatedAt) }

      if (fields.length === 0) return rowToCampaign(existing)

      values.push(id)
      db.prepare(`UPDATE amazon_campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      const updated = db.prepare('SELECT * FROM amazon_campaigns WHERE id = ?').get(id) as any
      return updated ? rowToCampaign(updated) : undefined
    },

    trackPerformance(campaignId: string, performance: CampaignPerformance): CampaignPerformance | null {
      const db = getDb()
      const campaign = db.prepare('SELECT id FROM amazon_campaigns WHERE id = ?').get(campaignId) as any
      if (!campaign) return null

      const now = new Date().toISOString()
      const existing = db.prepare('SELECT id FROM amazon_campaign_performance WHERE campaign_id = ?').get(campaignId) as any
      if (existing) {
        db.prepare(`
          UPDATE amazon_campaign_performance SET impressions = ?, clicks = ?, spend = ?, sales = ?, orders = ?, acos = ?, tacos = ?, ctr = ?, conversion_rate = ?, roas = ?, updated_at = ?
          WHERE campaign_id = ?
        `).run(
          performance.impressions, performance.clicks, performance.spend,
          performance.sales, performance.orders, performance.acos, performance.tacos,
          performance.ctr, performance.conversionRate, performance.roas,
          now, campaignId,
        )
      } else {
        db.prepare(`
          INSERT INTO amazon_campaign_performance (id, campaign_id, impressions, clicks, spend, sales, orders, acos, tacos, ctr, conversion_rate, roas, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `perf-${campaignId}`, campaignId,
          performance.impressions, performance.clicks, performance.spend,
          performance.sales, performance.orders, performance.acos, performance.tacos,
          performance.ctr, performance.conversionRate, performance.roas,
          now, now,
        )
      }
      return performance
    },

    getCampaignPerformance(campaignId: string): CampaignPerformance | null {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_campaign_performance WHERE campaign_id = ?').get(campaignId) as any
      if (!row) return null
      return {
        campaignId: row.campaign_id,
        impressions: row.impressions,
        clicks: row.clicks,
        spend: row.spend,
        sales: row.sales,
        orders: row.orders,
        acos: row.acos,
        tacos: row.tacos,
        ctr: row.ctr,
        conversionRate: row.conversion_rate,
        roas: row.roas,
      }
    },
  }
}

function rowToCampaign(row: any): AmazonCampaign {
  return {
    id: row.id,
    name: row.name,
    listingId: row.listing_id,
    dailyBudget: row.daily_budget,
    startDate: row.start_date,
    campaignType: row.campaign_type,
    targetingType: row.targeting_type,
    bidStrategy: row.bid_strategy,
    defaultBid: row.default_bid,
    status: row.status,
    keywords: typeof row.keywords === 'string' ? JSON.parse(row.keywords) : (row.keywords || []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Create singleton storage instances ─────────────────────────────────

const listingStorage = createListingStorage()
const accountHealthStorage = createAccountHealthStorage()
const adsStorage = createAdsStorage()

// ─── Create singleton service instances ─────────────────────────────────

const listingService = new AmazonListingService(listingStorage)
const accountHealthService = new AmazonAccountHealthService(accountHealthStorage)
const adsService = new AmazonAdsService(adsStorage)

// ─── Product Selection ────────────────────────────────────────────────

/**
 * Evaluate a product for Amazon eligibility.
 * POST /api/amazon/selection/evaluate
 */
amazonRouter.post('/selection/evaluate', (req: any, res) => {
  const { productId, price, cost, shippingCost, hasSoldOnEtsyOrShopify, monthlySalesOnOtherPlatforms, existingReviews, averageRating, odr, category } = req.body

  if (!productId) {
    return res.status(400).json({ error: true, message: 'productId is required' })
  }

  const selectionService = createSelectionService()
  const result = selectionService.evaluateProductForAmazon(productId, {
    price,
    cost,
    shippingCost,
    hasSoldOnEtsyOrShopify,
    monthlySalesOnOtherPlatforms,
    existingReviews,
    averageRating,
    odr,
    category,
  })

  res.json({ evaluation: result })
})

/**
 * Get products that pass all Amazon eligibility criteria.
 * GET /api/amazon/selection/approved
 */
amazonRouter.get('/selection/approved', (_req, res) => {
  const selectionService = createSelectionService()
  const approved = selectionService.getApprovedProducts()
  res.json({ products: approved })
})

/**
 * Get product eligibility score.
 * GET /api/amazon/selection/score/:productId
 */
amazonRouter.get('/selection/score/:productId', (req: any, res) => {
  const selectionService = createSelectionService()
  const score = selectionService.getProductScore(req.params.productId)
  if (score === null) {
    return res.status(404).json({ error: true, message: 'Product not found in eligibility records' })
  }
  res.json({ score })
})

// ─── Listings ─────────────────────────────────────────────────────────

/**
 * Create a new Amazon listing.
 * POST /api/amazon/listings
 */
amazonRouter.post('/listings', (req: any, res) => {
  const { productId, title, bullets, description, price, fulfillmentType, sku, category, variationTheme, parentAsin } = req.body

  if (!productId || !title || !bullets || !description) {
    return res.status(400).json({ error: true, message: 'productId, title, bullets, and description are required' })
  }

  const result = listingService.createListing({
    productId,
    title,
    bullets,
    description,
    price,
    fulfillmentType,
    sku,
    category,
    variationTheme,
    parentAsin,
  })

  if (result.errors.length > 0) {
    return res.status(400).json({ error: true, message: result.errors.join('; ') })
  }

  res.status(201).json({ listing: result.listing })
})

/**
 * Get all listings (optional ?status filter).
 * GET /api/amazon/listings
 */
amazonRouter.get('/listings', (req: any, res) => {
  const status = req.query.status as string | undefined
  const listings = listingService.getListings(status)
  res.json({ listings })
})

/**
 * Get a listing by ID.
 * GET /api/amazon/listings/:id
 */
amazonRouter.get('/listings/:id', (req: any, res) => {
  const listing = listingService.getListing(req.params.id)
  if (!listing) {
    return res.status(404).json({ error: true, message: 'Listing not found' })
  }
  res.json({ listing })
})

/**
 * Update a listing.
 * PATCH /api/amazon/listings/:id
 */
amazonRouter.patch('/listings/:id', (req: any, res) => {
  const { title, bullets, description, price, fulfillmentType, sku, category, variationTheme, parentAsin } = req.body

  const result = listingService.updateListing(req.params.id, {
    title,
    bullets,
    description,
    price,
    fulfillmentType,
    sku,
    category,
    variationTheme,
    parentAsin,
  })

  if (result.errors.length > 0) {
    return res.status(400).json({ error: true, message: result.errors.join('; ') })
  }

  res.json({ listing: result.listing })
})

/**
 * Delete a listing.
 * DELETE /api/amazon/listings/:id
 */
amazonRouter.delete('/listings/:id', (req: any, res) => {
  const deleted = listingService.deleteListing(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: true, message: 'Listing not found' })
  }
  res.status(204).end()
})

/**
 * Publish a listing to Amazon.
 * POST /api/amazon/listings/:id/publish
 */
amazonRouter.post('/listings/:id/publish', (req: any, res) => {
  const result = listingService.publishToAmazon(req.params.id)

  if (result.errors.length > 0) {
    return res.status(400).json({ error: true, message: result.errors.join('; ') })
  }

  res.json({ listing: result.listing })
})

// ─── Account Health ───────────────────────────────────────────────────

/**
 * Check account health based on provided metrics.
 * POST /api/amazon/health/check
 */
amazonRouter.post('/health/check', (req: any, res) => {
  const { odr, cancellationRate, lateShipmentRate, validTrackingRate } = req.body

  const metrics = accountHealthService.checkAccountHealth({
    odr: odr ?? 0,
    cancellationRate: cancellationRate ?? 0,
    lateShipmentRate: lateShipmentRate ?? 0,
    validTrackingRate: validTrackingRate ?? 1,
    overallHealth: 'good',
  })

  res.json({ metrics })
})

/**
 * Get account health score (0-100).
 * GET /api/amazon/health/score
 */
amazonRouter.get('/health/score', (req: any, res) => {
  const score = accountHealthService.getHealthScore()
  res.json({ health: score })
})

/**
 * Get recommended action plan based on account health.
 * GET /api/amazon/health/action-plan
 */
amazonRouter.get('/health/action-plan', (req: any, res) => {
  const plan = accountHealthService.getActionPlan()
  res.json({ actions: plan })
})

/**
 * Log an account health incident.
 * POST /api/amazon/health/incidents
 */
amazonRouter.post('/health/incidents', (req: any, res) => {
  const { type, severity, description, category } = req.body

  if (!type || !severity || !description) {
    return res.status(400).json({ error: true, message: 'type, severity, and description are required' })
  }

  const incident = accountHealthService.logIncident({
    type,
    severity,
    description,
    category,
    reportedAt: new Date().toISOString(),
    status: 'open',
  })

  res.status(201).json({ incident })
})

/**
 * Get all incidents.
 * GET /api/amazon/health/incidents
 */
amazonRouter.get('/health/incidents', (req: any, res) => {
  const status = req.query.status as string | undefined
  const incidents = status
    ? accountHealthService.getIncidentsByStatus(status as any)
    : accountHealthService.getIncidents()
  res.json({ incidents })
})

// ─── Amazon Ads ───────────────────────────────────────────────────────

/**
 * Create an Amazon advertising campaign.
 * POST /api/amazon/ads/campaigns
 */
amazonRouter.post('/ads/campaigns', (req: any, res) => {
  const { name, listingId, dailyBudget, startDate, campaignType, targetingType, bidStrategy, defaultBid, keywords } = req.body

  const result = adsService.createCampaign({
    name,
    listingId,
    dailyBudget,
    startDate,
    campaignType,
    targetingType,
    bidStrategy,
    defaultBid,
    keywords,
  })

  if (result.errors.length > 0) {
    return res.status(400).json({ error: true, message: result.errors.join('; ') })
  }

  res.status(201).json({ campaign: result.campaign })
})

/**
 * Get all campaigns.
 * GET /api/amazon/ads/campaigns
 */
amazonRouter.get('/ads/campaigns', (_req, res) => {
  const campaigns = adsService.getCampaigns()
  res.json({ campaigns })
})

/**
 * Get campaign by ID.
 * GET /api/amazon/ads/campaigns/:id
 */
amazonRouter.get('/ads/campaigns/:id', (req: any, res) => {
  const campaign = adsService.getCampaign(req.params.id)
  if (!campaign) {
    return res.status(404).json({ error: true, message: 'Campaign not found' })
  }
  res.json({ campaign })
})

/**
 * Update campaign status.
 * PATCH /api/amazon/ads/campaigns/:id/status
 */
amazonRouter.patch('/ads/campaigns/:id/status', (req: any, res) => {
  const { status } = req.body
  if (!status) {
    return res.status(400).json({ error: true, message: 'status is required' })
  }

  const updated = adsService.updateCampaignStatus(req.params.id, status)
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Campaign not found' })
  }

  const campaign = adsService.getCampaign(req.params.id)
  res.json({ campaign })
})

/**
 * Get recommended keywords for a listing.
 * POST /api/amazon/ads/keywords
 */
amazonRouter.post('/ads/keywords', (req: any, res) => {
  const { listingTitle, listingBullets, category } = req.body

  if (!listingTitle) {
    return res.status(400).json({ error: true, message: 'listingTitle is required' })
  }

  const keywords = adsService.getRecommendedKeywords(listingTitle, listingBullets ?? [], category)
  res.json({ keywords })
})

/**
 * Track campaign performance.
 * POST /api/amazon/ads/campaigns/:id/performance
 */
amazonRouter.post('/ads/campaigns/:id/performance', (req: any, res) => {
  const { impressions, clicks, spend, sales, orders, acos, tacos, ctr, conversionRate, roas } = req.body

  const performance = adsService.trackPerformance(req.params.id, {
    campaignId: req.params.id,
    impressions: impressions ?? 0,
    clicks: clicks ?? 0,
    spend: spend ?? 0,
    sales: sales ?? 0,
    orders: orders ?? 0,
    acos: acos ?? 0,
    tacos: tacos ?? 0,
    ctr: ctr ?? 0,
    conversionRate: conversionRate ?? 0,
    roas: roas ?? 0,
  })

  if (!performance) {
    return res.status(404).json({ error: true, message: 'Campaign not found' })
  }

  res.json({ performance })
})

/**
 * Get campaign performance.
 * GET /api/amazon/ads/campaigns/:id/performance
 */
amazonRouter.get('/ads/campaigns/:id/performance', (req: any, res) => {
  const performance = adsService.getCampaignPerformance(req.params.id)
  if (!performance) {
    return res.status(404).json({ error: true, message: 'No performance data for this campaign' })
  }
  res.json({ performance })
})
