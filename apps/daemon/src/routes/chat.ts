/**
 * Chat SSE — stream agent responses to the UI in real-time.
 *
 * GET /api/chat?skill=<skillId>&message=<text>
 * Responds with Server-Sent Events (text/event-stream).
 *
 * ponytail: add auth + rate limiting when multi-user is needed.
 */
import { Router, type Router as RouterType } from 'express'
import type { DaemonContext } from '../app.js'

export const chatRouter: RouterType = Router()

chatRouter.get('/', async (req: any, res) => {
  const ctx: DaemonContext = req.daemonContext
  const skillId = req.query.skill as string
  const message = (req.query.message as string) || ''

  if (!skillId) {
    return res.status(400).json({ error: true, message: 'skill query parameter is required' })
  }
  if (!message) {
    return res.status(400).json({ error: true, message: 'message query parameter is required' })
  }

  // Find skill
  const { scanSkillsDir } = await import('@ngocminh2k/skill-system')
  const { getConfig } = await import('../config.js')
  const config = getConfig()
  const skills = scanSkillsDir(config.SKILLS_DIR)
  const skill = skills.find((s) => s.id === skillId)

  if (!skill) {
    return res.status(404).json({ error: true, message: `Skill "${skillId}" not found` })
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const taskInput: Record<string, unknown> = {
    productName: message,
    niche: message,
    features: message,
    description: message,
    query: message,
  }
  const taskType = skill.triggers?.[0] || skill.scenario || 'general'

  try {
    for await (const event of ctx.agentRouter.routeTaskStream(taskType, taskInput, { inputs: taskInput, stream: true })) {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
      if (event.type === 'done') break
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
  }

  res.end()
})
