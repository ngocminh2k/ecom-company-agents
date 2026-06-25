import { Router, type Router as RouterType } from 'express'
import type { DaemonContext } from '../app.js'
import type { TaskRunner } from '@ngocminh2k/ecommerce-core'
import {
  PodProductDesigner, PrintProvider,
  ProductResearchService, SupplierImportService, OrderProcessorService,
  CampaignCreatorService, AdCreativeGenService,
  AnalyticsService,
} from '@ngocminh2k/ecommerce-core'

export const ecommerceRouter: RouterType = Router()

/**
 * Factory to create e-commerce services with injected TaskRunner.
 * Each request gets fresh service instances wired to the AgentRouterService.
 */
function createServices(ctx: DaemonContext) {
  const runner: TaskRunner = {
    routeTask: (taskType, taskInput, options) =>
      ctx.agentRouter.routeTask(taskType, taskInput, {
        outputSchema: options?.outputSchema,
        timeoutMs: options?.timeoutMs,
      }),
  }

  return {
    podDesigner: new PodProductDesigner(runner),
    printProvider: new PrintProvider(runner),
    productResearch: new ProductResearchService(runner),
    supplierImport: new SupplierImportService(runner),
    orderProcessor: new OrderProcessorService(runner),
    campaignCreator: new CampaignCreatorService(runner),
    adCreative: new AdCreativeGenService(runner),
    analytics: new AnalyticsService(runner),
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────
ecommerceRouter.get('/summary', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { analytics } = createServices(ctx)
  const report = await analytics.generateReport('monthly')
  res.json({
    summary: {
      revenue: report.revenue.total,
      orders: report.orders.count,
      aov: report.orders.aov,
      conversionRate: report.orders.conversionRate,
      adSpend: report.ads.spend,
      adRevenue: report.ads.revenue,
      roas: report.ads.roas,
      customers: report.customers.new + report.customers.returning,
    },
  })
})

// ─── POD ────────────────────────────────────────────────────────────
ecommerceRouter.post('/pod/design', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { podDesigner } = createServices(ctx)
  const { productType, designBrief, brand, colors, placement } = req.body
  if (!productType || !designBrief) {
    return res.status(400).json({ error: true, message: 'productType and designBrief required' })
  }
  const result = await podDesigner.designProduct({ productType, designBrief, brand, colors, placement })
  res.json({ mockup: result })
})

ecommerceRouter.get('/pod/catalog', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { printProvider } = createServices(ctx)
  const catalog = await printProvider.getProductCatalog('printful')
  res.json({ products: catalog })
})

ecommerceRouter.post('/pod/design/svg', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { podDesigner } = createServices(ctx)
  const { productType, designBrief } = req.body
  const svg = await podDesigner.generateSvgDesign(productType ?? 'tshirt', designBrief ?? 'Design')
  res.type('image/svg+xml').send(svg)
})

// ─── Dropshipping ──────────────────────────────────────────────────
ecommerceRouter.post('/dropshipping/research', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { productResearch } = createServices(ctx)
  const { niche, minPrice, maxPrice } = req.body
  if (!niche) {
    return res.status(400).json({ error: true, message: 'niche is required' })
  }
  const recommendations = await productResearch.research({ niche, minPrice, maxPrice })
  res.json({ recommendations })
})

ecommerceRouter.post('/dropshipping/suppliers/search', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { supplierImport } = createServices(ctx)
  const { query } = req.body
  if (!query) return res.status(400).json({ error: true, message: 'query is required' })
  const suppliers = await supplierImport.searchSuppliers(query)
  res.json({ suppliers })
})

ecommerceRouter.post('/dropshipping/orders', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { orderProcessor } = createServices(ctx)
  const { productId, quantity, shippingAddress, customerEmail } = req.body
  if (!productId || !shippingAddress) {
    return res.status(400).json({ error: true, message: 'productId and shippingAddress required' })
  }
  const order = await orderProcessor.processOrder({ productId, quantity: quantity ?? 1, shippingAddress, customerEmail })
  res.status(201).json({ order })
})

// ─── Marketing ─────────────────────────────────────────────────────
ecommerceRouter.post('/marketing/campaigns/plan', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { campaignCreator } = createServices(ctx)
  const { name, platform, productIds, budget, objective, targetAudience } = req.body
  if (!name || !platform || !budget) {
    return res.status(400).json({ error: true, message: 'name, platform, and budget required' })
  }
  const plan = await campaignCreator.planCampaign({ name, platform, productIds, budget, objective, targetAudience })
  res.json({ campaign: plan })
})

ecommerceRouter.post('/marketing/creatives/generate', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { adCreative } = createServices(ctx)
  const { platform, productName, description } = req.body
  if (!platform || !productName) {
    return res.status(400).json({ error: true, message: 'platform and productName required' })
  }
  const creative = await adCreative.generateCreative(platform, productName, description)
  res.json({ creative })
})

// ─── Analytics ─────────────────────────────────────────────────────
ecommerceRouter.get('/analytics/report', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { analytics } = createServices(ctx)
  const period = (req.query.period as string) ?? 'monthly'
  const report = await analytics.generateReport(period)
  res.json({ report })
})

ecommerceRouter.get('/analytics/top-products', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const { analytics } = createServices(ctx)
  const report = await analytics.generateReport('monthly')
  res.json({ products: report.topProducts })
})
