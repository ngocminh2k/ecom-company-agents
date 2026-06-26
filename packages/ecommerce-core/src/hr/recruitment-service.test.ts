import { describe, it, expect, beforeEach } from 'vitest';
import { RecruitmentService, HRStorage, HeadcountRequisition, Candidate } from './recruitment-service';

class MockHRStorage implements HRStorage {
  private requisitions = new Map<string, HeadcountRequisition>();
  private candidates = new Map<string, Candidate>();

  createRequisition(req: HeadcountRequisition): HeadcountRequisition {
    this.requisitions.set(req.id, req);
    return req;
  }

  findRequisitionById(id: string): HeadcountRequisition | undefined {
    return this.requisitions.get(id);
  }

  updateRequisition(id: string, updates: Partial<HeadcountRequisition>): HeadcountRequisition {
    const existing = this.requisitions.get(id);
    if (!existing) throw new Error('Requisition not found');
    const updated = { ...existing, ...updates };
    this.requisitions.set(id, updated);
    return updated;
  }

  createCandidate(candidate: Candidate): Candidate {
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  findCandidateById(id: string): Candidate | undefined {
    return this.candidates.get(id);
  }

  updateCandidate(id: string, updates: Partial<Candidate>): Candidate {
    const existing = this.candidates.get(id);
    if (!existing) throw new Error('Candidate not found');
    const updated = { ...existing, ...updates };
    this.candidates.set(id, updated);
    return updated;
  }
}

describe('RecruitmentService', () => {
  let storage: MockHRStorage;
  let service: RecruitmentService;

  beforeEach(() => {
    storage = new MockHRStorage();
    service = new RecruitmentService(storage);
  });

  describe('requestHeadcount', () => {
    it('creates a pending headcount requisition successfully', () => {
      const req = service.requestHeadcount(
        'user-1',
        'dept-1',
        'Software Engineer',
        2,
        20000000,
        40000000
      );

      expect(req.id).toBeDefined();
      expect(req.status).toBe('pending_approval');
      expect(req.jobTitle).toBe('Software Engineer');
      expect(req.headcount).toBe(2);
      expect(req.budgetRange).toEqual({ min: 20000000, max: 40000000, currency: 'VND' });

      const stored = storage.findRequisitionById(req.id);
      expect(stored).toEqual(req);
    });

    it('throws error if headcount is less than or equal to 0', () => {
      expect(() => {
        service.requestHeadcount('user-1', 'dept-1', 'Software Engineer', 0, 1, 2);
      }).toThrow('Headcount must be positive');
    });
  });

  describe('approveRequisition', () => {
    it('approves a pending requisition', () => {
      const req = service.requestHeadcount(
        'user-1',
        'dept-1',
        'Software Engineer',
        1,
        20000000,
        40000000
      );

      const approved = service.approveRequisition(req.id, 'approver-1');
      expect(approved.status).toBe('approved');
      expect(approved.approvedAt).toBeDefined();
    });

    it('throws error if requisition is not found', () => {
      expect(() => {
        service.approveRequisition('non-existent', 'approver-1');
      }).toThrow('Requisition non-existent not found');
    });

    it('throws error if requisition is not pending', () => {
      const req = service.requestHeadcount('user-1', 'dept-1', 'Engineer', 1, 10, 20);
      service.approveRequisition(req.id, 'approver-1'); // Now approved

      expect(() => {
        service.approveRequisition(req.id, 'approver-2');
      }).toThrow('Only pending requisitions can be approved');
    });
  });

  describe('openRequisition', () => {
    it('opens an approved requisition', () => {
      const req = service.requestHeadcount('user-1', 'dept-1', 'Engineer', 1, 10, 20);
      const approved = service.approveRequisition(req.id, 'approver-1');

      const opened = service.openRequisition(approved.id);
      expect(opened.status).toBe('open');
    });

    it('throws error if requisition is not found', () => {
      expect(() => {
        service.openRequisition('non-existent');
      }).toThrow('Requisition non-existent not found');
    });

    it('throws error if requisition is not approved', () => {
      const req = service.requestHeadcount('user-1', 'dept-1', 'Engineer', 1, 10, 20);

      expect(() => {
        service.openRequisition(req.id);
      }).toThrow('Only approved requisitions can be opened for hiring');
    });
  });
});
