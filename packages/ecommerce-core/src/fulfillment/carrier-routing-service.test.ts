import { describe, it, expect } from 'vitest';
import { CarrierRoutingService, CarrierRule, RoutingContext } from './carrier-routing-service.js';

describe('CarrierRoutingService', () => {
  const mockRules: CarrierRule[] = [
    {
      id: 'rule-standard-1',
      carrierId: 'CARRIER_A',
      serviceLevel: 'standard',
      supportedRegions: 'ALL',
      maxWeightKg: 20,
      supportsCOD: true,
      supportsBulky: false,
      estimatedDays: 4,
      baseCost: 20000,
      costPerKgAboveBase: 5000,
      baseWeightKg: 2,
    },
    {
      id: 'rule-express-1',
      carrierId: 'CARRIER_A',
      serviceLevel: 'express',
      supportedRegions: ['VN-SG', 'VN-HN'],
      maxWeightKg: 10,
      supportsCOD: true,
      supportsBulky: false,
      estimatedDays: 2,
      baseCost: 35000,
      costPerKgAboveBase: 8000,
      baseWeightKg: 1,
    },
    {
      id: 'rule-bulky-1',
      carrierId: 'CARRIER_B',
      serviceLevel: 'standard',
      supportedRegions: 'ALL',
      maxWeightKg: 100,
      supportsCOD: false, // Doesn't support COD
      supportsBulky: true,
      estimatedDays: 5,
      baseCost: 100000,
      costPerKgAboveBase: 10000,
      baseWeightKg: 10,
    },
    {
      id: 'rule-cheap-standard-1',
      carrierId: 'CARRIER_C',
      serviceLevel: 'standard',
      supportedRegions: ['VN-SG'],
      maxWeightKg: 5,
      supportsCOD: true,
      supportsBulky: false,
      estimatedDays: 3,
      baseCost: 15000, // Very cheap
      costPerKgAboveBase: 6000,
      baseWeightKg: 1,
    }
  ];

  it('should find the cheapest eligible carrier (CARRIER_C) for standard small order in VN-SG', () => {
    const service = new CarrierRoutingService(mockRules);
    const ctx: RoutingContext = {
      orderId: 'ord-1',
      region: 'VN-SG',
      weightInKg: 1,
      isCOD: false,
      isBulky: false,
      slaDaysRequired: 5,
    };
    
    const result = service.evaluateBestCarrier(ctx);
    expect(result).toBeDefined();
    expect(result?.carrierId).toBe('CARRIER_C');
    expect(result?.calculatedCost).toBe(15000);
  });

  it('should fallback to CARRIER_A if region is not supported by CARRIER_C', () => {
    const service = new CarrierRoutingService(mockRules);
    const ctx: RoutingContext = {
      orderId: 'ord-2',
      region: 'VN-DN', // CARRIER_C only does VN-SG
      weightInKg: 1,
      isCOD: false,
      isBulky: false,
      slaDaysRequired: 5,
    };
    
    const result = service.evaluateBestCarrier(ctx);
    expect(result).toBeDefined();
    expect(result?.carrierId).toBe('CARRIER_A');
    expect(result?.calculatedCost).toBe(20000);
  });

  it('should filter out carriers that cannot meet SLA (requires 2 days)', () => {
    const service = new CarrierRoutingService(mockRules);
    const ctx: RoutingContext = {
      orderId: 'ord-3',
      region: 'VN-HN',
      weightInKg: 1,
      isCOD: false,
      isBulky: false,
      slaDaysRequired: 2, // Needs express
    };
    
    const result = service.evaluateBestCarrier(ctx);
    expect(result).toBeDefined();
    expect(result?.carrierId).toBe('CARRIER_A');
    expect(result?.serviceLevel).toBe('express');
    expect(result?.calculatedCost).toBe(35000);
  });

  it('should select bulky carrier and correctly calculate cost above base weight', () => {
    const service = new CarrierRoutingService(mockRules);
    const ctx: RoutingContext = {
      orderId: 'ord-4',
      region: 'VN-SG',
      weightInKg: 15,
      isCOD: false,
      isBulky: true, // Requires bulky
      slaDaysRequired: 7,
    };
    
    const result = service.evaluateBestCarrier(ctx);
    expect(result).toBeDefined();
    expect(result?.carrierId).toBe('CARRIER_B');
    // baseCost 100000 + (15 - 10) * 10000 = 150000
    expect(result?.calculatedCost).toBe(150000);
  });

  it('should return null if no carriers support COD for bulky items', () => {
    const service = new CarrierRoutingService(mockRules);
    const ctx: RoutingContext = {
      orderId: 'ord-5',
      region: 'VN-SG',
      weightInKg: 15,
      isCOD: true, // Requires COD
      isBulky: true, // Requires bulky (Only CARRIER_B does bulky, but it doesn't do COD)
      slaDaysRequired: 7,
    };
    
    const result = service.evaluateBestCarrier(ctx);
    expect(result).toBeNull();
  });

  it('should return null if order weight exceeds max weight of all eligible carriers', () => {
    const service = new CarrierRoutingService(mockRules);
    const ctx: RoutingContext = {
      orderId: 'ord-6',
      region: 'VN-SG',
      weightInKg: 150, // exceeds maxWeightKg of even CARRIER_B (100)
      isCOD: false,
      isBulky: true,
      slaDaysRequired: 7,
    };
    
    const result = service.evaluateBestCarrier(ctx);
    expect(result).toBeNull();
  });
});
