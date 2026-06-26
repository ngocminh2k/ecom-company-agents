export interface ShipmentDetails {
  weightKg: number;
  isBulky: boolean;
  requiresCOD: boolean;
  destinationRegion: string;
  slaDays: number;
}

export interface CarrierRule {
  carrierId: string;
  name: string;
  maxWeightKg: number;
  acceptsBulky: boolean;
  acceptsCOD: boolean;
  supportedRegions: string[];
  estimatedDays: number;
  baseCost: number;
}

export interface CarrierRoutingStorage {
  getRules(): CarrierRule[];
}

export class CarrierRoutingService {
  constructor(private storage: CarrierRoutingStorage) {}

  routeShipment(details: ShipmentDetails): CarrierRule | null {
    const rules = this.storage.getRules();

    const validRules = rules.filter((rule) => {
      if (rule.maxWeightKg < details.weightKg) {
        return false;
      }
      if (details.isBulky && !rule.acceptsBulky) {
        return false;
      }
      if (details.requiresCOD && !rule.acceptsCOD) {
        return false;
      }
      if (!rule.supportedRegions.includes(details.destinationRegion)) {
        return false;
      }
      if (rule.estimatedDays > details.slaDays) {
        return false;
      }
      return true;
    });

    if (validRules.length === 0) {
      return null;
    }

    validRules.sort((a, b) => {
      if (a.baseCost !== b.baseCost) {
        return a.baseCost - b.baseCost;
      }
      return a.estimatedDays - b.estimatedDays;
    });

    return validRules[0];
  }
}
