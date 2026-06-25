/**
 * ECC Daemon — Express app factory.
 * Wires middleware, routes, and starts the daemon.
 */
import express from 'express'
import cors from 'cors'
import { getConfig } from './config.js'
import { AgentAdapterPool } from '@ecc/agent-adapter'
import { MockAdapter, ClaudeCodeAdapter } from '@ecc/agent-adapter'
import { RoutingMatrix, createDefaultRoutingRules } from '@ecc/agent-adapter'

// Route imports
import { healthRouter } from './routes/health.js'
import { agentsRouter } from './routes/agents.js'
import { skillsRouter } from './routes/skills.js'
import { pluginsRouter } from './routes/plugins.js'
import { artifactsRouter } from './routes/artifacts.js'
import { productsRouter } from './routes/products.js'
import { ordersRouter } from './routes/orders.js'
import { campaignsRouter } from './routes/campaigns.js'
import { ecommerceRouter } from './routes/ecommerce.js'

export interface DaemonContext {
  pool: AgentAdapterPool
  routingMatrix: RoutingMatrix
  config: ReturnType<typeof getConfig>
}

export function createApp(context: DaemonContext) {
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
  app.use('/api/artifacts', artifactsRouter)
  app.use('/api/products', productsRouter)
  app.use('/api/orders', ordersRouter)
  app.use('/api/campaigns', campaignsRouter)
  app.use('/api/ecommerce', ecommerceRouter)

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
