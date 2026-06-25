/**
 * DESIGN.md Parser — parses 9-section design system documents.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import type { DesignSystem, DesignSections, DesignTokens } from './types.js'

const SECTION_RE = /^##\s+(\d+)\.\s*(.*)$/m
const ALL_SECTIONS = [
  'visualTheme',
  'color',
  'typography',
  'spacing',
  'layout',
  'components',
  'motion',
  'voice',
  'antiPatterns',
] as const

const CATEGORY_RE = /^>\s*Category:\s*(.+)$/m
const TOKEN_RE = /--([\w-]+)\s*:\s*([^;]+)/g
const THEME_TOKEN_RE = /\[data-theme="(\w+)"\]\s*\{([^}]+)\}/g

/**
 * Parse a single DESIGN.md file.
 */
export function parseDesignSystemFile(filePath: string): DesignSystem {
  const raw = readFileSync(filePath, 'utf-8')
  const name = extractName(raw, filePath)
  const category = extractCategory(raw)
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // Extract sections
  const sections: DesignSections = {}
  const sectionMatches = raw.matchAll(/^##\s+(\d+)\.\s*(.*)$([\s\S]*?)(?=^##\s+\d+\.|\Z)/gm)

  for (const match of sectionMatches) {
    const sectionNum = parseInt(match[1], 10)
    const content = match[3].trim()
    const key = ALL_SECTIONS[sectionNum]
    if (key) {
      ;(sections as any)[key] = content
    }
  }

  // Extract CSS tokens
  const tokensCss = extractTokens(raw)

  return {
    name,
    slug,
    category,
    path: filePath,
    sections,
    tokensCss,
    raw,
  }
}

/**
 * Scan a directory for DESIGN.md files organized as: design-systems/<slug>/DESIGN.md
 */
export function scanDesignSystemsDir(dir: string): DesignSystem[] {
  if (!existsSync(dir)) return []

  const systems: DesignSystem[] = []
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const desigMdPath = join(dir, entry.name, 'DESIGN.md')
    if (existsSync(desigMdPath)) {
      try {
        systems.push(parseDesignSystemFile(desigMdPath))
      } catch (err) {
        console.error(`[DesignSystem] Error parsing ${desigMdPath}:`, err)
      }
    }
  }

  return systems
}

/**
 * Extract all CSS custom properties from a DESIGN.md into tokens.css format.
 */
export function generateTokensCss(system: DesignSystem): string {
  const tokens = extractDesignTokens(system.raw)

  let css = `/* Auto-generated from ${system.name} DESIGN.md */\n`
  css += `:root {\n`

  for (const [key, value] of Object.entries(tokens.colors)) {
    css += `  --color-${key}: ${value};\n`
  }
  for (const [key, value] of Object.entries(tokens.typography)) {
    css += `  --font-${key}: ${value};\n`
  }
  for (const [key, value] of Object.entries(tokens.spacing)) {
    css += `  --space-${key}: ${value};\n`
  }

  css += `}\n\n`

  // Dark mode overrides
  const darkTokens = extractDarkTokens(system.raw)
  if (Object.keys(darkTokens).length > 0) {
    css += `[data-theme="dark"] {\n`
    for (const [key, value] of Object.entries(darkTokens)) {
      css += `  ${key}: ${value};\n`
    }
    css += `}\n`
  }

  return css
}

function extractName(raw: string, filePath: string): string {
  const firstLine = raw.trim().split('\n')[0]
  if (firstLine.startsWith('# ')) {
    return firstLine.slice(2).trim()
  }
  // Fallback: use directory name
  return basename(filePath.replace(/\\/g, '/').replace(/\/DESIGN\.md$/, ''))
}

function extractCategory(raw: string): string {
  const match = raw.match(CATEGORY_RE)
  return match ? match[1].trim() : 'Uncategorized'
}

function extractTokens(raw: string): string {
  const match = raw.match(/```css\s*([\s\S]*?)```/)
  return match ? match[1].trim() : ''
}

function extractDesignTokens(raw: string): DesignTokens {
  const tokens: DesignTokens = { colors: {}, typography: {}, spacing: {}, other: {} }
  const rootMatch = raw.match(/:root\s*\{([^}]+)\}/)
  if (!rootMatch) return tokens

  const cssBlock = rootMatch[1]
  const tokenMatches = cssBlock.matchAll(TOKEN_RE)

  for (const match of tokenMatches) {
    const fullName = match[1]
    const value = match[2].trim()
    if (fullName.startsWith('color-')) tokens.colors[fullName.slice(6)] = value
    else if (fullName.startsWith('font-') || fullName.startsWith('text-')) tokens.typography[fullName] = value
    else if (fullName.startsWith('space-')) tokens.spacing[fullName.slice(6)] = value
    else tokens.other[fullName] = value
  }

  return tokens
}

function extractDarkTokens(raw: string): Record<string, string> {
  const darkTokens: Record<string, string> = {}
  const themeMatches = raw.matchAll(THEME_TOKEN_RE)
  for (const match of themeMatches) {
    if (match[1].toLowerCase() === 'dark') {
      const tokenMatches = match[2].matchAll(TOKEN_RE)
      for (const t of tokenMatches) {
        darkTokens[`--${t[1]}`] = t[2].trim()
      }
    }
  }
  return darkTokens
}
