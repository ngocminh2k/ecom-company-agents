/**
 * ECC Daemon — Entry point.
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getConfig, loadConfig, MONOREPO_ROOT } from './config.js'
import { getDb, closeDb } from './db.js'
import { createApp, type DaemonContext } from './app.js'
import { AgentAdapterPool, MockAdapter, ClaudeCodeAdapter, RoutingMatrix, createDefaultRoutingRules, scanAgentPersonalities, AgentRouterService } from '@ngocminh2k/agent-adapter'

async function main() {
  const config = loadConfig()

  console.log(`
╔══════════════════════════════════════╗
║   ECC OmniStudio Daemon v0.1.0       ║
║   AI Agent Harness for E-Commerce     ║
╚══════════════════════════════════════╝
`)

  // Initialize database
  const db = getDb()
  console.log(`[DB] Connected: ${config.DATABASE_PATH}`)

  // Initialize agent adapter pool
  const pool = new AgentAdapterPool({
    skillDirectories: [config.SKILLS_DIR],
    designSystemDirectories: [config.DESIGN_SYSTEMS_DIR],
    defaultTimeoutMs: 300_000,
    artifactsDir: config.ARTIFACTS_DIR,
  })

  // Register adapters
  pool.register(new MockAdapter())

  const claudeAdapter = new ClaudeCodeAdapter()
  const claudeDetected = await claudeAdapter.detect()
  if (claudeDetected) {
    pool.register(claudeAdapter)
    console.log(`[Agent] Claude Code detected: v${claudeDetected.version}`)
  } else {
    console.log('[Agent] Claude Code not detected (optional)')
  }

  // Initialize agent-to-agent routing matrix
  const routingMatrix = new RoutingMatrix(createDefaultRoutingRules())
  console.log(`[Router] ${routingMatrix.toJSON().length} routing rules loaded`)

  // Load agent personalities (resolve relative to monorepo root via config)
  const agentsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'agents')
  const personalities = scanAgentPersonalities(agentsDir)
  console.log(`[Agents] ${personalities.length} agent personalities loaded (${new Set(personalities.map(p => p.division)).size} divisions)`)
  console.log(`[Agents] Path: ${agentsDir}`)

  // Initialize Agent Router Service (bridges skills ↔ routing matrix ↔ adapter pool)
  const agentRouter = new AgentRouterService(pool, routingMatrix, {
    cwd: MONOREPO_ROOT,
    defaultTimeoutMs: 300_000,
    skillDirectories: [config.SKILLS_DIR],
    designSystemDirectories: [config.DESIGN_SYSTEMS_DIR],
    allowMockFallback: !claudeDetected,
  })
  console.log(`[Router] Agent router service initialized (mock fallback: ${!claudeDetected})`)

  // Create context
  const context: DaemonContext = {
    pool,
    routingMatrix,
    agentRouter,
    config,
  }

  // Create and start app
  const app = createApp(context)

  app.listen(config.PORT, config.BIND_HOST, () => {
    console.log(`[Daemon] Listening on http://${config.BIND_HOST}:${config.PORT}`)
    console.log(`[Daemon] Skills: ${config.SKILLS_DIR}`)
    console.log(`[Daemon] Design Systems: ${config.DESIGN_SYSTEMS_DIR}`)
    console.log(`[Daemon] Artifacts: ${config.ARTIFACTS_DIR}`)
    console.log('')
  })
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Daemon] Shutting down...')
  closeDb()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n[Daemon] Shutting down...')
  closeDb()
  process.exit(0)
})

main().catch((err) => {
  console.error('[Fatal]', err)
  process.exit(1)
})
