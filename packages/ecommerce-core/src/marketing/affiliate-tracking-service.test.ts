import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AffiliateTrackingService, 
  IAffiliateStorage, 
  Affiliate, 
  AffiliateClick 
} from './affiliate-tracking-service.js';

describe('AffiliateTrackingService', () => {
  let storage: vi.Mocked<IAffiliateStorage>;
  let service: AffiliateTrackingService;

  beforeEach(() => {
    storage = {
      getAffiliateByTrackingCode: vi.fn(),
      logClick: vi.fn().mockResolvedValue('click_123'),
      getClick: vi.fn(),
      markClickConverted: vi.fn().mockResolvedValue(undefined),
      recordConversion: vi.fn().mockResolvedValue(undefined),
      updateConversionStatus: vi.fn().mockResolvedValue(undefined),
    };
    service = new AffiliateTrackingService(storage);
  });

  describe('trackClick', () => {
    it('should return null if affiliate not found', async () => {
      storage.getAffiliateByTrackingCode.mockResolvedValue(null);
      const result = await service.trackClick('invalid_code', '127.0.0.1', 'Mozilla/5.0');
      expect(result).toBeNull();
    });

    it('should return null if affiliate is suspended', async () => {
      storage.getAffiliateByTrackingCode.mockResolvedValue({
        id: 'aff_1',
        name: 'Test Affiliate',
        commissionType: 'percentage',
        commissionRate: 10,
        status: 'suspended',
        trackingCodes: ['susp_code']
      });
      const result = await service.trackClick('susp_code', '127.0.0.1', 'Mozilla/5.0');
      expect(result).toBeNull();
    });

    it('should log click and return IDs for active affiliate', async () => {
      storage.getAffiliateByTrackingCode.mockResolvedValue({
        id: 'aff_1',
        name: 'Test Affiliate',
        commissionType: 'percentage',
        commissionRate: 10,
        status: 'active',
        trackingCodes: ['valid_code']
      });
      
      const result = await service.trackClick('valid_code', '127.0.0.1', 'Mozilla/5.0');
      
      expect(result).not.toBeNull();
      expect(result?.affiliateId).toBe('aff_1');
      expect(result?.clickId).toMatch(/^click_/);
      expect(storage.logClick).toHaveBeenCalledWith(expect.objectContaining({
        affiliateId: 'aff_1',
        trackingCode: 'valid_code',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      }));
    });
  });

  describe('registerConversion', () => {
    it('should return null if click not found', async () => {
      storage.getClick.mockResolvedValue(null);
      const result = await service.registerConversion('invalid_click', 'order_1', 100);
      expect(result).toBeNull();
    });

    it('should return null if click already converted', async () => {
      storage.getClick.mockResolvedValue({
        clickId: 'click_1',
        affiliateId: 'aff_1',
        trackingCode: 'valid_code',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        converted: true
      });
      const result = await service.registerConversion('click_1', 'order_1', 100);
      expect(result).toBeNull();
    });

    it('should calculate percentage commission correctly', async () => {
      storage.getClick.mockResolvedValue({
        clickId: 'click_1',
        affiliateId: 'aff_1',
        trackingCode: 'valid_code',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        converted: false
      });
      
      storage.getAffiliateByTrackingCode.mockResolvedValue({
        id: 'aff_1',
        name: 'Test Affiliate',
        commissionType: 'percentage',
        commissionRate: 15,
        status: 'active',
        trackingCodes: ['valid_code']
      });

      const result = await service.registerConversion('click_1', 'order_1', 200);
      
      expect(result).not.toBeNull();
      expect(result?.commissionAmount).toBe(30); // 15% of 200
      expect(result?.status).toBe('pending');
      expect(storage.recordConversion).toHaveBeenCalled();
      expect(storage.markClickConverted).toHaveBeenCalledWith('click_1');
    });

    it('should calculate fixed amount commission correctly', async () => {
      storage.getClick.mockResolvedValue({
        clickId: 'click_1',
        affiliateId: 'aff_1',
        trackingCode: 'valid_code',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        converted: false
      });
      
      storage.getAffiliateByTrackingCode.mockResolvedValue({
        id: 'aff_1',
        name: 'Test Affiliate',
        commissionType: 'fixed_amount',
        commissionRate: 50,
        status: 'active',
        trackingCodes: ['valid_code']
      });

      const result = await service.registerConversion('click_1', 'order_1', 1000);
      
      expect(result).not.toBeNull();
      expect(result?.commissionAmount).toBe(50); // Fixed 50
    });
  });

  describe('adjudicateConversion', () => {
    it('should update conversion status', async () => {
      await service.adjudicateConversion('conv_1', 'approved');
      expect(storage.updateConversionStatus).toHaveBeenCalledWith('conv_1', 'approved');
      
      await service.adjudicateConversion('conv_2', 'rejected');
      expect(storage.updateConversionStatus).toHaveBeenCalledWith('conv_2', 'rejected');
    });
  });
});
