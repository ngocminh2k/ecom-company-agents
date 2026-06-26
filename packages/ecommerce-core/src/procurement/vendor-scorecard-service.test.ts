import { describe, it, expect, beforeEach } from 'vitest';
import { VendorScorecardService } from './vendor-scorecard-service.js';
import { VendorScorecard, VendorScorecardStorage } from './types.js';

class MockVendorScorecardStorage implements VendorScorecardStorage {
  private store: Map<string, VendorScorecard> = new Map();

  upsert(scorecard: VendorScorecard): VendorScorecard {
    this.store.set(scorecard.vendorId, scorecard);
    return scorecard;
  }

  findByVendorId(vendorId: string): VendorScorecard | undefined {
    return this.store.get(vendorId);
  }

  findRequiresCapa(): VendorScorecard[] {
    return Array.from(this.store.values()).filter(s => s.requiresCapa);
  }
}

describe('VendorScorecardService', () => {
  let storage: MockVendorScorecardStorage;
  let service: VendorScorecardService;

  beforeEach(() => {
    storage = new MockVendorScorecardStorage();
    service = new VendorScorecardService(storage);
  });

  it('should evaluate a top vendor to active with low risk', () => {
    const result = service.evaluateVendor({
      vendorId: 'v1',
      otifRate: 0.99, // ~40
      defectRatePpm: 50, // ~30
      costCompetitivenessScore: 9, // ~18
      claimRatio: 0.01, // ~9
      kycCompleted: true
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.status).toBe('active');
    expect(result.riskLevel).toBe('low');
    expect(result.requiresCapa).toBe(false);
  });

  it('should suspend a vendor if KYC is incomplete', () => {
    const result = service.evaluateVendor({
      vendorId: 'v1',
      otifRate: 1.0,
      defectRatePpm: 0,
      costCompetitivenessScore: 10,
      claimRatio: 0.0,
      kycCompleted: false
    });

    // Score will be 100 but missing KYC blocks them
    expect(result.score).toBe(100);
    expect(result.status).toBe('suspend');
    expect(result.riskLevel).toBe('high');
    expect(result.requiresCapa).toBe(true);
  });

  it('should put a vendor on watchlist with medium risk if score is between 50 and 75', () => {
    const result = service.evaluateVendor({
      vendorId: 'v1',
      otifRate: 0.7, // 28
      defectRatePpm: 5000, // 15
      costCompetitivenessScore: 5, // 10
      claimRatio: 0.05, // 5
      kycCompleted: true
    });
    // total = 58

    expect(result.score).toBe(58);
    expect(result.status).toBe('watchlist');
    expect(result.riskLevel).toBe('medium');
    expect(result.requiresCapa).toBe(true);
  });

  it('should suspend a vendor with high risk if score is below 50', () => {
    const result = service.evaluateVendor({
      vendorId: 'v1',
      otifRate: 0.5, // 20
      defectRatePpm: 10000, // 0
      costCompetitivenessScore: 5, // 10
      claimRatio: 0.1, // 0
      kycCompleted: true
    });
    // total = 30

    expect(result.score).toBe(30);
    expect(result.status).toBe('suspend');
    expect(result.riskLevel).toBe('high');
    expect(result.requiresCapa).toBe(true);
  });

  it('should correctly store and retrieve a scorecard', () => {
    service.evaluateVendor({
      vendorId: 'v1',
      otifRate: 0.9,
      defectRatePpm: 1000,
      costCompetitivenessScore: 8,
      claimRatio: 0.02,
      kycCompleted: true
    });

    const scorecard = service.getScorecard('v1');
    expect(scorecard).toBeDefined();
    expect(scorecard?.vendorId).toBe('v1');
  });

  it('should return all vendors requiring CAPA', () => {
    // Bad vendor (needs CAPA)
    service.evaluateVendor({
      vendorId: 'v1',
      otifRate: 0.5,
      defectRatePpm: 10000,
      costCompetitivenessScore: 5,
      claimRatio: 0.1,
      kycCompleted: true
    });

    // Good vendor (does not need CAPA)
    service.evaluateVendor({
      vendorId: 'v2',
      otifRate: 1.0,
      defectRatePpm: 0,
      costCompetitivenessScore: 10,
      claimRatio: 0.0,
      kycCompleted: true
    });

    const capaList = service.getVendorsRequiringCapa();
    expect(capaList.length).toBe(1);
    expect(capaList[0].vendorId).toBe('v1');
  });
});
