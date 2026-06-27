import { expect, test, describe, beforeEach } from 'vitest'
import {
  TicketRoutingEngine,
  TicketContext,
  Customer,
} from './TicketRoutingEngine.js'
import type { OrderEntity } from '../order/entity.js'

describe('TicketRoutingEngine', () => {
  let engine: TicketRoutingEngine

  beforeEach(() => {
    engine = new TicketRoutingEngine()
  })

  test('default routing for standard ticket', async () => {
    const context: TicketContext = {
      ticketId: 't1',
      customerId: 'c1',
      category: 'GENERAL',
      content: 'Where is my order?',
      tags: [],
      createdAt: new Date(),
    }

    const decision = await engine.evaluateTicket(context)

    expect(decision.assignedLevel).toBe('TIER_1_AGENT')
    expect(decision.severity).toBe('LOW')
    expect(decision.slaTargetHours).toBe(24)
    expect(decision.requiresLegalReview).toBe(false)
    expect(decision.requiresSecurityReview).toBe(false)
  })

  test('hardcoded safety net routes DATA_PRIVACY to TIER_3_WAR_ROOM', async () => {
    const context: TicketContext = {
      ticketId: 't2',
      customerId: 'c1',
      category: 'DATA_PRIVACY',
      content: 'Delete my account immediately',
      tags: [],
      createdAt: new Date(),
    }

    const decision = await engine.evaluateTicket(context)

    expect(decision.assignedLevel).toBe('TIER_3_WAR_ROOM')
    expect(decision.severity).toBe('CRITICAL')
    expect(decision.requiresLegalReview).toBe(true)
    expect(decision.slaTargetHours).toBe(4)
  })

  test('hardcoded safety net routes FRAUD_ALERT to TIER_3_WAR_ROOM', async () => {
    const context: TicketContext = {
      ticketId: 't3',
      customerId: 'c1',
      category: 'FRAUD_ALERT',
      content: 'I did not make this purchase',
      tags: [],
      createdAt: new Date(),
    }

    const decision = await engine.evaluateTicket(context)

    expect(decision.assignedLevel).toBe('TIER_3_WAR_ROOM')
    expect(decision.severity).toBe('CRITICAL')
    expect(decision.requiresSecurityReview).toBe(true)
    expect(decision.slaTargetHours).toBe(2)
  })

  test('custom rule routes VIP customers to TIER_2_SPECIALIST', async () => {
    engine.addRule({
      id: 'vip-rule',
      name: 'VIP Customer Routing',
      description: 'Route VIP customers to Tier 2 with higher priority',
      priority: 100,
      evaluate: (ctx, customer) => !!customer?.isVip,
      apply: (decision) => ({
        ...decision,
        assignedLevel: 'TIER_2_SPECIALIST',
        severity: decision.severity === 'LOW' ? 'MEDIUM' : decision.severity,
        slaTargetHours: 8,
        routingReason: 'VIP Customer SLA',
      }),
    })

    const context: TicketContext = {
      ticketId: 't4',
      customerId: 'vip1',
      category: 'ORDER_STATUS',
      content: 'Status check',
      tags: [],
      createdAt: new Date(),
    }

    const vipCustomer: Customer = {
      id: 'vip1',
      email: 'vip@example.com',
      name: 'VIP User',
      isVip: true,
    }

    const decision = await engine.evaluateTicket(context, vipCustomer)

    expect(decision.assignedLevel).toBe('TIER_2_SPECIALIST')
    expect(decision.severity).toBe('MEDIUM')
    expect(decision.slaTargetHours).toBe(8)
    expect(decision.routingReason).toBe('VIP Customer SLA')
  })

  test('custom rules are applied in priority order', async () => {
    // Low priority rule
    engine.addRule({
      id: 'rule-low',
      name: 'Low Priority',
      description: 'Set to Tier 1',
      priority: 10,
      evaluate: () => true,
      apply: (decision) => ({
        ...decision,
        assignedLevel: 'TIER_1_AGENT',
        routingReason: 'Rule Low',
      }),
    })

    // High priority rule
    engine.addRule({
      id: 'rule-high',
      name: 'High Priority',
      description: 'Set to Tier 2',
      priority: 50,
      evaluate: () => true,
      apply: (decision) => ({
        ...decision,
        assignedLevel: 'TIER_2_SPECIALIST',
        routingReason: 'Rule High',
      }),
    })

    const context: TicketContext = {
      ticketId: 't5',
      customerId: 'c1',
      category: 'GENERAL',
      content: 'test',
      tags: [],
      createdAt: new Date(),
    }

    const decision = await engine.evaluateTicket(context)

    // Wait, the rules apply sequentially: 50 first, then 10?
    // In our code:
    // for (const rule of this.rules) { ... }
    // If priority 50 runs first, it sets Tier 2. Then priority 10 runs, it sets Tier 1.
    // That means the LOWER priority rule overwrites the higher priority rule!
    // Let's check how the rules are applied.

    // Ah! It's better if higher priority runs LAST so it overwrites, or FIRST and we stop.
    // Since our logic was:
    // this.rules.sort((a, b) => b.priority - a.priority) // highest first
    // And then we loop and apply all that match.
    // The LAST matched rule wins (lowest priority). That is a BUG in the engine.

    // The test will expect Tier 2 to win because High Priority > Low Priority.
    expect(decision.assignedLevel).toBe('TIER_2_SPECIALIST')
  })

  test('SLA breach auto-escalates from TIER_1 to TIER_2', async () => {
    const context: TicketContext = {
      ticketId: 't6',
      customerId: 'c1',
      category: 'GENERAL',
      content: 'Test breach',
      tags: [],
      createdAt: new Date(Date.now() - 36e5 * 25), // 25 hours ago
    }

    const decision = await engine.checkSlaBreach(
      context,
      'TIER_1_AGENT',
      new Date(Date.now() - 36e5 * 25), // Last updated 25h ago
      24 // SLA is 24h
    )

    expect(decision).not.toBeNull()
    expect(decision?.assignedLevel).toBe('TIER_2_SPECIALIST')
    expect(decision?.severity).toBe('HIGH')
    expect(decision?.routingReason).toContain('SLA Breach: Auto-escalated')
  })

  test('checkSlaBreach returns null if SLA is not breached', async () => {
    const context: TicketContext = {
      ticketId: 't7',
      customerId: 'c1',
      category: 'GENERAL',
      content: 'Test no breach',
      tags: [],
      createdAt: new Date(Date.now() - 36e5 * 5),
    }

    const decision = await engine.checkSlaBreach(
      context,
      'TIER_1_AGENT',
      new Date(Date.now() - 36e5 * 5), // 5 hours ago
      24
    )

    expect(decision).toBeNull()
  })
})