import { BaseAdapter } from '../baseAdapter.js'
import type { AgentCapabilities, AgentDetection, AgentRunParams, AgentEvent } from '../types.js'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly id = 'claude-code'
  readonly name = 'Claude Code'

  async detect(): Promise<AgentDetection | null> {
    try {
      const proc = spawn('claude', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] })
      const version = await new Promise<string>((resolve, reject) => {
        let out = ''
        proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
        proc.on('close', (code) => {
          if (code === 0) resolve(out.trim())
          else reject(new Error(`claude --version exited ${code}`))
        })
        proc.on('error', reject)
      })

      return {
        executablePath: 'claude',
        version,
        configDir: process.env.HOME ? `${process.env.HOME}/.claude` : '',
        skillsDir: process.env.HOME ? `${process.env.HOME}/.claude/skills` : '',
        authState: 'authenticated',
      }
    } catch {
      return null
    }
  }

  capabilities(): AgentCapabilities {
    return {
      surgicalEdit: true,
      nativeSkillLoading: true,
      streaming: true,
      resume: true,
      permissionMode: 'hybrid',
      contextWindowHint: 200_000,
      mcpVersions: ['2024-11-05'],
      maxConcurrentRuns: 1,
      supportedTools: ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'WebSearch', 'WebFetch'],
    }
  }

  async *run(params: AgentRunParams): AsyncIterable<AgentEvent> {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--cwd', params.cwd,
      params.userPrompt,
    ]

    if (params.allowedTools) {
      args.push('--allowed-tools', ...params.allowedTools)
    }

    // Increase timeout if specified
    const timeout = params.timeoutMs ?? 300_000

    const proc = spawn('claude', args, {
      cwd: params.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...params.env,
        CLAUDE_PROJECT_DIR: params.cwd,
      },
      timeout,
      signal: AbortSignal.timeout(timeout + 10_000),
    })

    const rl = createInterface({ input: proc.stdout })
    const self = this

    for await (const line of rl) {
      const event = self.parseOutput(line)
      if (event) yield event
    }

    // Handle exit
    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve)
    })

    if (exitCode !== 0) {
      yield {
        type: 'error',
        message: `Claude Code exited with code ${exitCode}`,
        code: `EXIT_${exitCode}`,
      }
    }

    yield { type: 'done', reason: exitCode === 0 ? 'completed' : 'error' }
  }

  protected parseOutput(line: string): AgentEvent | null {
    try {
      const parsed = JSON.parse(line)

      switch (parsed.type) {
        case 'thinking':
          return { type: 'thinking', text: parsed.text ?? '' }
        case 'tool_call':
          return {
            type: 'tool_call',
            name: parsed.name ?? parsed.tool ?? 'unknown',
            input: parsed.input ?? {},
            id: parsed.id ?? `tc-${Date.now()}`,
          }
        case 'tool_result':
          return { type: 'tool_result', output: parsed.output ?? {}, id: parsed.id ?? '' }
        case 'text':
        case 'text_delta':
          return { type: 'text_delta', text: parsed.text ?? parsed.content ?? '' }
        case 'file_write':
          return { type: 'file_write', path: parsed.path ?? parsed.file ?? '' }
        case 'error':
          return { type: 'error', message: parsed.message ?? parsed.error ?? 'Unknown error' }
        default:
          return null
      }
    } catch {
      return null
    }
  }
}
