import type {
  AgentAdapter,
  AgentPoolConfig,
  AgentPoolStatus,
  AgentDetection,
} from './types.js'

/**
 * Central registry for all agent adapters.
 * Discovers available CLIs, dispatches runs, and manages lifecycle.
 */
export class AgentAdapterPool {
  private adapters: Map<string, AgentAdapter> = new Map()
  private running: Map<string, { runId: string; agentId: string; startedAt: string }> = new Map()
  private config: AgentPoolConfig

  constructor(config: Partial<AgentPoolConfig> = {}) {
    this.config = {
      skillDirectories: config.skillDirectories ?? ['./skills'],
      designSystemDirectories: config.designSystemDirectories ?? ['./design-systems'],
      defaultTimeoutMs: config.defaultTimeoutMs ?? 300_000,
      artifactsDir: config.artifactsDir ?? './data/artifacts',
    }
  }

  /** Register an adapter (called at startup) */
  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.id, adapter)
  }

  /** Get a registered adapter by id */
  get(id: string): AgentAdapter | undefined {
    return this.adapters.get(id)
  }

  /** List all registered adapters */
  list(): AgentAdapter[] {
    return Array.from(this.adapters.values())
  }

  /** Detect available agents on this machine */
  async detectAll(): Promise<Map<string, AgentDetection | null>> {
    const results = new Map<string, AgentDetection | null>()
    for (const [id, adapter] of this.adapters) {
      results.set(id, await adapter.detect())
    }
    return results
  }

  /**
   * Find the best adapter for a given task type.
   * Uses the routing matrix for agent-to-agent delegation.
   */
  async resolveForTask(taskType: string, preferredAgentId?: string): Promise<AgentAdapter | null> {
    if (preferredAgentId) {
      const adapter = this.adapters.get(preferredAgentId)
      if (adapter) {
        const detection = await adapter.detect()
        if (detection) return adapter
      }
    }

    // Fallback: try each adapter in registration order
    for (const [, adapter] of this.adapters) {
      const detection = await adapter.detect()
      if (detection) return adapter
    }

    return null
  }

  /** Track a running agent session */
  trackRun(runId: string, agentId: string): void {
    this.running.set(runId, {
      runId,
      agentId,
      startedAt: new Date().toISOString(),
    })
  }

  /** Untrack a completed/cancelled run */
  untrackRun(runId: string): void {
    this.running.delete(runId)
  }

  /** Get pool status */
  getStatus(): AgentPoolStatus {
    return {
      available: this.list().map((a) => ({
        id: a.id,
        name: a.name,
        detected: false, // lazy — call detectAll() to populate
        capabilities: a.capabilities(),
      })),
      running: Array.from(this.running.values()).map((r) => ({
        ...r,
        status: 'running' as const,
      })),
    }
  }
}
