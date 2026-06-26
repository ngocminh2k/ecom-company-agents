import { describe, it, expect, beforeEach } from 'vitest';
import { FraudReviewService, FraudCaseStorage, FraudCase } from './fraud-review-service.js';

class MockFraudCaseStorage implements FraudCaseStorage {
  private cases: Map<string, FraudCase> = new Map();

  upsert(fraudCase: FraudCase): FraudCase {
    this.cases.set(fraudCase.id, fraudCase);
    return fraudCase;
  }

  findById(id: string): FraudCase | undefined {
    return this.cases.get(id);
  }

  findByStatus(status: FraudCase['status']): FraudCase[] {
    return Array.from(this.cases.values()).filter(c => c.status === status);
  }
}

describe('FraudReviewService', () => {
  let storage: MockFraudCaseStorage;
  let service: FraudReviewService;

  beforeEach(() => {
    storage = new MockFraudCaseStorage();
    service = new FraudReviewService(storage);
  });

  describe('flagOrder', () => {
    it('initializes a new case with status open', () => {
      const orderId = 'order-123';
      const fraudCase = service.flagOrder(orderId, 'high_value');

      expect(fraudCase.orderId).toBe(orderId);
      expect(fraudCase.reason).toBe('high_value');
      expect(fraudCase.status).toBe('open');
      expect(fraudCase.evidenceLogs).toEqual([]);
      expect(fraudCase.id).toBeDefined();
      expect(fraudCase.openedAt).toBeDefined();

      const stored = storage.findById(fraudCase.id);
      expect(stored).toEqual(fraudCase);
    });
  });

  describe('addEvidence', () => {
    it('appends evidence and transitions from open to under_investigation', () => {
      const fraudCase = service.flagOrder('order-123', 'address_mismatch');
      
      const updatedCase = service.addEvidence(fraudCase.id, 'IP address mismatch detected.');

      expect(updatedCase.evidenceLogs).toEqual(['IP address mismatch detected.']);
      expect(updatedCase.status).toBe('under_investigation');

      const stored = storage.findById(fraudCase.id);
      expect(stored).toEqual(updatedCase);
    });

    it('appends evidence without changing status if already under_investigation', () => {
      let fraudCase = service.flagOrder('order-123', 'address_mismatch');
      fraudCase = service.addEvidence(fraudCase.id, 'First evidence');
      
      expect(fraudCase.status).toBe('under_investigation');

      const updatedCase = service.addEvidence(fraudCase.id, 'Second evidence');

      expect(updatedCase.evidenceLogs).toEqual(['First evidence', 'Second evidence']);
      expect(updatedCase.status).toBe('under_investigation');
    });

    it('appends evidence without changing status if already resolved', () => {
      const fraudCase = service.flagOrder('order-123', 'address_mismatch');
      service.resolveCase(fraudCase.id, 'resolved_safe');

      const updatedCase = service.addEvidence(fraudCase.id, 'Additional post-resolution note');

      expect(updatedCase.evidenceLogs).toEqual(['Additional post-resolution note']);
      expect(updatedCase.status).toBe('resolved_safe');
    });

    it('throws error if case is not found', () => {
      expect(() => service.addEvidence('invalid-id', 'Evidence'))
        .toThrow('Fraud case with id invalid-id not found');
    });
  });

  describe('resolveCase', () => {
    it('resolves case as safe and stamps resolvedAt', () => {
      const fraudCase = service.flagOrder('order-123', 'psp_flagged');
      
      const resolvedCase = service.resolveCase(fraudCase.id, 'resolved_safe');

      expect(resolvedCase.status).toBe('resolved_safe');
      expect(resolvedCase.resolvedAt).toBeDefined();

      const stored = storage.findById(fraudCase.id);
      expect(stored).toEqual(resolvedCase);
    });

    it('resolves case as fraud and stamps resolvedAt', () => {
      const fraudCase = service.flagOrder('order-123', 'psp_flagged');
      
      const resolvedCase = service.resolveCase(fraudCase.id, 'resolved_fraud');

      expect(resolvedCase.status).toBe('resolved_fraud');
      expect(resolvedCase.resolvedAt).toBeDefined();
    });

    it('throws error if case is not found', () => {
      expect(() => service.resolveCase('invalid-id', 'resolved_safe'))
        .toThrow('Fraud case with id invalid-id not found');
    });
  });
});
