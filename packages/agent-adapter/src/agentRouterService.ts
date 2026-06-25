/**
 * AgentRouterService — the core orchestration bridge.
 *
 * Ties together RoutingMatrix + AgentAdapterPool + SkillExecutor to dispatch
 * real AI agent tasks using CLI agents already on the user's machine.
 *
 * Flow:
 *   resolve routing rules → find adapter → build prompt → run agent → aggregate output
 */
import type { AgentAdapterPool } from './adapterPool.js'
import type { RoutingMatrix } from './routingMatrix.js'
import type { AgentAdapter, AgentRunParams, AgentEvent } from './types.js'
import { randomUUID } from 'node:crypto'

export interface AgentRouterConfig {
  /** Default working directory for agent runs */
  cwd: string
  /** Default timeout in ms */
  defaultTimeoutMs: number
  /** Default skill directories to pass to agents */
  skillDirectories: string[]
  /** Default design system directories */
  designSystemDirectories: string[]
  /** Whether to fall back to MockAdapter when no real CLI detected */
  allowMockFallback: boolean
}

export interface RouteTaskResult {
  runId: string
  output: string
  events: AgentEvent[]
  agentId: string
  durationMs: number
  error?: string
}

export interface RouteTaskOptions {
  /** Preferred agent ID (optional) */
  preferredAgentId?: string
  /** Input values for the skill/request */
  inputs?: Record<string, unknown>
  /** If true, return a streaming response */
  stream?: boolean
  /** JSON Schema for structured output */
  outputSchema?: Record<string, unknown>
  /** Override timeout for this specific task */
  timeoutMs?: number
  /** Force using a specific agent even if not in routing matrix */
  forceAgentId?: string
}

export class AgentRouterService {
  private pool: AgentAdapterPool
  private routingMatrix: RoutingMatrix
  private config: AgentRouterConfig

  constructor(
    pool: AgentAdapterPool,
    routingMatrix: RoutingMatrix,
    config: Partial<AgentRouterConfig> = {}
  ) {
    this.pool = pool
    this.routingMatrix = routingMatrix
    this.config = {
      cwd: config.cwd ?? process.cwd(),
      defaultTimeoutMs: config.defaultTimeoutMs ?? 300_000,
      skillDirectories: config.skillDirectories ?? [],
      designSystemDirectories: config.designSystemDirectories ?? [],
      allowMockFallback: config.allowMockFallback ?? true,
    }
  }

  /**
   * Route a task to the appropriate agent via the adapter pool.
   *
   * 1. Resolves routing matrix to find target agents for the task type
   * 2. Resolves adapter pool to find an available CLI adapter
   * 3. Builds the prompt (system + user) from the task input
   * 4. Runs the adapter and aggregates the stream into a result
   * 5. Falls back through alternative agents if the primary fails
   */
  async routeTask(
    taskType: string,
    taskInput: Record<string, unknown>,
    options?: RouteTaskOptions
    ): Promise<RouteTaskResult> {
    const startTime = Date.now()
    const runId = randomUUID()

    // Step 1: Build prompts
    const systemPrompt = `You are an e-commerce specialist handling task: ${taskType}.
Your job is to analyze the input data and produce accurate, actionable results.
Use web search if you need current market data (trends, prices, competition).
Return REALISTIC data based on your knowledge and research, not placeholder values.`

    const userPrompt = JSON.stringify(taskInput, null, 2)

    // Step 2: Resolve target agents from routing matrix
    const targetAgentIds = this.resolveTargetAgentIds(taskType, options?.forceAgentId)

    // Step 3: Find an adapter for each target, try in order
    const attempted = new Set<string>()
    let lastError: string | undefined
    let detectedAny = false

    // If no routing rules matched, try any detected adapter
    const agentCandidates: string[] = [...targetAgentIds]

    // Always add a general fallback: 'any' signals resolveForTask to try all adapters
    if (!agentCandidates.includes('any')) {
      agentCandidates.push('any')
    }

    for (const agentId of agentCandidates) {
      if (attempted.has(agentId)) continue
      attempted.add(agentId)

      const adapter = await this.pool.resolveForTask(taskType, agentId)
      if (!adapter) continue

      // Skip mock if not allowed
      if (adapter.id === 'mock' && !this.config.allowMockFallback) continue

      detectedAny = true

      // Step 4: Execute via adapter
      try {
        const params: AgentRunParams = {
          runId,
          cwd: this.config.cwd,
          systemPrompt,
          userPrompt,
          skillDir: this.config.skillDirectories[0],
          designSystemDir: this.config.designSystemDirectories[0],
          timeoutMs: options?.timeoutMs ?? this.config.defaultTimeoutMs,
          outputSchema: options?.outputSchema,
        }

        this.pool.trackRun(runId, adapter.id)
        const events: AgentEvent[] = []
        let output = ''

        for await (const event of adapter.run(params)) {
          events.push(event)
          if (event.type === 'text_delta') {
            output += event.text
          } else if (event.type === 'error') {
            lastError = event.message
          }
        }

        this.pool.untrackRun(runId)

        // Clean output: strip markdown fences if JSON was requested
        if (options?.outputSchema) {
          output = output.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim()
        }

        return {
          runId,
          output,
          events,
          agentId: adapter.id,
          durationMs: Date.now() - startTime,
          error: lastError,
        }
      } catch (err: any) {
        lastError = err.message
        continue // Try next agent
      }
    }

    // Step 5: No agent succeeded
    return {
      runId,
      output: '',
      events: [],
      agentId: 'none',
      durationMs: Date.now() - startTime,
      error: lastError ?? (detectedAny
        ? 'All available agents failed. Check agent output for details.'
        : 'No available agent CLI found. Install Claude Code (claude --version) or run with --dev for mock mode.'),
    }
  }

  /**
   * Stream version: returns an async iterable of events.
   * Useful for SSE responses.
   */
  async *routeTaskStream(
    taskType: string,
    taskInput: Record<string, unknown>,
    options?: RouteTaskOptions
  ): AsyncIterable<AgentEvent> {
    const runId = randomUUID()

    const systemPrompt = `You are an e-commerce specialist handling task: ${taskType}.`
    const userPrompt = JSON.stringify(taskInput, null, 2)

    const adapter = await this.findBestAdapter(taskType, options?.forceAgentId)

    if (!adapter) {
      const msg = 'No available agent CLI found. Install Claude Code or use mock mode.'
      yield { type: 'error', message: msg, code: 'NO_AGENT' }
      yield { type: 'done', reason: 'error' }
      return
    }

    this.pool.trackRun(runId, adapter.id)

    try {
      const params: AgentRunParams = {
        runId,
        cwd: this.config.cwd,
        systemPrompt,
        userPrompt,
        skillDir: this.config.skillDirectories[0],
        designSystemDir: this.config.designSystemDirectories[0],
        timeoutMs: options?.timeoutMs ?? this.config.defaultTimeoutMs,
        outputSchema: options?.outputSchema,
      }

      for await (const event of adapter.run(params)) {
        yield event
      }
    } finally {
      this.pool.untrackRun(runId)
    }
  }

  /** Check if any real (non-mock) agent adapter is available */
  async hasRealAgentAvailable(): Promise<boolean> {
    for (const adapter of this.pool.list()) {
      if (adapter.id === 'mock') continue
      const detection = await adapter.detect()
      if (detection) return true
    }
    return false
  }

  /** Cancel a running task */
  async cancelRun(runId: string): Promise<void> {
    // Find the adapter that's running this task, ask it to cancel
    for (const adapter of this.pool.list()) {
      if (typeof adapter.cancel === 'function') {
        await adapter.cancel(runId)
      }
    }
  }

  private resolveTargetAgentIds(taskType: string, forceAgentId?: string): string[] {
    if (forceAgentId) return [forceAgentId]

    const rules = this.routingMatrix.findSpecialists(taskType)
    if (rules.length > 0) {
      return rules
        .sort((a, b) => b.priority - a.priority)
        .flatMap(r => r.toAgentIds)
    }
    return []
  }

  private async findBestAdapter(
    taskType: string,
    forceAgentId?: string
  ): Promise<AgentAdapter | null> {
    if (forceAgentId) {
      return this.pool.resolveForTask(taskType, forceAgentId)
    }
    const rules = this.routingMatrix.findSpecialists(taskType)
    if (rules.length > 0) {
      for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
        for (const agentId of rule.toAgentIds) {
          const adapter = await this.pool.resolveForTask(taskType, agentId)
          if (adapter && (adapter.id !== 'mock' || this.config.allowMockFallback)) {
            return adapter
          }
        }
      }
    }
    return this.pool.resolveForTask(taskType)
  }
}
