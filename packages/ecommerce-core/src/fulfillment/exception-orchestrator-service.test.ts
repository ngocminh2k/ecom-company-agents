import { describe, it, expect, vi } from 'vitest'
import { FulfillmentExceptionOrchestrator } from './exception-orchestrator-service.js'
import type { AgentRouterService } from '@ngocminh2k/agent-adapter'

describe('FulfillmentExceptionOrchestrator', () => {
  it('should return no exceptions for a valid order', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      shippingAddress: '123 Main St',
      isPersonalized: false,
      fraudScore: 10
    })
    
    expect(exceptions).toHaveLength(0)
  })

  it('should detect invalid address', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      shippingAddress: '',
      isPersonalized: false,
      fraudScore: 10
    })
    
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('invalid_address')
  })

  it('should detect missing personalization', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      shippingAddress: '123 Main St',
      isPersonalized: true,
      fraudScore: 10
    })
    
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('missing_personalization')
  })

  it('should detect fraud risk', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      shippingAddress: '123 Main St',
      isPersonalized: false,
      fraudScore: 85
    })
    
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('fraud_risk')
    expect(exceptions[0].metadata).toEqual({ score: 85 })
  })

  it('should detect ambiguous personalization and trigger agent router', async () => {
    const mockRouteTask = vi.fn().mockResolvedValue({})
    const mockRouter = { routeTask: mockRouteTask } as unknown as AgentRouterService
    
    const orchestrator = new FulfillmentExceptionOrchestrator(mockRouter)
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      shippingAddress: '123 Main St',
      isPersonalized: true,
      personalizationData: 'Make it blue or maybe red?',
      fraudScore: 10
    })
    
    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('ambiguous_personalization')
    
    // Give promises time to resolve since requestClarificationEmail is not awaited
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockRouteTask).toHaveBeenCalledWith(
      'customer-service',
      expect.objectContaining({
        action: 'draft_clarification_email',
        orderId: '123',
        reason: 'ambiguous_personalization'
      }),
      expect.objectContaining({
        preferredAgentId: 'customer-service'
      })
    )
  })
})
