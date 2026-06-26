import { Router, type Router as RouterType } from 'express'
import type { DaemonContext } from '../app.js'
import { scanAgentPersonalities } from '@ngocminh2k/agent-adapter'
import { join } from 'node:path'
import { MONOREPO_ROOT } from '../config.js'

export const agentsRouter: RouterType = Router()

// List all available agents (adapters + personalities)
agentsRouter.get('/', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const detections = await ctx.pool.detectAll()
  const status = ctx.pool.getStatus()

  const adapters = status.available.map((a) => ({
    ...a,
    detected: detections.get(a.id) !== null,
    version: detections.get(a.id)?.version,
    type: 'adapter' as const,
  }))

  // Load personalities (resolve from monorepo root, not process.cwd())
  const personalities = scanAgentPersonalities(join(MONOREPO_ROOT, 'agents'))
  const byDivision: Record<string, typeof personalities> = {}
  for (const p of personalities) {
    if (!byDivision[p.division]) byDivision[p.division] = []
    byDivision[p.division].push(p)
  }

  res.json({
    adapters,
    personalities: {
      total: personalities.length,
      divisions: Object.keys(byDivision).length,
      byDivision: Object.entries(byDivision).map(([division, agents]) => ({
        division,
        count: agents.length,
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          color: a.color,
        })),
      })),
    },
    running: status.running,
  })
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

// Get specific agent capabilities
agentsRouter.get('/:agentId/capabilities', (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  // Check adapters first
  const adapter = ctx.pool.get(req.params.agentId)
  if (adapter) {
    return res.json({
      id: adapter.id,
      name: adapter.name,
      type: 'adapter',
      capabilities: adapter.capabilities(),
      canHandle: ctx.routingMatrix.getAgentCapabilities(adapter.id),
    })
  }

  // Check personalities (resolve from monorepo root)
  const personalities = scanAgentPersonalities(join(MONOREPO_ROOT, 'agents'))
  const personality = personalities.find((p) => p.id === req.params.agentId)
  if (personality) {
    return res.json({
      id: personality.id,
      name: personality.name,
      type: 'personality',
      division: personality.division,
      description: personality.description,
      color: personality.color,
      frontmatter: personality.frontmatter,
    })
  }

  res.status(404).json({ error: true, message: 'Agent not found' })
})
