/**
 * Core types for the ECC Agent Adapter Pool
 *
 * Defines the contract between the ECC daemon and any CLI-based AI agent.
 * Each CLI (Claude Code, Codex, Cursor, etc.) gets its own adapter
 * implementing this interface.
 */

// ─── Agent Detection ───────────────────────────────────────────────

export interface AgentDetection {
  executablePath: string
  version: string
  configDir: string
  skillsDir: string
  authState: 'authenticated' | 'unauthenticated' | 'unknown'
}

export interface AgentCapabilities {
  surgicalEdit: boolean
  nativeSkillLoading: boolean
  streaming: boolean
  resume: boolean
  permissionMode: 'bypass' | 'prompt' | 'hybrid'
  contextWindowHint: number
  /** Supported MCP protocol versions */
  mcpVersions: string[]
  maxConcurrentRuns: number
  supportedTools: string[]
}

// ─── Run Parameters ────────────────────────────────────────────────

export interface AgentRunParams {
  runId: string
  cwd: string
  systemPrompt: string
  userPrompt: string
  skillDir?: string
  designSystemDir?: string
  allowedTools?: string[]
  timeoutMs?: number
  /** Additional environment variables to pass */
  env?: Record<string, string>
}

// ─── Streaming Events ──────────────────────────────────────────────

export type AgentEvent =
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; name: string; input: unknown; id: string }
  | { type: 'tool_result'; output: unknown; id: string }
  | { type: 'text_delta'; text: string }
  | { type: 'file_write'; path: string; content?: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'done'; reason: 'completed' | 'cancelled' | 'error' }

// ─── Adapter Interface ─────────────────────────────────────────────

export interface AgentAdapter {
  /** Unique identifier for this adapter */
  readonly id: string
  /** Human-readable name */
  readonly name: string

  /**
   * Check if this agent CLI is available on PATH.
   * Returns detection info, or null if not found.
   */
  detect(): Promise<AgentDetection | null>

  /** Return static capability info for this agent type */
  capabilities(): AgentCapabilities

  /**
   * Run the agent with given params.
   * Returns a stream of events that the daemon can forward to clients.
   */
  run(params: AgentRunParams): AsyncIterable<AgentEvent>

  /** Cancel a running agent by runId (SIGTERM) */
  cancel(runId: string): Promise<void>

  /**
   * Resume an interrupted run with an additional message.
   * Optional — not all CLI agents support this.
   */
  resume?(runId: string, msg: string): AsyncIterable<AgentEvent>
}

// ─── Agent Adapter Pool ────────────────────────────────────────────

export interface AgentPoolConfig {
  /** Directories to scan for SKILL.md files */
  skillDirectories: string[]
  /** Directories to scan for DESIGN.md files */
  designSystemDirectories: string[]
  /** Default timeout for agent runs (ms) */
  defaultTimeoutMs: number
  /** Base working directory for artifact output */
  artifactsDir: string
}

export interface AgentPoolStatus {
  available: Array<{
    id: string
    name: string
    detected: boolean
    version?: string
    capabilities: AgentCapabilities
  }>
  running: Array<{
    runId: string
    agentId: string
    startedAt: string
    status: 'running' | 'cancelling'
  }>
}

// ─── Multi-Agent & Agent-to-Agent ─────────────────────────────────

export interface AgentRoutingRule {
  id: string
  /** Source agent that makes the request */
  fromAgentId: string
  /** Target agent(s) that handle the request */
  toAgentIds: string[]
  /** Task type to route (e.g., 'product-design', 'market-research') */
  taskType: string
  /** Priority: higher = evaluated first */
  priority: number
  /** Conditions under which this rule applies */
  condition?: {
    field: string
    operator: 'eq' | 'neq' | 'contains' | 'regex'
    value: unknown
  }
}

export interface CoAgentMessage {
  from: string
  to: string
  type: 'request' | 'response' | 'broadcast'
  taskType: string
  payload: unknown
  replyTo?: string
  correlationId: string
  timestamp: string
}

/**
 * A agent-to-agent routing matrix:
 * Maps source agents → target agents by task type.
 * Enables any agent to delegate sub-tasks to specialized agents.
 */
export type AgentRoutingMatrix = Map<string, AgentRoutingRule[]>
