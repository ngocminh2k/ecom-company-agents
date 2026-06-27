export type RetentionEventType = 
  | 'abandoned_cart'
  | 'post_purchase_followup'
  | 'churn_risk_detected'
  | 'vip_threshold_reached';

export interface RetentionEvent {
  eventId: string;
  customerId: string;
  type: RetentionEventType;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface AutomationRule {
  ruleId: string;
  triggerEvent: RetentionEventType;
  cooldownHours: number;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than';
    value: string | number;
  }>;
  action: {
    type: 'issue_coupon' | 'send_email' | 'flag_for_support';
    templateId?: string;
    discountValue?: number;
  };
}

export interface IRetentionStorage {
  getActiveRules(eventType: RetentionEventType): Promise<AutomationRule[]>;
  getLastExecutionTime(customerId: string, ruleId: string): Promise<Date | null>;
  logExecution(customerId: string, ruleId: string, actionResult: unknown): Promise<void>;
}

export class RetentionTriggerService {
  constructor(private readonly storage: IRetentionStorage) {}

  /**
   * Evaluates an incoming customer event against active retention rules and orchestrates required actions.
   */
  public async processEvent(event: RetentionEvent): Promise<void> {
    const activeRules = await this.storage.getActiveRules(event.type);

    for (const rule of activeRules) {
      const shouldExecute = await this.evaluateRule(rule, event);
      if (shouldExecute) {
        await this.executeRuleAction(rule, event);
      }
    }
  }

  /**
   * Batch evaluates time-bound retention triggers (e.g., exactly 60 days since last purchase without return).
   */
  public async processScheduledTriggers(referenceDate: Date): Promise<void> {
    // Scheduled triggers logic here - currently a placeholder
    return Promise.resolve();
  }

  /**
   * Checks event payload against rule criteria and verifies the customer has cleared the cooldown window.
   */
  private async evaluateRule(rule: AutomationRule, event: RetentionEvent): Promise<boolean> {
    // Check cooldown
    const lastExecution = await this.storage.getLastExecutionTime(event.customerId, rule.ruleId);
    
    if (lastExecution) {
      const hoursSinceLastExecution = (Date.now() - lastExecution.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastExecution < rule.cooldownHours) {
        return false;
      }
    }

    // Check conditions
    for (const condition of rule.conditions) {
      const payloadValue = event.payload[condition.field];
      
      if (payloadValue === undefined) {
        return false;
      }

      switch (condition.operator) {
        case 'equals':
          if (payloadValue !== condition.value) return false;
          break;
        case 'greater_than':
          if (typeof payloadValue !== 'number' || payloadValue <= Number(condition.value)) return false;
          break;
        case 'less_than':
          if (typeof payloadValue !== 'number' || payloadValue >= Number(condition.value)) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Dispatches the retention action (e.g., generating a one-time promo code or triggering an email webhook).
   */
  private async executeRuleAction(rule: AutomationRule, event: RetentionEvent): Promise<void> {
    let actionResult: unknown = null;

    switch (rule.action.type) {
      case 'issue_coupon':
        actionResult = { couponCode: `COUPON-${Math.random().toString(36).substring(7)}`, value: rule.action.discountValue };
        break;
      case 'send_email':
        actionResult = { emailSent: true, templateId: rule.action.templateId };
        break;
      case 'flag_for_support':
        actionResult = { flagged: true, reason: event.type };
        break;
    }

    await this.storage.logExecution(event.customerId, rule.ruleId, actionResult);
  }
}
