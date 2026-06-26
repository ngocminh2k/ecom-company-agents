export type RequisitionStatus = 'draft' | 'pending_approval' | 'approved' | 'open' | 'filled' | 'cancelled';
export type CandidateStage = 'applied' | 'screening' | 'interviewing' | 'offered' | 'hired' | 'rejected';

export interface HeadcountRequisition {
  id: string;
  departmentId: string;
  jobTitle: string;
  level: string;
  headcount: number;
  budgetRange: { min: number; max: number; currency: string };
  status: RequisitionStatus;
  requestorId: string;
  createdAt: string;
  approvedAt?: string;
}

export interface Candidate {
  id: string;
  requisitionId: string;
  name: string;
  email: string;
  stage: CandidateStage;
  appliedAt: string;
  scorecardResult?: number;
}

export interface HRStorage {
  createRequisition(req: HeadcountRequisition): HeadcountRequisition;
  findRequisitionById(id: string): HeadcountRequisition | undefined;
  updateRequisition(id: string, updates: Partial<HeadcountRequisition>): HeadcountRequisition;

  createCandidate(candidate: Candidate): Candidate;
  findCandidateById(id: string): Candidate | undefined;
  updateCandidate(id: string, updates: Partial<Candidate>): Candidate;
}

export class RecruitmentService {
  constructor(private storage: HRStorage) {}

  requestHeadcount(requestorId: string, departmentId: string, jobTitle: string, headcount: number, minBudget: number, maxBudget: number): HeadcountRequisition {
    if (headcount <= 0) {
      throw new Error('Headcount must be positive');
    }

    // Immutability principle: creates new object instead of mutating
    const request: HeadcountRequisition = {
      id: crypto.randomUUID(),
      departmentId,
      jobTitle,
      level: 'entry', // Can be expanded later
      headcount,
      budgetRange: { min: minBudget, max: maxBudget, currency: 'VND' },
      status: 'pending_approval',
      requestorId,
      createdAt: new Date().toISOString()
    };

    return this.storage.createRequisition(request);
  }

  approveRequisition(reqId: string, approverId: string): HeadcountRequisition {
    const req = this.storage.findRequisitionById(reqId);
    if (!req) {
      throw new Error(`Requisition ${reqId} not found`);
    }
    if (req.status !== 'pending_approval') {
      throw new Error('Only pending requisitions can be approved');
    }

    // Immutability principle via storage interface (return new copy)
    const updates: Partial<HeadcountRequisition> = {
      status: 'approved',
      approvedAt: new Date().toISOString()
    };

    return this.storage.updateRequisition(reqId, updates);
  }

  openRequisition(reqId: string): HeadcountRequisition {
    const req = this.storage.findRequisitionById(reqId);
    if (!req) {
      throw new Error(`Requisition ${reqId} not found`);
    }
    if (req.status !== 'approved') {
      throw new Error('Only approved requisitions can be opened for hiring');
    }

    return this.storage.updateRequisition(reqId, { status: 'open' });
  }
}
