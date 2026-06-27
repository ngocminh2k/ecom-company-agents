import { test, expect, describe, vi } from 'vitest';
import { ShippoShippingService } from '../shippo-shipping-service';
import { Shippo } from 'shippo';

// Mock the Shippo SDK
vi.mock('shippo', () => {
  return {
    Shippo: vi.fn().mockImplementation(() => ({
      shipments: {
        create: vi.fn().mockResolvedValue({
          rates: [
            { objectId: 'rate_1', provider: 'USPS', amount: '5.00' },
            { objectId: 'rate_2', provider: 'UPS', amount: '8.00' }
          ]
        })
      },
      transactions: {
        create: vi.fn().mockResolvedValue({
          status: 'SUCCESS',
          trackingNumber: 'TRACK123',
          trackingUrlProvider: 'https://track.it/TRACK123',
          labelUrl: 'https://shippo.com/label.pdf'
        })
      }
    }))
  };
});

describe('ShippoShippingService', () => {
  const service = new ShippoShippingService('test_key');

  const mockAddress = {
    name: 'Test Name',
    street1: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zip: '90001',
    country: 'US'
  };

  const mockParcel = {
    length: '10',
    width: '10',
    height: '10',
    distanceUnit: 'in' as const,
    weight: '1',
    massUnit: 'lb' as const
  };

  test('getLiveRates returns available rates', async () => {
    const rates = await service.getLiveRates(mockAddress, mockAddress, [mockParcel]);
    expect(rates).toHaveLength(2);
    expect(rates[0].provider).toBe('USPS');
  });

  test('purchaseLabel returns tracking and label info on success', async () => {
    const result = await service.purchaseLabel('rate_1');
    expect(result.trackingNumber).toBe('TRACK123');
    expect(result.labelUrl).toContain('.pdf');
  });
});
