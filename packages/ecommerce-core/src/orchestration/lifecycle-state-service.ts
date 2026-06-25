/**
 * Lifecycle State Service — 3/7/14/30 day checkpoint reviews (SOP Section 22.4).
 *
 * Sau launch: review tai moc 3 ngay, 7 ngay, 14 ngay, 30 ngay.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export interface CheckpointDecision {
  reviewed: boolean
  notes?: string
  decision?: 'continue' | 'pause' | 'stop' | 'scale' | 'optimize' | 'keep'
}

export interface LifecycleCheckpoint {
  productId: string
  day3: CheckpointDecision
  day7: CheckpointDecision
  day14: CheckpointDecision
  day30: CheckpointDecision
}

export type LifecycleCheckpointDay = 'day3' | 'day7' | 'day14' | 'day30'

export const LIFECYCLE_CHECKPOINT_DAYS: Record<LifecycleCheckpointDay, { label: string; days: number; validDecisions: string[] }> = {
  day3:  { label: '3-Day Check',  days: 3,  validDecisions: ['continue', 'pause', 'stop'] },
  day7:  { label: '7-Day Check',  days: 7,  validDecisions: ['scale', 'optimize', 'stop'] },
  day14: { label: '14-Day Check', days: 14, validDecisions: ['scale', 'keep', 'optimize', 'stop'] },
  day30: { label: '30-Day Check', days: 30, validDecisions: ['scale', 'keep', 'optimize', 'stop'] },
} as const

export interface LifecycleState {
  id: string
  productId: string
  state: string
  checkpoint3day?: string
  checkpoint7day?: string
  checkpoint14day?: string
  checkpoint30day?: string
  createdAt: string
  updatedAt: string
}

export interface LifecycleStateStorage {
  findByProductId(productId: string): LifecycleState | undefined
  insert(state: LifecycleState): void
  update(id: string, updates: Partial<LifecycleState>): void
}

export class LifecycleStateService {
  constructor(private storage: LifecycleStateStorage) {}

  getCheckpoints(productId: string): LifecycleCheckpoint {
    const row = this.storage.findByProductId(productId)
    const parse = (json?: string): CheckpointDecision => {
      if (!json) return { reviewed: false }
      try {
        return JSON.parse(json) as CheckpointDecision
      } catch {
        return { reviewed: false }
      }
    }

    return {
      productId,
      day3:  parse(row?.checkpoint3day),
      day7:  parse(row?.checkpoint7day),
      day14: parse(row?.checkpoint14day),
      day30: parse(row?.checkpoint30day),
    }
  }

  recordCheckpoint(
    productId: string,
    day: LifecycleCheckpointDay,
    decision: string,
    notes?: string,
  ): LifecycleCheckpoint {
    const config = LIFECYCLE_CHECKPOINT_DAYS[day]
    if (!config) throw new Error(`Invalid checkpoint day: ${day}`)

    if (!config.validDecisions.includes(decision)) {
      throw new Error(
        `Invalid decision "${decision}" for ${config.label}. Valid: ${config.validDecisions.join(', ')}`
      )
    }

    const checkpoint: CheckpointDecision = {
      reviewed: true,
      decision: decision as any,
      notes: notes ?? undefined,
    }

    const fieldMap: Record<LifecycleCheckpointDay, keyof LifecycleState> = {
      day3:  'checkpoint3day',
      day7:  'checkpoint7day',
      day14: 'checkpoint14day',
      day30: 'checkpoint30day',
    }

    const now = new Date().toISOString()
    const existing = this.storage.findByProductId(productId)

    if (existing) {
      this.storage.update(existing.id, {
        [fieldMap[day]]: JSON.stringify(checkpoint),
        updatedAt: now,
      } as any)
    } else {
      this.storage.insert({
        id: crypto.randomUUID(),
        productId,
        state: 'launching',
        [fieldMap[day]]: JSON.stringify(checkpoint),
        createdAt: now,
        updatedAt: now,
      } as any)
    }

    return this.getCheckpoints(productId)
  }

  getDaysSinceLaunch(productId: string): number | null {
    const row = this.storage.findByProductId(productId)
    if (!row) return null

    const created = new Date(row.createdAt)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }
}
