import type { AgentRouterService } from '@ngocminh2k/agent-adapter'

export type ValidationExceptionType = 'invalid_address' | 'missing_personalization' | 'fraud_risk' | 'ambiguous_personalization'

export interface ValidationException {
  type: ValidationExceptionType
  message: string
  metadata?: Record<string, unknown>
}

export interface OrderData {
  id: string
  shippingAddress: string
  isPersonalized: boolean
  personalizationData?: string
  fraudScore: number
}

export class FulfillmentExceptionOrchestrator {
  constructor(private agentRouter?: AgentRouterService) {}

  async validateOrder(order: OrderData): Promise<ValidationException[]> {
    const exceptions: ValidationException[] = []

    if (!order.shippingAddress || order.shippingAddress.trim() === '') {
      exceptions.push({
        type: 'invalid_address',
        message: 'Shipping address is missing or empty'
      })
    }

    if (order.isPersonalized && !order.personalizationData) {
      exceptions.push({
        type: 'missing_personalization',
        message: 'Personalized order is missing personalization data'
      })
    }

    if (order.fraudScore > 80) {
      exceptions.push({
        type: 'fraud_risk',
        message: `High fraud risk detected (score: ${order.fraudScore})`,
        metadata: { score: order.fraudScore }
      })
    }

    // Check for ambiguous personalization
    if (order.isPersonalized && order.personalizationData && this.isAmbiguous(order.personalizationData)) {
      exceptions.push({
        type: 'ambiguous_personalization',
        message: 'Personalization data is ambiguous and requires customer clarification'
      })
      
      if (this.agentRouter) {
        // Asynchronously request a draft email without awaiting
        this.requestClarificationEmail(order).catch(console.error)
      }
    }

    return exceptions
  }

  private isAmbiguous(data: string): boolean {
    const lower = data.toLowerCase()
    return lower.includes('maybe') || lower.includes('or') || lower.includes('?') || lower.includes('not sure')
  }

  private async requestClarificationEmail(order: OrderData): Promise<void> {
    if (!this.agentRouter) return
    
    await this.agentRouter.routeTask('customer-service', {
      action: 'draft_clarification_email',
      orderId: order.id,
      personalizationData: order.personalizationData,
      reason: 'ambiguous_personalization'
    }, {
      preferredAgentId: 'customer-service' // Use the customer-service agent
    })
  }
}
