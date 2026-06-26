/**
 * Amazon Listing Routes — selection + listing CRUD + publish
 */
import { Router, type Router as RouterType } from 'express'
import { createListingStorage } from './storage.js'
import { AmazonListingService, AmazonSelectionService } from '@ngocminh2k/ecommerce-core'

export const listingsRouter: RouterType = Router()

const listingStorage = createListingStorage()
const listingService = new AmazonListingService(listingStorage)

// ─── Selection ─────────────────────────────────────────

listingsRouter.post('/selection/evaluate', (req: any, res) => {
  const { productId, price, cost, shippingCost, hasSoldOnEtsyOrShopify, monthlySalesOnOtherPlatforms, existingReviews, averageRating, odr, category } = req.body
  if (!productId) return res.status(400).json({ error: true, message: 'productId is required' })
  const s = new AmazonSelectionService()
  const result = s.evaluateProductForAmazon(productId, { price, cost, shippingCost, hasSoldOnEtsyOrShopify, monthlySalesOnOtherPlatforms, existingReviews, averageRating, odr, category })
  res.json({ evaluation: result })
})

listingsRouter.get('/selection/approved', (_req, res) => {
  const s = new AmazonSelectionService()
  res.json({ products: s.getApprovedProducts() })
})

listingsRouter.get('/selection/score/:productId', (req: any, res) => {
  const s = new AmazonSelectionService()
  const score = s.getProductScore(req.params.productId)
  if (score === null) return res.status(404).json({ error: true, message: 'Product not found in eligibility records' })
  res.json({ score })
})

// ─── CRUD ──────────────────────────────────────────────

listingsRouter.post('/listings', (req: any, res) => {
  const { productId, title, bullets, description, price, fulfillmentType, sku, category, variationTheme, parentAsin } = req.body
  if (!productId || !title || !bullets || !description) return res.status(400).json({ error: true, message: 'productId, title, bullets, and description are required' })
  const result = listingService.createListing({ productId, title, bullets, description, price, fulfillmentType, sku, category, variationTheme, parentAsin })
  if (result.errors.length > 0) return res.status(400).json({ error: true, message: result.errors.join('; ') })
  res.status(201).json({ listing: result.listing })
})

listingsRouter.get('/listings', (req: any, res) => {
  const status = req.query.status as string | undefined
  res.json({ listings: listingService.getListings(status) })
})

listingsRouter.get('/listings/:id', (req: any, res) => {
  const listing = listingService.getListing(req.params.id)
  if (!listing) return res.status(404).json({ error: true, message: 'Listing not found' })
  res.json({ listing })
})

listingsRouter.patch('/listings/:id', (req: any, res) => {
  const { title, bullets, description, price, fulfillmentType, sku, category, variationTheme, parentAsin } = req.body
  const result = listingService.updateListing(req.params.id, { title, bullets, description, price, fulfillmentType, sku, category, variationTheme, parentAsin })
  if (result.errors.length > 0) return res.status(400).json({ error: true, message: result.errors.join('; ') })
  res.json({ listing: result.listing })
})

listingsRouter.delete('/listings/:id', (req: any, res) => {
  if (!listingService.deleteListing(req.params.id)) return res.status(404).json({ error: true, message: 'Listing not found' })
  res.status(204).end()
})

listingsRouter.post('/listings/:id/publish', (req: any, res) => {
  const result = listingService.publishToAmazon(req.params.id)
  if (result.errors.length > 0) return res.status(400).json({ error: true, message: result.errors.join('; ') })
  res.json({ listing: result.listing })
})
