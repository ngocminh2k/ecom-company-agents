import { describe, it, expect, vi } from 'vitest';
import { RetentionTriggerService, IRetentionStorage, RetentionEvent, AutomationRule } from '../../retention/RetentionTriggerService';

class MockStorage implements IRetentionStorage {
  public getActiveRulesMock = vi.fn();
  public getLastExecutionTimeMock = vi.fn();
  public logExecutionMock = vi.fn();

  async getActiveRules(eventType: any) {
    return this.getActiveRulesMock(eventType);
  }

  async getLastExecutionTime(customerId: string, ruleId: string) {
    return this.getLastExecutionTimeMock(customerId, ruleId);
  }

  async logExecution(customerId: string, ruleId: string, actionResult: unknown) {
    return this.logExecutionMock(customerId, ruleId, actionResult);
  }
}

describe('RetentionTriggerService', () => {
  it('processEvent evaluates and executes applicable rules', async () => {
    const storage = new MockStorage();
    const service = new RetentionTriggerService(storage);

    const event: RetentionEvent = {
      eventId: 'evt_1',
      customerId: 'cust_1',
      type: 'abandoned_cart',
      payload: { cartValue: 150 },
      occurredAt: new Date(),
    };

    const rule: AutomationRule = {
      ruleId: 'rule_1',
      triggerEvent: 'abandoned_cart',
      cooldownHours: 24,
      conditions: [
        { field: 'cartValue', operator: 'greater_than', value: 100 }
      ],
      action: {
        type: 'issue_coupon',
        discountValue: 10
      }
    };

    storage.getActiveRulesMock.mockResolvedValueOnce([rule]);
    storage.getLastExecutionTimeMock.mockResolvedValueOnce(null);

    await service.processEvent(event);

    expect(storage.getActiveRulesMock).toHaveBeenCalledWith('abandoned_cart');
    expect(storage.getLastExecutionTimeMock).toHaveBeenCalledWith('cust_1', 'rule_1');
    expect(storage.logExecutionMock).toHaveBeenCalled();
    
    const executionCall = storage.logExecutionMock.mock.calls[0] as any[];
    expect(executionCall[0]).toBe('cust_1');
    expect(executionCall[1]).toBe('rule_1');
    expect(executionCall[2]).toHaveProperty('couponCode');
    expect(executionCall[2]).toHaveProperty('value', 10);
  });

  it('processEvent skips execution if within cooldown period', async () => {
    const storage = new MockStorage();
    const service = new RetentionTriggerService(storage);

    const event: RetentionEvent = {
      eventId: 'evt_2',
      customerId: 'cust_2',
      type: 'abandoned_cart',
      payload: { cartValue: 150 },
      occurredAt: new Date(),
    };

    const rule: AutomationRule = {
      ruleId: 'rule_2',
      triggerEvent: 'abandoned_cart',
      cooldownHours: 24,
      conditions: [
        { field: 'cartValue', operator: 'greater_than', value: 100 }
      ],
      action: {
        type: 'send_email',
        templateId: 'tpl_1'
      }
    };

    storage.getActiveRulesMock.mockResolvedValueOnce([rule]);

    // Last executed 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    storage.getLastExecutionTimeMock.mockResolvedValueOnce(twoHoursAgo);

    await service.processEvent(event);

    expect(storage.getLastExecutionTimeMock).toHaveBeenCalled();
    expect(storage.logExecutionMock).not.toHaveBeenCalled();
  });

  it('processEvent skips execution if conditions are not met', async () => {
    const storage = new MockStorage();
    const service = new RetentionTriggerService(storage);

    const event: RetentionEvent = {
      eventId: 'evt_3',
      customerId: 'cust_3',
      type: 'abandoned_cart',
      payload: { cartValue: 50 },
      occurredAt: new Date(),
    };

    const rule: AutomationRule = {
      ruleId: 'rule_3',
      triggerEvent: 'abandoned_cart',
      cooldownHours: 24,
      conditions: [
        { field: 'cartValue', operator: 'greater_than', value: 100 }
      ],
      action: {
        type: 'flag_for_support'
      }
    };

    storage.getActiveRulesMock.mockResolvedValueOnce([rule]);
    storage.getLastExecutionTimeMock.mockResolvedValueOnce(null);

    await service.processEvent(event);

    expect(storage.logExecutionMock).not.toHaveBeenCalled();
  });
});
