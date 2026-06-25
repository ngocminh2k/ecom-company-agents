import { BaseAdapter } from '../baseAdapter.js'
import type { AgentCapabilities, AgentDetection, AgentRunParams, AgentEvent } from '../types.js'
import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly id = 'claude-code'
  readonly name = 'Claude Code'
  private activeProcesses: Map<string, ChildProcess> = new Map()

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
    ]

    // Build the full prompt: systemPrompt as context, then userPrompt
    let fullPrompt = ''
    if (params.systemPrompt) {
      fullPrompt += `<context>${params.systemPrompt}</context>\n\n`
    }
    fullPrompt += params.userPrompt

    // Append structured output instructions if schema provided
    if (params.outputSchema) {
      fullPrompt += `\n\nReturn ONLY valid JSON matching this schema. Do NOT wrap in markdown fences or include any other text:\n\`\`\`json\n${JSON.stringify(params.outputSchema, null, 2)}\n\`\`\``
    }

    // Claude Code with --print and --output-format=stream-json requires --verbose
    args.push('--verbose')
    // prompt goes via stdin, not as positional arg

    if (params.allowedTools) {
      args.push('--allowed-tools', ...params.allowedTools)
    }

    const timeout = params.timeoutMs ?? 300_000

    const proc = spawn('claude', args, {
      cwd: params.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...params.env,
        CLAUDE_PROJECT_DIR: params.cwd,
      },
      timeout,
      signal: AbortSignal.timeout(timeout + 10_000),
    })

    // Pipe the prompt through stdin (more reliable than positional arg)
    proc.stdin.write(fullPrompt)
    proc.stdin.end()

    // Track process for cancel()
    this.activeProcesses.set(params.runId, proc)

    // Also capture stderr for debugging
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const rl = createInterface({ input: proc.stdout })
    const self = this

    try {
      for await (const line of rl) {
        const event = self.parseOutput(line)
        if (event) yield event
      }
    } finally {
      // Clean up process tracking on stream end
      this.activeProcesses.delete(params.runId)
    }

    // Handle exit
    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve)
    })

    if (exitCode !== 0) {
      yield {
        type: 'error',
        message: `Claude Code exited with code ${exitCode}${stderr ? ': ' + stderr.slice(0, 200) : ''}`,
        code: `EXIT_${exitCode}`,
      }
    }

    yield { type: 'done', reason: exitCode === 0 ? 'completed' : 'error' }
  }

  async cancel(runId: string): Promise<void> {
    const proc = this.activeProcesses.get(runId)
    if (proc && !proc.killed) {
      proc.kill('SIGTERM')
      // Force kill after 5s grace period
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL')
      }, 5000)
    }
    this.activeProcesses.delete(runId)
  }

  protected parseOutput(line: string): AgentEvent | null {
    try {
      const parsed = JSON.parse(line)

      // Claude Code real stream-json format:
      // {"type":"system",...}
      // {"type":"thinking","thinking":"..."}
      // {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
      // {"type":"result","subtype":"success","result":"..."}

      switch (parsed.type) {
        case 'thinking':
          return { type: 'thinking', text: parsed.thinking ?? parsed.text ?? '' }
        case 'assistant': {
          const msg = parsed.message
          if (msg?.content) {
            for (const block of msg.content) {
              if (block.type === 'text' && block.text) {
                return { type: 'text_delta', text: block.text }
              }
              if (block.type === 'thinking' && block.thinking) {
                return { type: 'thinking', text: block.thinking }
              }
            }
          }
          return null
        }
        case 'result': {
          if (parsed.subtype === 'success' && parsed.result) {
            return { type: 'text_delta', text: typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result) }
          }
          if (parsed.subtype === 'error' || parsed.is_error) {
            return { type: 'error', message: parsed.result ?? 'Unknown error' }
          }
          return null
        }
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
