import { Router, type Router as RouterType } from 'express'
import { scanSkillsDir, SkillExecutor } from '@ngocminh2k/skill-system'
import { getConfig } from '../config.js'
import type { DaemonContext } from '../app.js'

export const skillsRouter: RouterType = Router()
const skillExecutor = new SkillExecutor()

// List all skills
skillsRouter.get('/', (_req, res) => {
  const config = getConfig()
  const skills = scanSkillsDir(config.SKILLS_DIR)
  res.json({
    skills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      path: s.path,
      description: s.description,
      mode: s.mode,
      scenario: s.scenario,
      triggers: s.triggers,
      inputs: s.frontmatter.ecc?.inputs ?? [],
    })),
  })
})

// Get skill by id
skillsRouter.get('/:id', (req, res) => {
  const config = getConfig()
  const skills = scanSkillsDir(config.SKILLS_DIR)
  const skill = skills.find((s) => s.id === req.params.id)
  if (!skill) {
    return res.status(404).json({ error: true, message: 'Skill not found' })
  }
  res.json({ skill })
})

// Execute a skill — dispatches to real agent via AgentRouterService
skillsRouter.post('/:id/execute', async (req: any, res) => {
  const config = getConfig()
  const skills = scanSkillsDir(config.SKILLS_DIR)
  const skill = skills.find((s) => s.id === req.params.id)

  if (!skill) {
    return res.status(404).json({ error: true, message: 'Skill not found' })
  }

  const inputs = req.body.inputs ?? {}
  const errors = skillExecutor.validateInputs(skill, inputs)
  if (errors.length > 0) {
    return res.status(400).json({ error: true, message: 'Validation failed', details: errors })
  }

  const execution = skillExecutor.startExecution(skill, inputs)
  const ctx: DaemonContext = req.daemonContext

  // Determine task type from skill's first trigger or scenario
  const taskType = skill.triggers[0] ?? skill.scenario ?? 'general'

  // Build task input from skill inputs
  const taskInput: Record<string, unknown> = { ...inputs }
  if (skill.frontmatter.ecc?.design_system?.requires) {
    taskInput.designSystemRequired = true
  }

  // Check for streaming mode
  const streamMode = req.query.stream === 'true'

  if (streamMode) {
    // SSE streaming response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    try {
      for await (const event of ctx.agentRouter.routeTaskStream(taskType, taskInput, {
        inputs,
        stream: true,
      })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`)

        if (event.type === 'done') {
          if (event.reason === 'completed') {
            skillExecutor.completeExecution(execution.runId, '[Streaming output]')
          } else {
            skillExecutor.failExecution(execution.runId, 'Agent execution failed')
          }
          break
        }
      }
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
      skillExecutor.failExecution(execution.runId, err.message)
    }

    res.end()
  } else {
    // Aggregated JSON response
    try {
      const result = await ctx.agentRouter.routeTask(taskType, taskInput, {
        inputs,
        outputSchema: undefined, // Let agent decide output format
      })

      if (result.error) {
        skillExecutor.failExecution(execution.runId, result.error)
        return res.status(200).json({
          execution: {
            runId: execution.runId,
            skillId: execution.skillId,
            status: 'completed_with_warnings',
            startedAt: execution.startedAt,
            completedAt: new Date().toISOString(),
          },
          result: {
            output: result.output || `[${result.agentId}] ${result.error}`,
            agentId: result.agentId,
            durationMs: result.durationMs,
            warning: result.error,
          },
        })
      }

      skillExecutor.completeExecution(execution.runId, result.output)

      res.json({
        execution: {
          runId: execution.runId,
          skillId: execution.skillId,
          status: 'completed',
          startedAt: execution.startedAt,
          completedAt: new Date().toISOString(),
        },
        result: {
          output: result.output,
          agentId: result.agentId,
          durationMs: result.durationMs,
          eventCount: result.events.length,
        },
      })
    } catch (err: any) {
      skillExecutor.failExecution(execution.runId, err.message)
      res.status(200).json({
        error: true,
        message: err.message,
        execution: {
          runId: execution.runId,
          skillId: execution.skillId,
          status: 'failed',
        },
        result: {
          output: 'Agent execution unavailable. Using offline mode.',
          agentId: 'fallback',
          durationMs: 0,
        },
      })
    }
  }
})
