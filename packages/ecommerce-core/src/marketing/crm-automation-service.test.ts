import { describe, it, expect } from 'vitest'
import { CrmAutomationService, CustomerBehaviorContext } from './crm-automation-service'

describe('CrmAutomationService', () => {
  const service = new CrmAutomationService()
  // Mock 'now' as June 26, 2026, 12:00:00 UTC
  const MOCK_NOW = new Date('2026-06-26T12:00:00Z')

  const createDate = (hoursDelta: number) => {
    return new Date(MOCK_NOW.getTime() + hoursDelta * 60 * 60 * 1000).toISOString()
  }

  it('should return none when throttled (email sent < 3 days ago)', () => {
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: true,
      lastCartUpdateDate: createDate(-5), // 5 hours ago (matches abandoned cart)
      lastEmailSentDate: createDate(-48) // 2 days ago
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    expect(result.eligibleCampaign).toBe('none')
    expect(result.reason).toContain('Throttled')
  })

  it('should return abandoned_cart when cart updated 2-24 hours ago', () => {
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: true,
      lastCartUpdateDate: createDate(-3) // 3 hours ago
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    expect(result.eligibleCampaign).toBe('abandoned_cart')
    expect(result.delayHours).toBe(2)
  })

  it('should not return abandoned_cart if order was placed after cart update', () => {
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: true,
      lastCartUpdateDate: createDate(-5), // 5 hours ago
      lastOrderDate: createDate(-2) // Order placed 2 hours ago
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    // It shouldn't be abandoned cart. Since order is 2 hours ago, it doesn't match post-purchase either.
    expect(result.eligibleCampaign).toBe('none')
  })

  it('should return post_purchase when last order was 7-14 days ago', () => {
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: false,
      lastOrderDate: createDate(-10 * 24) // 10 days ago
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    expect(result.eligibleCampaign).toBe('post_purchase')
  })

  it('should return win_back when last order was > 90 days ago', () => {
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: false,
      lastOrderDate: createDate(-95 * 24) // 95 days ago
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    expect(result.eligibleCampaign).toBe('win_back')
  })

  it('should prioritize abandoned cart over win_back if both exist', () => {
    // A customer from 100 days ago comes back and abandons a cart today
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: true,
      lastCartUpdateDate: createDate(-5), // 5 hours ago
      lastOrderDate: createDate(-100 * 24) // 100 days ago
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    // Abandoned cart rules are checked first.
    expect(result.eligibleCampaign).toBe('abandoned_cart')
  })

  it('should return none when no rules match', () => {
    const context: CustomerBehaviorContext = {
      customerId: '123',
      hasItemsInCart: false,
      lastOrderDate: createDate(-3 * 24) // 3 days ago (too early for post-purchase)
    }
    const result = service.evaluateCustomerLifecycle(context, MOCK_NOW)
    expect(result.eligibleCampaign).toBe('none')
  })
})
