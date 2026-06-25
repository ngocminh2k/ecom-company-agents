import { Router, type Router as RouterType } from 'express'
import type { DaemonContext } from '../app.js'

export const agentsRouter: RouterType = Router()

// List all available agents
agentsRouter.get('/', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const detections = await ctx.pool.detectAll()
  const status = ctx.pool.getStatus()

  const agents = status.available.map((a) => ({
    ...a,
    detected: detections.get(a.id) !== null,
    version: detections.get(a.id)?.version,
  }))

  res.json({ agents, running: status.running })
})

// Get agent-to-agent routing matrix
agentsRouter.get('/routing', (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  res.json({
    rules: ctx.routingMatrix.toJSON(),
    matrix: Array.from(ctx.routingMatrix.toMatrix().entries()).map(([key, rules]) => ({
      key,
      rules,
    })),
  })
})

// Get agent capabilities
agentsRouter.get('/:agentId/capabilities', (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const agent = ctx.pool.get(req.params.agentId)
  if (!agent) {
    return res.status(404).json({ error: true, message: 'Agent not found' })
  }
  res.json({
    id: agent.id,
    name: agent.name,
    capabilities: agent.capabilities(),
    canHandle: ctx.routingMatrix.getAgentCapabilities(agent.id),
  })
})
