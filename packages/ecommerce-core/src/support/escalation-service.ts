/**
 * Escalation Service — determines when tickets should be escalated.
 *
 * SOP Section 14.3 step 8: escalate if beyond handling authority.
 * Rules based on refund amount, ticket type, and customer value.
 */

import type { SupportTicket } from './ticket-service.js'
import type { RefundRequest } from './refund-service.js'

export interface EscalationRule {
  condition: 'amount_exceeds' | 'type_is' | 'repeat_offender' | 'high_value_customer'
  threshold?: number
  value?: string
  escalateTo: 'team_lead' | 'manager' | 'director'
}

const AMOUNT_LEVELS: Array<{ max: number; level: string }> = [
  { max: 20, level: 'agent' },
  { max: 50, level: 'team_lead' },
  { max: 200, level: 'manager' },
  { max: Infinity, level: 'director' },
]

/**
 * Determine if a ticket should be escalated based on ticket type and refund amount.
 * Returns the escalation rule if escalation is needed, or null if the ticket
 * can be handled at the current level.
 */
export function shouldEscalate(
  ticket: SupportTicket,
  refund?: RefundRequest,
): EscalationRule | null {
  // Chargeback always escalates to manager
  if (ticket.ticketType === 'chargeback') {
    return {
      condition: 'type_is',
      value: 'chargeback',
      escalateTo: 'manager',
    }
  }

  // High-value refund escalates to director
  if (refund && refund.amount > 200) {
    return {
      condition: 'amount_exceeds',
      threshold: 200,
      escalateTo: 'director',
    }
  }

  // Medium-value refund escalates to team lead
  if (refund && refund.amount > 50) {
    return {
      condition: 'amount_exceeds',
      threshold: 50,
      escalateTo: 'team_lead',
    }
  }

  return null
}

/**
 * Get the appropriate escalation level for a given refund amount.
 * Returns the role level that has authority to approve this amount.
 */
export function getEscalationLevel(amount: number): string {
  for (const level of AMOUNT_LEVELS) {
    if (amount <= level.max) {
      return level.level
    }
  }
  return 'director'
}
