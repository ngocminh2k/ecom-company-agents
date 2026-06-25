import type { AgentAdapter, AgentRunParams, AgentEvent, AgentCapabilities, AgentDetection } from './types.js'

/**
 * Base adapter with shared utilities.
 * Extend this to implement specific CLI adapters.
 */
export abstract class BaseAdapter implements AgentAdapter {
  abstract readonly id: string
  abstract readonly name: string

  abstract detect(): Promise<AgentDetection | null>
  abstract capabilities(): AgentCapabilities

  abstract run(params: AgentRunParams): AsyncIterable<AgentEvent>

  async cancel(runId: string): Promise<void> {
    // Default: no-op. Override in subclass.
    console.warn(`[BaseAdapter] cancel() not implemented for ${this.id}`)
  }

  /**
   * Spawn a child process and return its stdout as an async iterable of lines.
   * Used by adapters that wrap CLI agents.
   */
  protected async *spawnProcess(
    cmd: string,
    args: string[],
    options: { cwd?: string; env?: Record<string, string> }
  ): AsyncIterable<string> {
    // Will be implemented per-adapter using child_process
    throw new Error('spawnProcess must be implemented by subclass')
  }

  /**
   * Parse a CLI agent's stdout stream into AgentEvents.
   * Each adapter overrides this with its own format.
   */
  protected abstract parseOutput(line: string): AgentEvent | null
}
