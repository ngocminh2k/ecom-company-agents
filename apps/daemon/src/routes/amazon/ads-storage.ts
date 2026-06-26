/**
 * Amazon Ads Storage (SQLite) — extracted from amazon.ts
 */
import { getDb } from '../../db.js'
import type { AmazonAdsStorage, AmazonCampaign, CampaignPerformance } from '@ngocminh2k/ecommerce-core'

function rowToCampaign(row: any): AmazonCampaign {
  return {
    id: row.id, name: row.name, listingId: row.listing_id, dailyBudget: row.daily_budget,
    startDate: row.start_date, campaignType: row.campaign_type, targetingType: row.targeting_type,
    bidStrategy: row.bid_strategy, defaultBid: row.default_bid, status: row.status,
    keywords: typeof row.keywords === 'string' ? JSON.parse(row.keywords) : (row.keywords || []),
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export function createAdsStorage(): AmazonAdsStorage {
  return {
    createCampaign(campaign: AmazonCampaign): AmazonCampaign {
      const db = getDb()
      db.prepare(`INSERT INTO amazon_campaigns (id, name, listing_id, daily_budget, start_date, campaign_type, targeting_type, bid_strategy, default_bid, status, keywords, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        campaign.id, campaign.name, campaign.listingId, campaign.dailyBudget, campaign.startDate,
        campaign.campaignType, campaign.targetingType, campaign.bidStrategy, campaign.defaultBid,
        campaign.status, JSON.stringify(campaign.keywords), campaign.createdAt, campaign.updatedAt)
      return campaign
    },
    getCampaign(id: string): AmazonCampaign | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_campaigns WHERE id = ?').get(id) as any
      return row ? rowToCampaign(row) : undefined
    },
    getCampaigns(): AmazonCampaign[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM amazon_campaigns ORDER BY created_at DESC').all() as any[]).map(rowToCampaign)
    },
    updateCampaign(id: string, updates: Partial<AmazonCampaign>): AmazonCampaign | undefined {
      const db = getDb()
      const existing = db.prepare('SELECT * FROM amazon_campaigns WHERE id = ?').get(id) as any
      if (!existing) return undefined
      const fields: string[] = []; const values: any[] = []
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
      if (!db.prepare('SELECT id FROM amazon_campaigns WHERE id = ?').get(campaignId)) return null
      const now = new Date().toISOString()
      const existing = db.prepare('SELECT id FROM amazon_campaign_performance WHERE campaign_id = ?').get(campaignId) as any
      if (existing) {
        db.prepare(`UPDATE amazon_campaign_performance SET impressions=?, clicks=?, spend=?, sales=?, orders=?, acos=?, tacos=?, ctr=?, conversion_rate=?, roas=?, updated_at=? WHERE campaign_id=?`).run(
          performance.impressions, performance.clicks, performance.spend, performance.sales, performance.orders,
          performance.acos, performance.tacos, performance.ctr, performance.conversionRate, performance.roas, now, campaignId)
      } else {
        db.prepare(`INSERT INTO amazon_campaign_performance (id, campaign_id, impressions, clicks, spend, sales, orders, acos, tacos, ctr, conversion_rate, roas, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
          `perf-${campaignId}`, campaignId, performance.impressions, performance.clicks, performance.spend,
          performance.sales, performance.orders, performance.acos, performance.tacos, performance.ctr,
          performance.conversionRate, performance.roas, now, now)
      }
      return performance
    },
    getCampaignPerformance(campaignId: string): CampaignPerformance | null {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_campaign_performance WHERE campaign_id = ?').get(campaignId) as any
      if (!row) return null
      return { campaignId: row.campaign_id, impressions: row.impressions, clicks: row.clicks, spend: row.spend, sales: row.sales, orders: row.orders, acos: row.acos, tacos: row.tacos, ctr: row.ctr, conversionRate: row.conversion_rate, roas: row.roas }
    },
  }
}
