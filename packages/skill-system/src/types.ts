/**
 * Skill System — SKILL.md types and interfaces.
 */

export interface SkillFrontmatter {
  name: string
  description: string
  triggers?: string[]
  /** ECC extension fields */
  ecc?: {
    mode?: 'prototype' | 'deck' | 'template' | 'design-system'
    scenario?: 'ecommerce' | 'design' | 'marketing' | 'engineering' | 'general'
    fidelity?: 'low' | 'high' | 'production'
    design_system?: {
      requires: boolean
      sections?: number[]
    }
    craft?: string[]
    inputs?: SkillInput[]
    outputs?: {
      primary?: string
      secondary?: string[]
    }
  }
}

export interface SkillInput {
  name: string
  type: 'string' | 'text' | 'select' | 'boolean' | 'number'
  label?: string
  description?: string
  required?: boolean
  options?: string[]
  default?: unknown
}

export interface Skill {
  id: string
  name: string
  path: string
  description: string
  triggers: string[]
  frontmatter: SkillFrontmatter
  body: string
  mode: string
  scenario: string
}

export interface SkillExecution {
  skillId: string
  runId: string
  inputs: Record<string, unknown>
  status: 'running' | 'completed' | 'failed'
  output?: string
  error?: string
  startedAt: string
  completedAt?: string
}
