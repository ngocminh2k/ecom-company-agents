import { BaseAdapter } from '../baseAdapter.js'
import type { AgentCapabilities, AgentDetection, AgentRunParams, AgentEvent } from '../types.js'

export class MockAdapter extends BaseAdapter {
  readonly id = 'mock'
  readonly name = 'Mock Agent (dev)'

  async detect(): Promise<AgentDetection | null> {
    // Always available in dev mode
    return {
      executablePath: 'mock',
      version: '0.1.0',
      configDir: '',
      skillsDir: '',
      authState: 'authenticated',
    }
  }

  capabilities(): AgentCapabilities {
    return {
      surgicalEdit: false,
      nativeSkillLoading: false,
      streaming: true,
      resume: false,
      permissionMode: 'bypass',
      contextWindowHint: 128_000,
      mcpVersions: [],
      maxConcurrentRuns: 10,
      supportedTools: ['read', 'write', 'edit', 'search'],
    }
  }

  async *run(params: AgentRunParams): AsyncIterable<AgentEvent> {
    // Simulate thinking
    yield { type: 'thinking', text: `Mock agent processing: "${params.userPrompt.slice(0, 60)}..."` }

    // Simulate tool calls
    yield { type: 'tool_call', name: 'read', input: { path: 'DESIGN.md' }, id: 'mock-1' }
    yield { type: 'tool_result', output: '# Mock Design System', id: 'mock-1' }

    // Simulate text output
    yield {
      type: 'text_delta',
      text: `# Mock Output\n\nThis is a mock response for run ${params.runId}.\n\nPrompt: ${params.userPrompt}\n`,
    }

    // Simulate file write
    yield {
      type: 'file_write',
      path: `${params.cwd}/output.html`,
    }

    yield { type: 'done', reason: 'completed' }
  }

  protected parseOutput(_line: string): AgentEvent | null {
    return null // Mock has no external output to parse
  }
}
