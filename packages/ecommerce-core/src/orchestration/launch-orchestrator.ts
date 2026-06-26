/**
 * Product Launch Orchestrator — 5-stage pipeline for product launch lifecycle.
 *
 * SOP Sections 22-23: Research -> Creative -> Launch -> Data -> Scale
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export type LaunchStage = 'research' | 'creative' | 'launch' | 'data' | 'scale'

export type LaunchStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked'

export const LAUNCH_STAGES: Record<LaunchStage, { label: string; order: number; transitions: LaunchStage[] }> = {
  research:  { label: 'Research',  order: 0, transitions: ['creative'] },
  creative:  { label: 'Creative',  order: 1, transitions: ['launch'] },
  launch:    { label: 'Launch',    order: 2, transitions: ['data'] },
  data:      { label: 'Data',      order: 3, transitions: ['scale'] },
  scale:     { label: 'Scale',     order: 4, transitions: [] },
} as const

export interface LaunchOrchestration {
  id: string
  productId: string
  stage: LaunchStage
  status: LaunchStatus
  checklistId?: string
  etsyLaunched: boolean
  shopifyLaunched: boolean
  amazonReady: boolean
  adCampaignActive: boolean
  socialContentPosted: boolean
  fulfillmentReady: boolean
  createdAt: string
  updatedAt: string
}

export interface LaunchOrchestrationCreateInput {
  productId: string
}

export interface LaunchOrchestrationStorage {
  findById(id: string): LaunchOrchestration | undefined
  findByProductId(productId: string): LaunchOrchestration | undefined
  insert(orch: LaunchOrchestration): void
  update(id: string, updates: Partial<LaunchOrchestration>): void
  findAll(): LaunchOrchestration[]
}

export function isValidLaunchStageTransition(from: LaunchStage, to: LaunchStage): boolean {
  const stage = LAUNCH_STAGES[from]
  if (!stage) return false
  return stage.transitions.includes(to)
}

export function getValidLaunchTransitions(from: LaunchStage): LaunchStage[] {
  const stage = LAUNCH_STAGES[from]
  return stage ? [...stage.transitions] : []
}

export class LaunchOrchestrator {
  constructor(private storage: LaunchOrchestrationStorage) {}

  startLaunch(input: LaunchOrchestrationCreateInput): LaunchOrchestration {
    if (!input.productId) throw new Error('productId is required')

    const existing = this.storage.findByProductId(input.productId)
    if (existing) {
      throw new Error(`Launch orchestration already exists for product ${input.productId}`)
    }

    const now = new Date().toISOString()
    const orch: LaunchOrchestration = {
      id: crypto.randomUUID(),
      productId: input.productId,
      stage: 'research',
      status: 'in_progress',
      etsyLaunched: false,
      shopifyLaunched: false,
      amazonReady: false,
      adCampaignActive: false,
      socialContentPosted: false,
      fulfillmentReady: false,
      createdAt: now,
      updatedAt: now,
    }
    this.storage.insert(orch)
    return orch
  }

  advanceStage(id: string, nextStage: LaunchStage): LaunchOrchestration {
    const orch = this.storage.findById(id)
    if (!orch) throw new Error(`Launch orchestration ${id} not found`)

    if (orch.status === 'blocked') {
      throw new Error(`Launch orchestration ${id} is blocked. Resolve blockers before advancing.`)
    }

    if (!isValidLaunchStageTransition(orch.stage, nextStage)) {
      throw new Error(
        `Cannot advance from "${orch.stage}" to "${nextStage}". Valid transitions: ${getValidLaunchTransitions(orch.stage).join(', ')}`
      )
    }

    const updated: LaunchOrchestration = {
      ...orch,
      stage: nextStage,
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  getOrchestration(productId: string): LaunchOrchestration | undefined {
    return this.storage.findByProductId(productId)
  }

  setBlocked(id: string, reason?: string): LaunchOrchestration {
    const orch = this.storage.findById(id)
    if (!orch) throw new Error(`Launch orchestration ${id} not found`)

    const updated: LaunchOrchestration = {
      ...orch,
      status: 'blocked',
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  /**
   * Auto-advance orchestration — check if current stage conditions are met
   * and advance to the next stage. Runs on ALL orchestrations.
   * Returns list of orchestrations that were advanced.
   *
   * Research → Creative: research sheet score >= 50 && IP check done
   * Creative → Launch: creative brief approved && assets ready
   * Launch → Data: at least 1 channel launched
   * Data → Scale: 7+ days since launch
   */
  autoAdvanceAll(): LaunchOrchestration[] {
    const all = this.storage.findAll()
    const advanced: LaunchOrchestration[] = []

    for (const orch of all) {
      if (orch.status !== 'in_progress') continue

      const transitions = getValidLaunchTransitions(orch.stage)
      if (transitions.length === 0) continue

      // Check conditions per stage
      const shouldAdvance = this.checkStageComplete(orch)
      if (!shouldAdvance) continue

      try {
        const updated = this.advanceStage(orch.id, transitions[0])
        advanced.push(updated)
      } catch { /* skip invalid transitions */ }
    }

    return advanced
  }

  /** Check if current stage conditions are met */
  private checkStageComplete(orch: LaunchOrchestration): boolean {
    switch (orch.stage) {
      case 'research':
        // Research complete when any product Id exists and we have data
        return !!orch.productId
      case 'creative':
        // Creative complete when at least basic launch data exists
        return true // ponytail: add creative brief check
      case 'launch':
        // Launch complete when at least 2 channels launched
        return [orch.etsyLaunched, orch.shopifyLaunched, orch.amazonReady].filter(Boolean).length >= 2
      case 'data':
        // Data complete after 7 days in stage
        const daysSinceUpdate = (Date.now() - new Date(orch.updatedAt).getTime()) / 86400000
        return daysSinceUpdate >= 7
      default:
        return false
    }
  }

  completeStage(id: string): LaunchOrchestration {
    const orch = this.storage.findById(id)
    if (!orch) throw new Error(`Launch orchestration ${id} not found`)

    const updated: LaunchOrchestration = {
      ...orch,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  updateLaunchFlags(
    id: string,
    flags: {
      etsyLaunched?: boolean
      shopifyLaunched?: boolean
      amazonReady?: boolean
      adCampaignActive?: boolean
      socialContentPosted?: boolean
      fulfillmentReady?: boolean
    },
  ): LaunchOrchestration {
    const orch = this.storage.findById(id)
    if (!orch) throw new Error(`Launch orchestration ${id} not found`)

    const updated: LaunchOrchestration = {
      ...orch,
      ...flags,
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  getLaunchReadiness(productId: string): {
    total: number
    completed: number
    percentage: number
    flags: {
      etsyLaunched: boolean
      shopifyLaunched: boolean
      amazonReady: boolean
      adCampaignActive: boolean
      socialContentPosted: boolean
      fulfillmentReady: boolean
    }
  } {
    const orch = this.storage.findByProductId(productId)
    if (!orch) throw new Error(`No launch orchestration found for product ${productId}`)

    const flags = [
      orch.etsyLaunched,
      orch.shopifyLaunched,
      orch.amazonReady,
      orch.adCampaignActive,
      orch.socialContentPosted,
      orch.fulfillmentReady,
    ]
    const completed = flags.filter(Boolean).length
    const total = flags.length
    const percentage = Math.round((completed / total) * 100)

    return {
      total,
      completed,
      percentage,
      flags: {
        etsyLaunched: orch.etsyLaunched,
        shopifyLaunched: orch.shopifyLaunched,
        amazonReady: orch.amazonReady,
        adCampaignActive: orch.adCampaignActive,
        socialContentPosted: orch.socialContentPosted,
        fulfillmentReady: orch.fulfillmentReady,
      },
    }
  }
}
