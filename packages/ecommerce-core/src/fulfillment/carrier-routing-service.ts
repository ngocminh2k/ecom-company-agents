export interface RoutingContext {
  orderId: string;
  region: string; // e.g., 'VN-SG', 'VN-HN'
  weightInKg: number;
  isCOD: boolean;
  isBulky: boolean;
  slaDaysRequired: number;
}

export interface CarrierRule {
  id: string;
  carrierId: string;
  serviceLevel: 'standard' | 'express' | 'same_day';
  supportedRegions: string[] | 'ALL';
  maxWeightKg: number;
  supportsCOD: boolean;
  supportsBulky: boolean;
  estimatedDays: number;
  baseCost: number;
  costPerKgAboveBase: number;
  baseWeightKg: number;
}

export interface RoutingResult {
  carrierId: string;
  serviceLevel: string;
  estimatedDays: number;
  calculatedCost: number;
  ruleId: string;
}

export class CarrierRoutingService {
  private rules: CarrierRule[];

  constructor(rules: CarrierRule[] = []) {
    this.rules = rules;
  }

  evaluateBestCarrier(context: RoutingContext): RoutingResult | null {
    const eligibleRules = this.rules.filter((rule) => {
      // Check SLA constraint
      if (rule.estimatedDays > context.slaDaysRequired) return false;

      // Check COD constraint
      if (context.isCOD && !rule.supportsCOD) return false;

      // Check bulky item constraint
      if (context.isBulky && !rule.supportsBulky) return false;

      // Check max weight limit constraint
      if (context.weightInKg > rule.maxWeightKg) return false;

      // Check region constraint
      if (rule.supportedRegions !== 'ALL' && !rule.supportedRegions.includes(context.region)) {
        return false;
      }

      return true;
    });

    if (eligibleRules.length === 0) {
      return null;
    }

    const costCalculations = eligibleRules.map((rule) => {
      const extraWeight = Math.max(0, context.weightInKg - rule.baseWeightKg);
      const calculatedCost = rule.baseCost + extraWeight * rule.costPerKgAboveBase;

      return {
        carrierId: rule.carrierId,
        serviceLevel: rule.serviceLevel,
        estimatedDays: rule.estimatedDays,
        calculatedCost,
        ruleId: rule.id,
      };
    });

    // Sort primarily by cost, secondarily by speed
    costCalculations.sort((a, b) => {
      if (a.calculatedCost === b.calculatedCost) {
        return a.estimatedDays - b.estimatedDays;
      }
      return a.calculatedCost - b.calculatedCost;
    });

    return costCalculations[0];
  }
}
