import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintifyService, PrintifyOrderPayload } from '../printify-service';

// Mock the global fetch API
global.fetch = vi.fn();

describe('PrintifyService', () => {
  const MOCK_API_KEY = 'test_api_key_123';
  const MOCK_SHOP_ID = 'shop_456';

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PRINTIFY_API_KEY = MOCK_API_KEY;
    process.env.PRINTIFY_SHOP_ID = MOCK_SHOP_ID;
  });

  afterEach(() => {
    delete process.env.PRINTIFY_API_KEY;
    delete process.env.PRINTIFY_SHOP_ID;
  });

  describe('Configuration', () => {
    it('initializes successfully with environment variables', () => {
      const service = new PrintifyService();
      expect(service).toBeInstanceOf(PrintifyService);
    });

    it('throws error if API key is missing', () => {
      delete process.env.PRINTIFY_API_KEY;
      expect(() => new PrintifyService(undefined, MOCK_SHOP_ID)).toThrow(/PRINTIFY_API_KEY is required/);
    });

    it('throws error if Shop ID is missing', () => {
      delete process.env.PRINTIFY_SHOP_ID;
      expect(() => new PrintifyService(MOCK_API_KEY)).toThrow(/PRINTIFY_SHOP_ID is required/);
    });

    it('prefers explicit constructor args over environment variables', () => {
      const service = new PrintifyService('custom_key', 'custom_shop');
      // @ts-ignore - accessing private variable for test validation
      expect(service.apiKey).toBe('custom_key');
      // @ts-ignore
      expect(service.shopId).toBe('custom_shop');
    });
  });

  describe('submitOrder', () => {
    const mockPayload: PrintifyOrderPayload = {
      external_id: 'local-123',
      label: 'Store Order 123',
      line_items: [{ variant_id: 101, quantity: 1 }],
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '555-0199',
        country: 'US',
        region: 'TX',
        address1: '456 Main St',
        city: 'Austin',
        zip: '78701'
      }
    };

    it('submits a valid order and returns the Printify ID', async () => {
      const service = new PrintifyService();
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'printify-order-999' })
      } as any);

      const result = await service.submitOrder(mockPayload);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.printify.com/v1/shops/${MOCK_SHOP_ID}/orders.json`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${MOCK_API_KEY}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockPayload)
        })
      );
      
      expect(result.id).toBe('printify-order-999');
    });

    it('throws a detailed error when the Printify API rejects the payload', async () => {
      const service = new PrintifyService();
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid address format' })
      } as any);

      await expect(service.submitOrder(mockPayload)).rejects.toThrow(
        /Printify API Error \(400\): {"error":"Invalid address format"}/
      );
    });
  });

  describe('calculateShipping', () => {
    it('fetches shipping costs based on payload', async () => {
      const service = new PrintifyService();
      
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ standard: 450, express: 1200 })
      } as any);

      const result = await service.calculateShipping({} as PrintifyOrderPayload);
      
      expect(result.standard).toBe(450);
      expect(result.express).toBe(1200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/shipping.json'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
