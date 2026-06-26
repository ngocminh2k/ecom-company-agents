/**
 * Amazon Ads Routes — campaigns + keywords + performance
 */
import { Router, type Router as RouterType } from 'express'
import { createAdsStorage } from './ads-storage.js'
import { AmazonAdsService } from '@ngocminh2k/ecommerce-core'

export const adsRouter: RouterType = Router()

const storage = createAdsStorage()
const service = new AmazonAdsService(storage)

adsRouter.post('/ads/campaigns', (req: any, res) => {
  const { name, listingId, dailyBudget, startDate, campaignType, targetingType, bidStrategy, defaultBid, keywords } = req.body
  const result = service.createCampaign({ name, listingId, dailyBudget, startDate, campaignType, targetingType, bidStrategy, defaultBid, keywords })
  if (result.errors.length > 0) return res.status(400).json({ error: true, message: result.errors.join('; ') })
  res.status(201).json({ campaign: result.campaign })
})

adsRouter.get('/ads/campaigns', (_req, res) => res.json({ campaigns: service.getCampaigns() }))

adsRouter.get('/ads/campaigns/:id', (req: any, res) => {
  const campaign = service.getCampaign(req.params.id)
  if (!campaign) return res.status(404).json({ error: true, message: 'Campaign not found' })
  res.json({ campaign })
})

adsRouter.patch('/ads/campaigns/:id/status', (req: any, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ error: true, message: 'status is required' })
  if (!service.updateCampaignStatus(req.params.id, status)) return res.status(404).json({ error: true, message: 'Campaign not found' })
  res.json({ campaign: service.getCampaign(req.params.id) })
})

adsRouter.post('/ads/keywords', (req: any, res) => {
  const { listingTitle, listingBullets, category } = req.body
  if (!listingTitle) return res.status(400).json({ error: true, message: 'listingTitle is required' })
  res.json({ keywords: service.getRecommendedKeywords(listingTitle, listingBullets ?? [], category) })
})

adsRouter.post('/ads/campaigns/:id/performance', (req: any, res) => {
  const { impressions, clicks, spend, sales, orders, acos, tacos, ctr, conversionRate, roas } = req.body
  const perf = service.trackPerformance(req.params.id, { campaignId: req.params.id, impressions: impressions ?? 0, clicks: clicks ?? 0, spend: spend ?? 0, sales: sales ?? 0, orders: orders ?? 0, acos: acos ?? 0, tacos: tacos ?? 0, ctr: ctr ?? 0, conversionRate: conversionRate ?? 0, roas: roas ?? 0 })
  if (!perf) return res.status(404).json({ error: true, message: 'Campaign not found' })
  res.json({ performance: perf })
})

adsRouter.get('/ads/campaigns/:id/performance', (req: any, res) => {
  const perf = service.getCampaignPerformance(req.params.id)
  if (!perf) return res.status(404).json({ error: true, message: 'No performance data for this campaign' })
  res.json({ performance: perf })
})
