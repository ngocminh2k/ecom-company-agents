/**
 * SLA Monitor Service — Track SLA events, detect breaches, generate compliance reports.
 *
 * SOP Section 30: Operation meeting cadence with SLA tracking for support and fulfillment.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export interface SlaEvent {
  id: string
  processName: string
  objectId: string | null
  slaHours: number
  breachedAt: string | null
  severity: 'warning' | 'breach' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
}

export interface SlaEventInput {
  processName: string
  objectId?: string
  slaHours: number
}

export interface SlaBreach {
  id: string
  processName: string
  objectId: string | null
  slaHours: number
  elapsedHours: number
  severity: 'warning' | 'breach' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
}

export interface SlaDashboard {
  totalActive: number
  totalBreached: number
  complianceRate: number
  byProcess: Record<string, { active: number; breached: number; total: number }>
  activeBreaches: SlaBreach[]
  periodDays: number
}

export interface SlaStorage {
  findAll(): SlaEvent[]
  findActive(): SlaEvent[]
  findBreached(): SlaEvent[]
  findById(id: string): SlaEvent | undefined
  insert(event: SlaEvent): void
  update(id: string, updates: Partial<SlaEvent>): void
}

export class SlaMonitorService {
  private readonly WARNING_THRESHOLD = 0.8 // 80% of SLA elapsed = warning

  constructor(private storage: SlaStorage) {}

  createSlaEvent(input: SlaEventInput): SlaEvent {
    const event: SlaEvent = {
      id: crypto.randomUUID(),
      processName: input.processName,
      objectId: input.objectId ?? null,
      slaHours: input.slaHours,
      breachedAt: null,
      severity: 'warning',
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    this.storage.insert(event)
    return event
  }

  acknowledgeSlaEvent(id: string): SlaEvent {
    const event = this.storage.findById(id)
    if (!event) throw new Error(`SLA event ${id} not found`)
    this.storage.update(id, { status: 'acknowledged' })
    return { ...event, status: 'acknowledged' }
  }

  resolveSlaEvent(id: string): SlaEvent {
    const event = this.storage.findById(id)
    if (!event) throw new Error(`SLA event ${id} not found`)
    this.storage.update(id, { status: 'resolved' })
    return { ...event, status: 'resolved' }
  }

  checkAllSlas(): SlaEvent[] {
    const active = this.storage.findActive()
    const now = new Date()
    const breached: SlaEvent[] = []

    for (const event of active) {
      const created = new Date(event.createdAt)
      const elapsedMs = now.getTime() - created.getTime()
      const elapsedHours = elapsedMs / (1000 * 60 * 60)
      const ratio = elapsedHours / event.slaHours

      let newSeverity: 'warning' | 'breach' | 'critical' | undefined
      let newBreachedAt: string | undefined

      if (ratio >= 1.5) {
        newSeverity = 'critical'
        newBreachedAt = event.breachedAt ?? now.toISOString()
      } else if (ratio >= 1.0) {
        newSeverity = 'breach'
        newBreachedAt = event.breachedAt ?? now.toISOString()
      } else if (ratio >= this.WARNING_THRESHOLD && event.severity !== 'breach' && event.severity !== 'critical') {
        newSeverity = 'warning'
      }

      if (newSeverity && newSeverity !== event.severity) {
        const updates: Partial<SlaEvent> = {
          severity: newSeverity,
          ...(newBreachedAt ? { breachedAt: newBreachedAt } : {}),
        }
        this.storage.update(event.id, updates)
        breached.push({ ...event, ...updates })
      }
    }

    return breached
  }

  getActiveBreaches(): SlaBreach[] {
    const events = this.storage.findActive()
    const now = new Date()
    const breaches: SlaBreach[] = []

    for (const event of events) {
      if (event.severity === 'warning') continue
      const created = new Date(event.createdAt)
      const elapsedHours = Math.round(((now.getTime() - created.getTime()) / (1000 * 60 * 60)) * 100) / 100

      breaches.push({
        id: event.id,
        processName: event.processName,
        objectId: event.objectId,
        slaHours: event.slaHours,
        elapsedHours,
        severity: event.severity,
        status: event.status,
        createdAt: event.createdAt,
      })
    }

    return breaches.sort((a, b) => b.elapsedHours - a.elapsedHours)
  }

  getSlaDashboard(periodDays: number = 30): SlaDashboard {
    const all = this.storage.findAll()
    const active = all.filter((e) => e.status === 'active')
    const breached = all.filter((e) => e.breachedAt !== null)

    const totalEvents = all.length
    const totalBreached = breached.length
    const complianceRate = totalEvents > 0
      ? Math.round(((totalEvents - totalBreached) / totalEvents) * 10000) / 100
      : 100

    const byProcess: Record<string, { active: number; breached: number; total: number }> = {}
    for (const event of all) {
      if (!byProcess[event.processName]) {
        byProcess[event.processName] = { active: 0, breached: 0, total: 0 }
      }
      byProcess[event.processName].total++
      if (event.status === 'active') byProcess[event.processName].active++
      if (event.breachedAt) byProcess[event.processName].breached++
    }

    return {
      totalActive: active.length,
      totalBreached,
      complianceRate,
      byProcess,
      activeBreaches: this.getActiveBreaches(),
      periodDays,
    }
  }
}
