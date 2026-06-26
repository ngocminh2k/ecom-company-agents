export type DSARType = 'access' | 'deletion' | 'correction' | 'withdraw_consent';
export type DSARStatus = 'pending' | 'in_progress' | 'fulfilled' | 'rejected';

export interface DSARRequest {
  id: string;
  customerId: string;
  type: DSARType;
  status: DSARStatus;
  createdAt: string;
  deadlineAt: string; // 72 hours from createdAt per PDPD SLA
  fulfilledAt?: string;
  rejectionReason?: string;
}

export interface DSARStorage {
  create(request: DSARRequest): DSARRequest;
  findById(id: string): DSARRequest | undefined;
  findPending(): DSARRequest[];
  update(id: string, updates: Partial<DSARRequest>): DSARRequest;
}

export class DsarService {
  constructor(private storage: DSARStorage) {}

  submitRequest(customerId: string, type: DSARType): DSARRequest {
    if (!customerId) {
      throw new Error('customerId is required');
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const request: DSARRequest = {
      id: crypto.randomUUID(),
      customerId,
      type,
      status: 'pending',
      createdAt,
      deadlineAt: deadline.toISOString()
    };

    return this.storage.create(request);
  }

  fulfillRequest(id: string): DSARRequest {
    const existing = this.storage.findById(id);
    if (!existing) {
      throw new Error(`DSAR request ${id} not found`);
    }
    if (existing.status === 'fulfilled' || existing.status === 'rejected') {
      throw new Error('Cannot fulfill an already closed DSAR request');
    }

    const updates: Partial<DSARRequest> = {
      status: 'fulfilled',
      fulfilledAt: new Date().toISOString()
    };

    return this.storage.update(id, updates);
  }

  rejectRequest(id: string, reason: string): DSARRequest {
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required to provide legal justification to the consumer');
    }

    const existing = this.storage.findById(id);
    if (!existing) {
      throw new Error(`DSAR request ${id} not found`);
    }
    if (existing.status === 'fulfilled' || existing.status === 'rejected') {
      throw new Error('Cannot reject an already closed DSAR request');
    }

    const updates: Partial<DSARRequest> = {
      status: 'rejected',
      rejectionReason: reason
    };

    return this.storage.update(id, updates);
  }

  getAtRiskRequests(): DSARRequest[] {
    const pending = this.storage.findPending();
    const now = new Date().getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    return pending.filter(req => {
      // Only check pending or in_progress status
      if (req.status !== 'pending' && req.status !== 'in_progress') return false;
      
      const deadline = new Date(req.deadlineAt).getTime();
      const timeRemaining = deadline - now;
      
      // Return requests that have less than 24h remaining
      return timeRemaining < TWENTY_FOUR_HOURS;
    });
  }
}
