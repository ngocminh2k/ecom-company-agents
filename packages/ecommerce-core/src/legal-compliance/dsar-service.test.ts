import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DsarService, DSARStorage, DSARRequest } from './dsar-service.js';

describe('DsarService', () => {
  let storage: DSARStorage;
  let service: DsarService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T10:00:00Z'));

    const db = new Map<string, DSARRequest>();

    storage = {
      create: vi.fn((req) => {
        db.set(req.id, req);
        return req;
      }),
      findById: vi.fn((id) => db.get(id)),
      findPending: vi.fn(() => Array.from(db.values()).filter(r => r.status === 'pending' || r.status === 'in_progress')),
      update: vi.fn((id, updates) => {
        const existing = db.get(id);
        if (!existing) throw new Error('Not found');
        const updated = { ...existing, ...updates };
        db.set(id, updated);
        return updated;
      })
    };

    service = new DsarService(storage);
  });

  describe('submitRequest', () => {
    it('initializes a ticket and sets deadline to 72 hours from now', () => {
      const result = service.submitRequest('customer1', 'access');
      
      expect(result.customerId).toBe('customer1');
      expect(result.type).toBe('access');
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBe('2026-06-26T10:00:00.000Z');
      expect(result.deadlineAt).toBe('2026-06-29T10:00:00.000Z');
      
      expect(storage.create).toHaveBeenCalledWith(result);
    });

    it('throws error if customerId is empty', () => {
      expect(() => service.submitRequest('', 'access')).toThrow('customerId is required');
    });
  });

  describe('fulfillRequest', () => {
    it('transitions request to fulfilled and sets fulfilledAt', () => {
      const req = service.submitRequest('customer1', 'access');
      vi.setSystemTime(new Date('2026-06-27T10:00:00Z'));
      
      const fulfilled = service.fulfillRequest(req.id);
      
      expect(fulfilled.status).toBe('fulfilled');
      expect(fulfilled.fulfilledAt).toBe('2026-06-27T10:00:00.000Z');
    });

    it('throws error if request not found', () => {
      expect(() => service.fulfillRequest('non-existent')).toThrow('DSAR request non-existent not found');
    });

    it('throws error if already fulfilled', () => {
      const req = service.submitRequest('customer1', 'access');
      service.fulfillRequest(req.id);
      expect(() => service.fulfillRequest(req.id)).toThrow('Cannot fulfill an already closed DSAR request');
    });
    
    it('throws error if already rejected', () => {
      const req = service.submitRequest('customer1', 'access');
      service.rejectRequest(req.id, 'Identity unverified');
      expect(() => service.fulfillRequest(req.id)).toThrow('Cannot fulfill an already closed DSAR request');
    });
  });

  describe('rejectRequest', () => {
    it('transitions request to rejected and records reason', () => {
      const req = service.submitRequest('customer1', 'deletion');
      
      const rejected = service.rejectRequest(req.id, 'Invalid request');
      
      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Invalid request');
    });

    it('throws error if reason is empty', () => {
      const req = service.submitRequest('customer1', 'deletion');
      expect(() => service.rejectRequest(req.id, '   ')).toThrow('Rejection reason is required to provide legal justification to the consumer');
    });

    it('throws error if already closed', () => {
      const req = service.submitRequest('customer1', 'access');
      service.fulfillRequest(req.id);
      expect(() => service.rejectRequest(req.id, 'Reason')).toThrow('Cannot reject an already closed DSAR request');
    });
  });

  describe('getAtRiskRequests', () => {
    it('returns requests with less than 24h remaining', () => {
      // Create request 1 (deadline 72h away)
      service.submitRequest('customer1', 'access');
      
      // Move time forward by 50h (22h remaining)
      vi.setSystemTime(new Date('2026-06-28T12:00:00Z'));
      
      // Create request 2 (deadline 72h away from now)
      service.submitRequest('customer2', 'access');
      
      const atRisk = service.getAtRiskRequests();
      
      expect(atRisk.length).toBe(1);
      expect(atRisk[0].customerId).toBe('customer1');
    });
    
    it('returns empty array if no requests are at risk', () => {
      service.submitRequest('customer1', 'access');
      
      const atRisk = service.getAtRiskRequests();
      
      expect(atRisk.length).toBe(0);
    });
  });
});
