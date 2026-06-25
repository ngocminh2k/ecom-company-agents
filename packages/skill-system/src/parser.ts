/**
 * SKILL.md Parser — parses YAML frontmatter + Markdown body.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Skill, SkillFrontmatter } from './types.js'

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

/**
 * Parse a single SKILL.md file into a Skill object.
 */
export function parseSkillFile(filePath: string): Skill {
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(FRONTMATTER_RE)

  if (!match) {
    throw new Error(`Invalid SKILL.md: missing frontmatter in ${filePath}`)
  }

  const rawYaml = match[1]
  const body = match[2].trim()
  const frontmatter = parseYamlFrontmatter(rawYaml)

  const name = frontmatter.name ?? filePath
  const description = frontmatter.description ?? ''
  const triggers = frontmatter.triggers ?? []
  const mode = frontmatter.ecc?.mode ?? 'general'
  const scenario = frontmatter.ecc?.scenario ?? 'general'

  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    path: filePath,
    description,
    triggers,
    frontmatter,
    body,
    mode,
    scenario,
  }
}

/**
 * Simple YAML frontmatter parser (no external deps).
 */
function parseYamlFrontmatter(yaml: string): SkillFrontmatter {
  const result: any = { triggers: [], ecc: {} }
  const lines = yaml.split('\n')
  let currentKey: string | null = null
  let currentObj: any = null
  let depth = 0

  for (const line of lines) {
    const indent = line.search(/\S/)
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    // Top-level key: value
    if (indent === 0) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) continue
      const key = trimmed.slice(0, colonIdx).trim()
      const value = trimmed.slice(colonIdx + 1).trim()

      if (key === 'ecc') {
        currentKey = 'ecc'
        result.ecc = {}
        currentObj = result.ecc
        depth = 1
      } else {
        currentKey = key
        currentObj = null
        depth = 0

        if (value === '' || value === '|' || value === '>') {
          result[key] = ''
        } else if (value.startsWith('[')) {
          result[key] = parseArrayValue(value)
        } else {
          result[key] = parseScalarValue(value)
        }
      }
      continue
    }

    // Nested under ecc:
    if (currentKey === 'ecc' && indent > 0) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx === -1) continue
      const key = trimmed.slice(0, colonIdx).trim()
      const value = trimmed.slice(colonIdx + 1).trim()

      if (key === 'inputs' && value === '') {
        result.ecc.inputs = []
        currentObj = { type: 'inputs-array' }
      } else if (key === 'outputs' && value === '') {
        result.ecc.outputs = {}
        currentObj = result.ecc.outputs
      } else if (key === 'design_system' && value === '') {
        result.ecc.design_system = {}
        currentObj = result.ecc.design_system
      } else if (currentObj && key.startsWith('-')) {
        // Array item
      } else {
        if (value.startsWith('[')) {
          result.ecc[key] = parseArrayValue(value)
        } else if (value !== '') {
          result.ecc[key] = parseScalarValue(value)
        }
      }
    }
  }

  return result as SkillFrontmatter
}

function parseScalarValue(value: string): unknown {
  value = value.replace(/^["']|["']$/g, '')
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^\d+$/.test(value)) return parseInt(value, 10)
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value)
  return value
}

function parseArrayValue(value: string): unknown[] {
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => parseScalarValue(s.trim()))
    .filter((s) => s !== '')
}

/**
 * Scan a directory for SKILL.md files recursively.
 */
export function scanSkillsDir(skillsDir: string, baseDir?: string): Skill[] {
  if (!existsSync(skillsDir)) return []

  const skills: Skill[] = []
  const entries = readdirSync(skillsDir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(skillsDir, entry.name)
    if (entry.isDirectory()) {
      skills.push(...scanSkillsDir(fullPath, baseDir ?? skillsDir))
    } else if (entry.name === 'SKILL.md') {
      try {
        const skill = parseSkillFile(fullPath)
        skills.push(skill)
      } catch (err) {
        console.error(`[Skills] Error parsing ${fullPath}:`, err)
      }
    }
  }

  return skills
}
