import { Router, type Router as RouterType } from 'express'
import { scanSkillsDir, parseSkillFile, SkillExecutor } from '@ngocminh2k/skill-system'
import { getConfig } from '../config.js'

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

// Execute a skill (dry-run — returns prepared prompt)
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
  const prompt = skillExecutor.preparePrompt(skill, inputs)

  res.json({
    execution: {
      runId: execution.runId,
      skillId: execution.skillId,
      status: execution.status,
      startedAt: execution.startedAt,
    },
    prompt,
  })
})
