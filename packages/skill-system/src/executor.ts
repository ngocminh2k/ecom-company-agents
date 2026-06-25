/**
 * Skill Executor — runs a skill workflow via the agent adapter pool.
 */
import { randomUUID } from 'node:crypto'
import type { Skill, SkillExecution, SkillInput } from './types.js'

export interface SkillExecutorOptions {
  onThinking?: (text: string) => void
  onOutput?: (text: string) => void
  onFileWrite?: (path: string) => void
}

/**
 * Skill execution engine.
 * Processes the SKILL.md body into agent-compatible instructions
 * and manages execution lifecycle.
 */
export class SkillExecutor {
  private executions: Map<string, SkillExecution> = new Map()

  /**
   * Prepare a skill run — generates system prompt from skill body + inputs.
   */
  preparePrompt(skill: Skill, inputs: Record<string, unknown>): string {
    let prompt = `# Skill: ${skill.name}\n\n${skill.description}\n\n`

    // Add input values
    if (skill.frontmatter.ecc?.inputs && Object.keys(inputs).length > 0) {
      prompt += '## Inputs\n\n'
      for (const input of skill.frontmatter.ecc.inputs) {
        const value = inputs[input.name] ?? input.default ?? ''
        prompt += `- **${input.name}**${input.label ? ` (${input.label})` : ''}: ${value}\n`
      }
      prompt += '\n'
    }

    // Add skill body
    prompt += '## Instructions\n\n'
    prompt += skill.body

    // Add output expectations
    if (skill.frontmatter.ecc?.outputs) {
      prompt += '\n\n## Expected Output\n'
      if (skill.frontmatter.ecc.outputs.primary) {
        prompt += `\nPrimary: ${skill.frontmatter.ecc.outputs.primary}`
      }
      if (skill.frontmatter.ecc.outputs.secondary?.length) {
        prompt += `\nSecondary: ${skill.frontmatter.ecc.outputs.secondary.join(', ')}`
      }
    }

    return prompt
  }

  /**
   * Start a skill execution and return tracking info.
   */
  startExecution(skill: Skill, inputs: Record<string, unknown>): SkillExecution {
    const execution: SkillExecution = {
      skillId: skill.id,
      runId: randomUUID(),
      inputs,
      status: 'running',
      startedAt: new Date().toISOString(),
    }
    this.executions.set(execution.runId, execution)
    return execution
  }

  /**
   * Complete a skill execution with output.
   */
  completeExecution(runId: string, output: string): void {
    const execution = this.executions.get(runId)
    if (execution) {
      execution.status = 'completed'
      execution.output = output
      execution.completedAt = new Date().toISOString()
    }
  }

  /**
   * Fail a skill execution.
   */
  failExecution(runId: string, error: string): void {
    const execution = this.executions.get(runId)
    if (execution) {
      execution.status = 'failed'
      execution.error = error
      execution.completedAt = new Date().toISOString()
    }
  }

  /**
   * Get execution status.
   */
  getExecution(runId: string): SkillExecution | undefined {
    return this.executions.get(runId)
  }

  /**
   * List all executions.
   */
  listExecutions(): SkillExecution[] {
    return Array.from(this.executions.values())
  }

  /**
   * Validate inputs against skill schema.
   */
  validateInputs(skill: Skill, inputs: Record<string, unknown>): string[] {
    const errors: string[] = []
    const inputDefs = skill.frontmatter.ecc?.inputs ?? []

    for (const def of inputDefs) {
      if (def.required && (inputs[def.name] === undefined || inputs[def.name] === '')) {
        errors.push(`Missing required input: ${def.name}`)
      }
      if (def.type === 'select' && def.options && inputs[def.name]) {
        if (!def.options.includes(inputs[def.name] as string)) {
          errors.push(`Invalid option for ${def.name}: must be one of ${def.options.join(', ')}`)
        }
      }
    }

    return errors
  }
}
