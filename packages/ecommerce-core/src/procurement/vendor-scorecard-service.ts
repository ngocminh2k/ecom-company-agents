import { VendorPerformanceInput, VendorScorecard, VendorScorecardStorage, RiskLevel, VendorStatus } from './types.js';

export class ProcurementVendorScorecardService {
  constructor(private readonly storage: VendorScorecardStorage) {}

  evaluateVendor(input: VendorPerformanceInput): VendorScorecard {
    const score = this.calculateScore(input);
    const riskLevel = this.determineRiskLevel(score, input.kycCompleted);
    const { status, requiresCapa } = this.determineStatusAndCapa(score, input.kycCompleted);

    const scorecard: VendorScorecard = Object.freeze({
      id: this.generateId(),
      vendorId: input.vendorId,
      score,
      riskLevel,
      status,
      requiresCapa,
      lastEvaluatedAt: new Date().toISOString()
    });

    return this.storage.upsert(scorecard);
  }

  getScorecard(vendorId: string): VendorScorecard | undefined {
    return this.storage.findByVendorId(vendorId);
  }

  getVendorsRequiringCapa(): VendorScorecard[] {
    return this.storage.findRequiresCapa();
  }

  private calculateScore(input: VendorPerformanceInput): number {
    // OTIF (40%): Higher is better. Input is 0.0 to 1.0. Scale to 40 points.
    const otifScore = Math.max(0, Math.min(1, input.otifRate)) * 40;

    // Defect Rate (30%): Lower is better. Let's assume 0 ppm = 30 points, 10000+ ppm = 0 points.
    // 10000 ppm is 1%.
    const maxDefectPpm = 10000;
    const defectScore = Math.max(0, 30 * (1 - Math.min(input.defectRatePpm, maxDefectPpm) / maxDefectPpm));

    // Cost Competitiveness (20%): Input is 1 to 10. Scale to 20 points.
    const costScore = (Math.max(1, Math.min(10, input.costCompetitivenessScore)) / 10) * 20;

    // Claim Ratio (10%): Lower is better. Input is 0.0 to 1.0. 0 = 10 points, 0.1 = 0 points (assumption: 10% claim is bad).
    const maxClaimRatio = 0.1;
    const claimScore = Math.max(0, 10 * (1 - Math.min(input.claimRatio, maxClaimRatio) / maxClaimRatio));

    return Math.round(otifScore + defectScore + costScore + claimScore);
  }

  private determineRiskLevel(score: number, kycCompleted: boolean): RiskLevel {
    if (!kycCompleted || score < 50) return 'high';
    if (score >= 50 && score < 75) return 'medium';
    return 'low';
  }

  private determineStatusAndCapa(score: number, kycCompleted: boolean): { status: VendorStatus, requiresCapa: boolean } {
    if (!kycCompleted || score < 50) {
      return { status: 'suspend', requiresCapa: true };
    }

    if (score >= 50 && score < 75) {
      return { status: 'watchlist', requiresCapa: true };
    }

    return { status: 'active', requiresCapa: false };
  }

  private generateId(): string {
    return 'vsc_' + Math.random().toString(36).substring(2, 11);
  }
}
