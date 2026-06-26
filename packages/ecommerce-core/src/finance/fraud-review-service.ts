export type FraudReason = 'address_mismatch' | 'high_value' | 'multiple_failed_attempts' | 'psp_flagged';
export type FraudStatus = 'open' | 'under_investigation' | 'resolved_safe' | 'resolved_fraud';

export interface FraudCase {
  id: string;
  orderId: string;
  reason: FraudReason;
  status: FraudStatus;
  evidenceLogs: string[];
  openedAt: string;
  resolvedAt?: string;
}

export interface FraudCaseStorage {
  upsert(fraudCase: FraudCase): FraudCase;
  findById(id: string): FraudCase | undefined;
  findByStatus(status: FraudStatus): FraudCase[];
}

export class FraudReviewService {
  constructor(private readonly storage: FraudCaseStorage) {}

  flagOrder(orderId: string, reason: FraudReason): FraudCase {
    const newCase: FraudCase = {
      id: crypto.randomUUID(),
      orderId,
      reason,
      status: 'open',
      evidenceLogs: [],
      openedAt: new Date().toISOString(),
    };

    return this.storage.upsert(newCase);
  }

  addEvidence(caseId: string, evidence: string): FraudCase {
    const existingCase = this.storage.findById(caseId);
    if (!existingCase) {
      throw new Error(`Fraud case with id ${caseId} not found`);
    }

    const newStatus = existingCase.status === 'open' ? 'under_investigation' : existingCase.status;

    const updatedCase: FraudCase = {
      ...existingCase,
      status: newStatus,
      evidenceLogs: [...existingCase.evidenceLogs, evidence],
    };

    return this.storage.upsert(updatedCase);
  }

  resolveCase(caseId: string, resolution: 'resolved_safe' | 'resolved_fraud'): FraudCase {
    const existingCase = this.storage.findById(caseId);
    if (!existingCase) {
      throw new Error(`Fraud case with id ${caseId} not found`);
    }

    const updatedCase: FraudCase = {
      ...existingCase,
      status: resolution,
      resolvedAt: new Date().toISOString(),
    };

    return this.storage.upsert(updatedCase);
  }
}
