/**
 * ECC Daemon — Shopify Channel Routes
 *
 * RESTful API for Shopify products, pre-ads audit, CRO suggestions, and CRO test logs.
 */

import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { ShopifyService, CroService } from '@ngocminh2k/ecommerce-core'

export const shopifyRouter: RouterType = Router()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getShopifyService(): ShopifyService {
  return new ShopifyService(getDb())
}

function getCroService(): CroService {
  return new CroService(getDb())
}

// ─── Shopify Products CRUD ───────────────────────────────────────────────────

// List products
shopifyRouter.get('/products', (_req: any, res: any) => {
  const service = getShopifyService()
  const products = service.listProducts()
  res.json({ products })
})

// Create product
shopifyRouter.post('/products', (req: any, res: any) => {
  const service = getShopifyService()
  const result = service.createProduct(req.body)
  const status = result.validation.valid ? 201 : 422
  res.status(status).json(result)
})

// Get product by id
shopifyRouter.get('/products/:id', (req: any, res: any) => {
  const service = getShopifyService()
  const product = service.getProduct(req.params.id)
  if (!product) {
    return res.status(404).json({ error: true, message: 'Shopify product not found' })
  }
  res.json({ product })
})

// Update product
shopifyRouter.patch('/products/:id', (req: any, res: any) => {
  const service = getShopifyService()
  const result = service.updateProduct(req.params.id, req.body)
  if (!result) {
    return res.status(404).json({ error: true, message: 'Shopify product not found' })
  }
  const status = result.validation.valid ? 200 : 422
  res.status(status).json(result)
})

// Delete product
shopifyRouter.delete('/products/:id', (req: any, res: any) => {
  const service = getShopifyService()
  const deleted = service.deleteProduct(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: true, message: 'Shopify product not found' })
  }
  res.json({ success: true })
})

// Pre-ads audit
shopifyRouter.get('/products/:id/pre-ads-audit', (req: any, res: any) => {
  const service = getShopifyService()
  const audit = service.getPreAdsAudit(req.params.id)
  if (!audit) {
    return res.status(404).json({ error: true, message: 'Shopify product not found' })
  }
  res.json({ preAdsAudit: audit })
})

// CRO suggestions
shopifyRouter.get('/products/:id/cro-suggestions', (req: any, res: any) => {
  const service = getShopifyService()
  const suggestions = service.getCroSuggestionsForProduct(req.params.id)
  if (!suggestions) {
    return res.status(404).json({ error: true, message: 'Shopify product not found' })
  }
  res.json({ suggestions })
})

// ─── CRO Test Logs ───────────────────────────────────────────────────────────

// List all CRO tests (optionally filter by product)
shopifyRouter.get('/cro-tests', (req: any, res: any) => {
  const service = getCroService()
  const productId = req.query.productId as string | undefined
  const tests = productId
    ? service.listTestsByProduct(productId)
    : service.listAllTests()
  res.json({ croTests: tests })
})

// Create CRO test
shopifyRouter.post('/cro-tests', (req: any, res: any) => {
  const service = getCroService()
  try {
    const test = service.createTest(req.body)
    res.status(201).json({ croTest: test })
  } catch (e: any) {
    res.status(422).json({ error: true, message: e.message })
  }
})

// Get CRO test
shopifyRouter.get('/cro-tests/:id', (req: any, res: any) => {
  const service = getCroService()
  const test = service.getTest(req.params.id)
  if (!test) {
    return res.status(404).json({ error: true, message: 'CRO test not found' })
  }
  res.json({ croTest: test })
})

// Update CRO test
shopifyRouter.patch('/cro-tests/:id', (req: any, res: any) => {
  const service = getCroService()
  const test = service.updateTest(req.params.id, req.body)
  if (!test) {
    return res.status(404).json({ error: true, message: 'CRO test not found' })
  }
  res.json({ croTest: test })
})

// Delete CRO test
shopifyRouter.delete('/cro-tests/:id', (req: any, res: any) => {
  const service = getCroService()
  const deleted = service.deleteTest(req.params.id)
  if (!deleted) {
    return res.status(404).json({ error: true, message: 'CRO test not found' })
  }
  res.json({ success: true })
})
