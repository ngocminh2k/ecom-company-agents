import type { OrderEntity } from '../order/entity.js'

export type TicketSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TicketCategory =
  | 'ORDER_STATUS'
  | 'REFUND_RETURN'
  | 'DATA_PRIVACY'
  | 'FRAUD_ALERT'
  | 'PRODUCT_QUALITY'
  | 'LEGAL_COMPLAINT'
  | 'GENERAL'

export type EscalationLevel = 'TIER_1_AGENT' | 'TIER_2_SPECIALIST' | 'TIER_3_WAR_ROOM'

export interface Customer {
  id: string
  email: string
  name: string
  isVip?: boolean
}

export interface TicketContext {
  ticketId: string
  customerId: string
  orderId?: string
  category: TicketCategory
  content: string
  sentimentScore?: number // -1.0 to 1.0
  tags: string[]
  createdAt: Date
}

export interface RoutingDecision {
  assignedLevel: EscalationLevel
  severity: TicketSeverity
  requiresLegalReview: boolean
  requiresSecurityReview: boolean
  autoResponseTemplateId?: string
  routingReason: string
  slaTargetHours: number
}

export interface SupportRule {
  id: string
  name: string
  description: string
  priority: number
  /**
   * Condition to check if this rule applies to the current ticket context
   */
  evaluate: (context: TicketContext, customer?: Customer, order?: OrderEntity) => boolean
  /**
   * Mutates or returns a new RoutingDecision based on the rule's logic
   */
  apply: (decision: RoutingDecision) => RoutingDecision
}

export class TicketRoutingEngine {
  private rules: SupportRule[] = []

  /**
   * Registers a new routing or escalation rule into the engine.
   * Rules are sorted by priority descending (higher number = higher priority).
   */
  public addRule(rule: SupportRule): void {
    this.rules.push(rule)
    // Sort lowest priority first so higher priority rules are applied last and override
    this.rules.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Evaluates a new support ticket against all active routing and escalation rules.
   * Determines the severity, SLA, and which support tier must handle the ticket.
   */
  public async evaluateTicket(
    context: TicketContext,
    customer?: Customer,
    order?: OrderEntity
  ): Promise<RoutingDecision> {
    // Base decision
    let decision: RoutingDecision = {
      assignedLevel: 'TIER_1_AGENT',
      severity: 'LOW',
      requiresLegalReview: false,
      requiresSecurityReview: false,
      routingReason: 'Default routing',
      slaTargetHours: 24, // Default SLA
    }

    // Apply rules in order of priority
    for (const rule of this.rules) {
      if (rule.evaluate(context, customer, order)) {
        decision = rule.apply({ ...decision })
      }
    }

    // Hardcoded safety net rules per SOP requirements
    if (context.category === 'DATA_PRIVACY' || context.category === 'LEGAL_COMPLAINT') {
      decision = {
        ...decision,
        assignedLevel: 'TIER_3_WAR_ROOM',
        requiresLegalReview: true,
        severity: 'CRITICAL',
        slaTargetHours: Math.min(decision.slaTargetHours, 4), // 4h SLA for legal
        routingReason: `System Override: Category ${context.category} requires War Room`,
      }
    }

    if (context.category === 'FRAUD_ALERT') {
      decision = {
        ...decision,
        assignedLevel: 'TIER_3_WAR_ROOM',
        requiresSecurityReview: true,
        severity: 'CRITICAL',
        slaTargetHours: Math.min(decision.slaTargetHours, 2), // 2h SLA for fraud
        routingReason: 'System Override: Category FRAUD_ALERT requires Security Review',
      }
    }

    return decision
  }

  /**
   * Re-evaluates an existing ticket to determine if it has breached SLA
   * and needs to be escalated to the next tier.
   */
  public async checkSlaBreach(
    context: TicketContext,
    currentLevel: EscalationLevel,
    lastUpdatedAt: Date,
    slaTargetHours: number
  ): Promise<RoutingDecision | null> {
    const now = new Date()
    const diffHours = Math.abs(now.getTime() - lastUpdatedAt.getTime()) / 36e5

    if (diffHours >= slaTargetHours) {
      // SLA Breached
      let newLevel: EscalationLevel = currentLevel
      if (currentLevel === 'TIER_1_AGENT') newLevel = 'TIER_2_SPECIALIST'
      else if (currentLevel === 'TIER_2_SPECIALIST') newLevel = 'TIER_3_WAR_ROOM'

      // We only re-evaluate standard routing reason.
      return {
        assignedLevel: newLevel,
        severity: newLevel === 'TIER_3_WAR_ROOM' ? 'CRITICAL' : 'HIGH',
        requiresLegalReview: context.category === 'DATA_PRIVACY' || context.category === 'LEGAL_COMPLAINT',
        requiresSecurityReview: context.category === 'FRAUD_ALERT',
        routingReason: `SLA Breach: Auto-escalated from ${currentLevel} due to >${slaTargetHours}h inactivity`,
        slaTargetHours: Math.max(1, slaTargetHours / 2), // Halve the next SLA
      }
    }

    return null
  }
}
