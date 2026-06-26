import { describe, it, expect } from 'vitest';
import {
  CarrierRoutingService,
  CarrierRoutingStorage,
  CarrierRule,
  ShipmentDetails,
} from './carrier-routing-service';

class MockStorage implements CarrierRoutingStorage {
  constructor(private rules: CarrierRule[]) {}
  getRules(): CarrierRule[] {
    return this.rules;
  }
}

describe('CarrierRoutingService', () => {
  const standardCarrier: CarrierRule = {
    carrierId: 'c1',
    name: 'Standard Carrier',
    maxWeightKg: 10,
    acceptsBulky: false,
    acceptsCOD: true,
    supportedRegions: ['North', 'South'],
    estimatedDays: 3,
    baseCost: 5,
  };

  const expressCarrier: CarrierRule = {
    carrierId: 'c2',
    name: 'Express Carrier',
    maxWeightKg: 5,
    acceptsBulky: false,
    acceptsCOD: false,
    supportedRegions: ['North'],
    estimatedDays: 1,
    baseCost: 15,
  };

  const heavyCarrier: CarrierRule = {
    carrierId: 'c3',
    name: 'Heavy Carrier',
    maxWeightKg: 50,
    acceptsBulky: true,
    acceptsCOD: true,
    supportedRegions: ['North', 'South', 'Central'],
    estimatedDays: 5,
    baseCost: 20,
  };

  const rules = [standardCarrier, expressCarrier, heavyCarrier];

  it('should find the cheapest valid carrier', () => {
    const service = new CarrierRoutingService(new MockStorage(rules));

    const details: ShipmentDetails = {
      weightKg: 2,
      isBulky: false,
      requiresCOD: false,
      destinationRegion: 'North',
      slaDays: 5,
    };

    const best = service.routeShipment(details);
    expect(best?.carrierId).toBe('c1');
  });

  it('should filter out carriers exceeding SLA', () => {
    const service = new CarrierRoutingService(new MockStorage(rules));

    const details: ShipmentDetails = {
      weightKg: 2,
      isBulky: false,
      requiresCOD: false,
      destinationRegion: 'North',
      slaDays: 2, // Standard carrier is 3 days
    };

    const best = service.routeShipment(details);
    expect(best?.carrierId).toBe('c2'); // Express is 1 day
  });

  it('should filter out carriers not supporting region', () => {
    const service = new CarrierRoutingService(new MockStorage(rules));

    const details: ShipmentDetails = {
      weightKg: 2,
      isBulky: false,
      requiresCOD: false,
      destinationRegion: 'Central',
      slaDays: 7,
    };

    const best = service.routeShipment(details);
    expect(best?.carrierId).toBe('c3'); // Only heavy carrier supports Central
  });

  it('should filter out carriers not accepting bulky', () => {
    const service = new CarrierRoutingService(new MockStorage(rules));

    const details: ShipmentDetails = {
      weightKg: 8,
      isBulky: true,
      requiresCOD: false,
      destinationRegion: 'North',
      slaDays: 5,
    };

    const best = service.routeShipment(details);
    expect(best?.carrierId).toBe('c3'); // Only heavy accepts bulky
  });

  it('should filter out carriers due to weight limit', () => {
    const service = new CarrierRoutingService(new MockStorage(rules));

    const details: ShipmentDetails = {
      weightKg: 15,
      isBulky: false,
      requiresCOD: true,
      destinationRegion: 'South',
      slaDays: 5,
    };

    const best = service.routeShipment(details);
    expect(best?.carrierId).toBe('c3'); // Standard supports South/COD but max weight is 10
  });

  it('should return null if no carrier meets criteria', () => {
    const service = new CarrierRoutingService(new MockStorage(rules));

    const details: ShipmentDetails = {
      weightKg: 100, // Max across all is 50
      isBulky: true,
      requiresCOD: true,
      destinationRegion: 'North',
      slaDays: 5,
    };

    const best = service.routeShipment(details);
    expect(best).toBeNull();
  });

  it('should break ties in cost by selecting faster estimated days', () => {
    const tieCarrier: CarrierRule = {
      carrierId: 'c4',
      name: 'Tie Carrier',
      maxWeightKg: 10,
      acceptsBulky: false,
      acceptsCOD: true,
      supportedRegions: ['North'],
      estimatedDays: 2, // Faster than c1 (3 days)
      baseCost: 5, // Same cost as c1
    };

    const service = new CarrierRoutingService(new MockStorage([...rules, tieCarrier]));

    const details: ShipmentDetails = {
      weightKg: 2,
      isBulky: false,
      requiresCOD: true,
      destinationRegion: 'North',
      slaDays: 5,
    };

    const best = service.routeShipment(details);
    expect(best?.carrierId).toBe('c4'); // c4 is faster than c1
  });
});
