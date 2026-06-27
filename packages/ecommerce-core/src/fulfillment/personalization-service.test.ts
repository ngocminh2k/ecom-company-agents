import { describe, it, expect, vi, type Mocked, beforeEach } from 'vitest';
import { PersonalizationService, IPersonalizationStorage } from './personalization-service.js';

describe('PersonalizationService', () => {
  let storage: Mocked<IPersonalizationStorage>;
  let service: PersonalizationService;

  beforeEach(() => {
    storage = {
      getPersonalizationData: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      addPersonalization: vi.fn().mockResolvedValue(undefined),
    };
    service = new PersonalizationService(storage);
  });

  it('should get order personalizations', async () => {
    const mockData = [
      {
        orderId: 'order_1',
        type: 'gift_message' as const,
        content: 'Happy Birthday',
        status: 'pending' as const
      }
    ];
    storage.getPersonalizationData.mockResolvedValue(mockData);

    const result = await service.getOrderPersonalizations('order_1');
    expect(result).toEqual(mockData);
    expect(storage.getPersonalizationData).toHaveBeenCalledWith('order_1');
  });

  it('should mark personalization complete', async () => {
    await service.markPersonalizationComplete('order_1', 'gift_message');
    expect(storage.updateStatus).toHaveBeenCalledWith('order_1', 'gift_message', 'completed');
  });

  it('should mark personalization failed', async () => {
    await service.markPersonalizationFailed('order_1', 'engraving');
    expect(storage.updateStatus).toHaveBeenCalledWith('order_1', 'engraving', 'failed');
  });
});
