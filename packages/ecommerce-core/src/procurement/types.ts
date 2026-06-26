export type VendorStatus = 'active' | 'watchlist' | 'suspend'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface VendorPerformanceInput {
  vendorId: string;
  otifRate: number; // 0.0 to 1.0 (On-Time In-Full)
  defectRatePpm: number; // Parts per million defects
  claimRatio: number; // 0.0 to 1.0
  costCompetitivenessScore: number; // 1 to 10
  kycCompleted: boolean;
}

export interface VendorScorecard {
  id: string;
  vendorId: string;
  score: number; // 0 to 100
  riskLevel: RiskLevel;
  status: VendorStatus;
  requiresCapa: boolean; // Corrective and Preventive Action
  lastEvaluatedAt: string;
}

export interface VendorScorecardStorage {
  upsert(scorecard: VendorScorecard): VendorScorecard;
  findByVendorId(vendorId: string): VendorScorecard | undefined;
  findRequiresCapa(): VendorScorecard[];
}
