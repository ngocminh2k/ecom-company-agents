/**
 * Agent Personality Loader
 * Scans agents/ directory for .md files with The Agency format
 * and loads them into the routing matrix.
 */
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

export interface AgentPersonality {
  id: string
  name: string
  path: string
  division: string
  description: string
  color?: string
  rawContent: string
  frontmatter: Record<string, unknown>
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/

/**
 * Scan all agent personality files from agents/division/*.md
 */
export function scanAgentPersonalities(agentsDir: string): AgentPersonality[] {
  if (!existsSync(agentsDir)) return []

  const agents: AgentPersonality[] = []
  const divisions = readdirSync(agentsDir, { withFileTypes: true })

  for (const division of divisions) {
    if (!division.isDirectory()) continue
    const divisionPath = join(agentsDir, division.name)
    const agentFiles = readdirSync(divisionPath)

    for (const file of agentFiles) {
      if (!file.endsWith('.md')) continue
      const fullPath = join(divisionPath, file)
      if (!statSync(fullPath).isFile()) continue

      try {
        const content = readFileSync(fullPath, 'utf-8')
        const agent = parseAgentFile(file, division.name, fullPath, content)
        agents.push(agent)
      } catch (err) {
        console.error(`[AgentLoader] Error parsing ${fullPath}:`, err)
      }
    }
  }

  return agents
}

/**
 * Parse a single agent .md file.
 */
function parseAgentFile(
  filename: string,
  division: string,
  fullPath: string,
  content: string
): AgentPersonality {
  // Extract name from first H1 or filename
  const nameMatch = content.match(/^#\s+(.+)$/m)
  const name = nameMatch ? nameMatch[1].trim() : basename(filename, '.md')

  // Extract color from frontmatter or second line
  const colorMatch = content.match(/^>\s*Color:\s*(#[0-9a-fA-F]+)/m)
  const color = colorMatch ? colorMatch[1] : undefined

  // Extract description (first paragraph after header)
  const descMatch = content.match(/^#\s+.+\n\n(.+?)$/m)
  const description = descMatch ? descMatch[1].trim() : ''

  // Extract frontmatter
  const fmMatch = content.match(FRONTMATTER_RE)
  const frontmatter: Record<string, unknown> = {}
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim()
        const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
        frontmatter[key] = value
      }
    }
  }

  return {
    id: `${division}-${basename(filename, '.md')}`,
    name,
    path: fullPath,
    division,
    description,
    color,
    rawContent: content,
    frontmatter,
  }
}
