import { Router, type Router as RouterType } from 'express'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfig } from '../config.js'

export const skillsRouter: RouterType = Router()

skillsRouter.get('/', (_req, res) => {
  const config = getConfig()
  const skillsDir = config.SKILLS_DIR

  if (!existsSync(skillsDir)) {
    return res.json({ skills: [] })
  }

  const skills: Array<{ name: string; path: string; description: string; mode?: string }> = []

  function scanDir(dir: string, basePath: string) {
    if (!existsSync(dir)) return
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath, basePath)
      } else if (entry.name === 'SKILL.md') {
        const content = readFileSync(fullPath, 'utf-8')
        const name = extractFrontmatter(content, 'name') ?? fullPath
        const description = extractFrontmatter(content, 'description') ?? ''
        const mode = extractFrontmatter(content, 'mode') ?? extractNestedFrontmatter(content, 'ecc.mode')
        skills.push({
          name: name as string,
          path: fullPath,
          description: description as string,
          mode: mode as string | undefined,
        })
      }
    }
  }

  scanDir(skillsDir, skillsDir)
  res.json({ skills })
})

function extractFrontmatter(content: string, key: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  const yaml = match[1]
  const line = yaml.split('\n').find((l) => l.startsWith(`${key}:`))
  if (!line) return null
  return line.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '')
}

function extractNestedFrontmatter(content: string, dotKey: string): string | null {
  const parts = dotKey.split('.')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  const yaml = match[1]
  const lines = yaml.split('\n')
  let currentLevel = 0
  let found = false
  for (const line of lines) {
    const indent = line.search(/\S/)
    const trimmed = line.trim()
    if (indent === 0 && trimmed.includes(':')) {
      currentLevel = 0
      found = false
    }
    if (trimmed.startsWith(`${parts[0]}:`)) {
      found = true
      continue
    }
    if (found && trimmed.startsWith(`${parts[1]}:`)) {
      return trimmed.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '')
    }
  }
  return null
}
