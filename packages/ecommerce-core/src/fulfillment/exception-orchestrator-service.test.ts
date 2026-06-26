import { describe, it, expect } from 'vitest'
import { FulfillmentExceptionOrchestrator } from './exception-orchestrator-service.js'

describe('FulfillmentExceptionOrchestrator', () => {
  it('should return no exceptions for a valid order', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      customerEmail: 'test@test.com',
      customerName: 'Test',
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
      customerEmail: 'test@test.com',
      customerName: 'Test',
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
      customerEmail: 'test@test.com',
      customerName: 'Test',
      shippingAddress: '123 Main St',
      isPersonalized: true,
      fraudScore: 10
    })

    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('missing_personalization')
  })

  it('should detect fraud risk and return early', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      customerEmail: 'test@test.com',
      customerName: 'Test',
      shippingAddress: '', // Should be ignored because fraud returns early
      isPersonalized: false,
      fraudScore: 85
    })

    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('fraud_risk')
    expect(exceptions[0].metadata).toEqual({ score: 85 })
  })

  it('should detect ambiguous personalization', async () => {
    const orchestrator = new FulfillmentExceptionOrchestrator()
    const exceptions = await orchestrator.validateOrder({
      id: '123',
      customerEmail: 'test@test.com',
      customerName: 'Test',
      shippingAddress: '123 Main St',
      isPersonalized: true,
      personalizationData: 'Make it blue or maybe red?',
      fraudScore: 10
    })

    expect(exceptions).toHaveLength(1)
    expect(exceptions[0].type).toBe('ambiguous_personalization')
  })
})
