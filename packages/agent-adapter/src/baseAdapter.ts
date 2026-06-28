import { spawn, type ChildProcess } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { AgentAdapter, AgentRunParams, AgentEvent, AgentCapabilities, AgentDetection } from './types.js'

export interface RuntimeAgentDef {
  id: string
  name: string
  capabilities: AgentCapabilities
  detect: {
    fallbackBins: string[]
    versionFlag: string
  }
  buildArgs: (params: AgentRunParams) => string[]
  formatStdio: (proc: ChildProcess, fullPrompt: string) => void
  parseOutput: (line: string) => AgentEvent | null
}

export class BaseAdapter implements AgentAdapter {
  readonly id: string
  readonly name: string
  private def: RuntimeAgentDef
  private activeProcesses: Map<string, ChildProcess> = new Map()
  private lastDetectedPath: string | null = null

  constructor(def: RuntimeAgentDef) {
    this.id = def.id
    this.name = def.name
    this.def = def
  }

  async detect(): Promise<AgentDetection | null> {
    try {
      const binsToTry = process.platform === 'win32'
        ? this.def.detect.fallbackBins.map(bin => {
            // Append .cmd to the first part if it's a direct command,
            // or use npx.cmd if it's an npx invocation.
            const parts = bin.split(' ')
            if (parts[0] === 'npx') return `npx.cmd ${parts.slice(1).join(' ')}`
            return `${parts[0]}.cmd` + (parts.length > 1 ? ` ${parts.slice(1).join(' ')}` : '')
          }).concat(this.def.detect.fallbackBins)
        : this.def.detect.fallbackBins

      let executablePath = ''
      let version = ''

      for (const bin of binsToTry) {
        try {
          const parts = bin.split(' ')
          const cmd = parts[0]
          const args = [...parts.slice(1), this.def.detect.versionFlag]

          const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
          version = await new Promise<string>((resolve, reject) => {
            let out = ''
            proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
            proc.on('close', (code) => {
              if (code === 0) resolve(out.trim())
              else reject(new Error(`${bin} ${this.def.detect.versionFlag} exited ${code}`))
            })
            proc.on('error', reject)
          })

          if (version) {
            executablePath = bin
            this.lastDetectedPath = bin
            break
          }
        } catch (err) {
          continue
        }
      }

      if (!executablePath) {
        return null
      }

      return {
        executablePath,
        version,
        configDir: process.env.HOME ? `${process.env.HOME}/.${this.id}` : '',
        skillsDir: process.env.HOME ? `${process.env.HOME}/.${this.id}/skills` : '',
        authState: 'unknown',
      }
    } catch (e) {
      console.error(`Detect failed for ${this.id}:`, e)
      return null
    }
  }

  capabilities(): AgentCapabilities {
    return this.def.capabilities
  }

  async *run(params: AgentRunParams): AsyncIterable<AgentEvent> {
    const timeout = params.timeoutMs ?? 300_000

    let cmd = this.def.detect.fallbackBins[0]
    let cmdArgs = this.def.buildArgs(params)

    if (this.lastDetectedPath) {
      const parts = this.lastDetectedPath.split(' ')
      cmd = parts[0]
      cmdArgs = [...parts.slice(1), ...cmdArgs]
    } else if (process.platform === 'win32') {
      const parts = cmd.split(' ')
      if (parts[0] === 'npx') {
        cmd = 'npx.cmd'
        cmdArgs = [...parts.slice(1), ...cmdArgs]
      } else {
        cmd = `${parts[0]}.cmd`
        cmdArgs = [...parts.slice(1), ...cmdArgs]
      }
    }

    const proc = spawn(cmd, cmdArgs, {
      cwd: params.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...params.env,
      },
      timeout,
      signal: AbortSignal.timeout(timeout + 10_000),
    })

    this.activeProcesses.set(params.runId, proc)

    let fullPrompt = ''
    if (params.systemPrompt) {
      fullPrompt += `<context>${params.systemPrompt}</context>\n\n`
    }
    fullPrompt += params.userPrompt

    if (params.outputSchema) {
      fullPrompt += `\n\nReturn ONLY valid JSON matching this schema. Do NOT wrap in markdown fences or include any other text:\n\`\`\`json\n${JSON.stringify(params.outputSchema, null, 2)}\n\`\`\``
    }

    this.def.formatStdio(proc, fullPrompt)

    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const rl = createInterface({ input: proc.stdout })

    try {
      for await (const line of rl) {
        const event = this.def.parseOutput(line)
        if (event) yield event
      }
    } finally {
      this.activeProcesses.delete(params.runId)
    }

    const exitCode = await new Promise<number>((resolve) => {
      proc.on('close', resolve)
    })

    if (exitCode !== 0) {
      yield {
        type: 'error',
        message: `${this.name} exited with code ${exitCode}${stderr ? ': ' + stderr.slice(0, 200) : ''}`,
        code: `EXIT_${exitCode}`,
      }
    }

    yield { type: 'done', reason: exitCode === 0 ? 'completed' : 'error' }
  }

  async cancel(runId: string): Promise<void> {
    const proc = this.activeProcesses.get(runId)
    if (proc && !proc.killed) {
      proc.kill('SIGTERM')
      setTimeout(() => {
        if (!proc.killed) proc.kill('SIGKILL')
      }, 5000)
    }
    this.activeProcesses.delete(runId)
  }
}
