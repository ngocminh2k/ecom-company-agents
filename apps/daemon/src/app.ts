/**
 * ECC Daemon — Express app factory.
 * Wires middleware, routes, and starts the daemon.
 */
import express, { type Express } from 'express'
import cors from 'cors'
import { getConfig } from './config.js'
import { AgentAdapterPool, AgentRouterService } from '@ngocminh2k/agent-adapter'
import { RoutingMatrix, createDefaultRoutingRules } from '@ngocminh2k/agent-adapter'

// Route imports
import { healthRouter } from './routes/health.js'
import { agentsRouter } from './routes/agents.js'
import { skillsRouter } from './routes/skills.js'
import { pluginsRouter } from './routes/plugins.js'
import { designSystemsRouter } from './routes/design-systems.js'
import { artifactsRouter } from './routes/artifacts.js'
import { productsRouter } from './routes/products.js'
import { ordersRouter } from './routes/orders.js'
import { campaignsRouter } from './routes/campaigns.js'
import { ecommerceRouter } from './routes/ecommerce.js'
import { amazonRouter } from './routes/amazon.js'
import { etsyRouter } from './routes/etsy.js'
import { shopifyRouter } from './routes/shopify.js'
import { fulfillmentRouter, qcRouter, vendorsRouter } from './routes/fulfillment.js'
import { supportRouter } from './routes/support.js'
import { financeRouter } from './routes/finance.js'
import { productResearchRouter } from './routes/product-research.js'
import { orchestrationRouter } from './routes/orchestration.js'
import { biRouter } from './routes/bi.js'
import { chatRouter } from './routes/chat.js'
import { conversationsRouter } from './routes/conversations.js'
import { proxyRouter } from './routes/proxy.js'

export interface DaemonContext {
  pool: AgentAdapterPool
  routingMatrix: RoutingMatrix
  agentRouter: AgentRouterService
  config: ReturnType<typeof getConfig>
}

export function createApp(context: DaemonContext): Express {
  const app = express()
  const config = context.config

  // Middleware
  app.use(express.json({ limit: '10mb' }))

  // CORS (only if explicitly enabled — local-first security)
  if (config.CORS_ENABLED) {
    app.use(cors({
      origin: config.ALLOWED_ORIGINS.split(',').map((s) => s.trim()),
      credentials: true,
    }))
  }

  // Inject context into request
  app.use((req: any, _res, next) => {
    req.daemonContext = context
    next()
  })

  // Routes
  app.use('/api/health', healthRouter)
  app.use('/api/agents', agentsRouter)
  app.use('/api/skills', skillsRouter)
  app.use('/api/plugins', pluginsRouter)
  app.use('/api/design-systems', designSystemsRouter)
  app.use('/api/artifacts', artifactsRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/campaigns', campaignsRouter)
  app.use('/api/ecommerce', ecommerceRouter)
  app.use('/api/amazon', amazonRouter)
  app.use('/api/etsy/listings', etsyRouter)
  app.use('/api/shopify', shopifyRouter)
  app.use('/api/fulfillment', fulfillmentRouter)
  app.use('/api/quality-check', qcRouter)
  app.use('/api/vendors', vendorsRouter)
  app.use('/api/support', supportRouter)
  app.use('/api/finance', financeRouter)
  app.use('/api/product-research', productResearchRouter)
  app.use('/api/orchestration', orchestrationRouter)
  app.use('/api/bi', biRouter)
  app.use('/api/chat', chatRouter)
  app.use('/api/conversations', conversationsRouter)
  app.use('/api/proxy', proxyRouter)

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Error]', err.message)
    res.status(500).json({
      error: true,
      message: err.message,
    })
  })

  return app
}
