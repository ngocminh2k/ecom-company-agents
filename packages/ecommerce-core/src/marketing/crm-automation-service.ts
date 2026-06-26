/**
 * CRM Lifecycle Automation Service — SOP Section Marketing
 * 
 * Determines lifecycle marketing eligibility based on customer behavior.
 */

export type CrmCampaignType = 'abandoned_cart' | 'post_purchase' | 'win_back' | 'none'

export interface CustomerBehaviorContext {
  customerId: string
  lastOrderDate?: string
  lastCartUpdateDate?: string
  hasItemsInCart: boolean
  lastEmailSentDate?: string
}

export interface CrmAutomationAction {
  eligibleCampaign: CrmCampaignType
  reason: string
  delayHours: number
}

export class CrmAutomationService {
  /**
   * Evaluate customer lifecycle state to determine the appropriate CRM campaign action.
   * 
   * Rules:
   * - Throttle: If last email was < 3 days ago, return 'none' (prevents spam).
   * - Abandoned Cart: hasItemsInCart = true, lastCartUpdateDate is 2-24 hours ago, and no order since cart update.
   * - Post-Purchase: lastOrderDate is 7-14 days ago.
   * - Win-back: lastOrderDate is > 90 days ago.
   * 
   * Returns 'none' if no conditions match.
   */
  evaluateCustomerLifecycle(context: CustomerBehaviorContext, now: Date = new Date()): CrmAutomationAction {
    // 1. Throttle Control: Max 1 email every 3 days (72 hours)
    if (context.lastEmailSentDate) {
      const emailDate = new Date(context.lastEmailSentDate)
      const hoursSinceLastEmail = this.diffInHours(now, emailDate)
      if (hoursSinceLastEmail < 72) {
        return {
          eligibleCampaign: 'none',
          reason: 'Throttled: Last email sent less than 3 days ago',
          delayHours: 0
        }
      }
    }

    // 2. Abandoned Cart
    if (context.hasItemsInCart && context.lastCartUpdateDate) {
      const cartDate = new Date(context.lastCartUpdateDate)
      const hoursSinceCartUpdate = this.diffInHours(now, cartDate)
      
      // Ensure no order was placed AFTER the cart was updated
      const orderAfterCart = context.lastOrderDate 
        ? new Date(context.lastOrderDate) > cartDate
        : false

      if (!orderAfterCart && hoursSinceCartUpdate >= 2 && hoursSinceCartUpdate <= 24) {
        return {
          eligibleCampaign: 'abandoned_cart',
          reason: 'Cart abandoned between 2 and 24 hours ago',
          delayHours: 2
        }
      }
    }

    // Evaluate order-based rules
    if (context.lastOrderDate) {
      const orderDate = new Date(context.lastOrderDate)
      const daysSinceLastOrder = this.diffInDays(now, orderDate)

      // 3. Post-Purchase Review/Cross-sell
      if (daysSinceLastOrder >= 7 && daysSinceLastOrder <= 14) {
        return {
          eligibleCampaign: 'post_purchase',
          reason: 'Last order was 7-14 days ago',
          delayHours: 0
        }
      }

      // 4. Win-back
      if (daysSinceLastOrder > 90) {
        return {
          eligibleCampaign: 'win_back',
          reason: 'Last order was over 90 days ago',
          delayHours: 0
        }
      }
    }

    // Default fallback
    return {
      eligibleCampaign: 'none',
      reason: 'No lifecycle rules matched',
      delayHours: 0
    }
  }

  private diffInHours(d1: Date, d2: Date): number {
    return (d1.getTime() - d2.getTime()) / (1000 * 60 * 60)
  }

  private diffInDays(d1: Date, d2: Date): number {
    return this.diffInHours(d1, d2) / 24
  }
}
