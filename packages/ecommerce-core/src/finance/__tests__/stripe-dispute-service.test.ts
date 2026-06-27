import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StripeDisputeService, StripeEvidenceData } from '../stripe-dispute-service';

describe('StripeDisputeService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('throws error if STRIPE_SECRET_KEY is not provided', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => new StripeDisputeService()).toThrow('STRIPE_SECRET_KEY is required');
  });

  it('initializes with provided API key', async () => {
    const service = new StripeDisputeService('sk_test_123');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'dp_123' })
    });
    global.fetch = mockFetch;

    await service.submitEvidence('dp_123', { customer_name: 'John Doe' });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/disputes/dp_123',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk_test_123'
        })
      })
    );
  });

  it('initializes with env STRIPE_SECRET_KEY', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_env';
    const service = new StripeDisputeService();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'dp_123' })
    });
    global.fetch = mockFetch;

    await service.submitEvidence('dp_123', { customer_name: 'John Doe' });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/disputes/dp_123',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk_test_env'
        })
      })
    );
  });

  it('submits evidence correctly via x-www-form-urlencoded', async () => {
    const service = new StripeDisputeService('sk_test_123');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'dp_123' })
    });
    global.fetch = mockFetch;

    const evidence: StripeEvidenceData = {
      customer_name: 'John Doe',
      customer_email_address: 'john@example.com',
      shipping_tracking_number: '1Z9999999999999999',
      shipping_carrier: 'UPS'
    };

    await service.submitEvidence('dp_123', evidence);

    const expectedBody = new URLSearchParams();
    expectedBody.append('evidence[customer_name]', 'John Doe');
    expectedBody.append('evidence[customer_email_address]', 'john@example.com');
    expectedBody.append('evidence[shipping_tracking_number]', '1Z9999999999999999');
    expectedBody.append('evidence[shipping_carrier]', 'UPS');
    expectedBody.append('submit', 'true');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/disputes/dp_123',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded'
        }),
        body: expectedBody.toString()
      })
    );
  });

  it('throws error when submission fails', async () => {
    const service = new StripeDisputeService('sk_test_123');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: 'Invalid request' } })
    });
    global.fetch = mockFetch;

    await expect(
      service.submitEvidence('dp_123', { customer_name: 'John Doe' })
    ).rejects.toThrow('Stripe dispute submission failed: 400 {"error":{"message":"Invalid request"}}');
  });
  
  it('omits undefined fields from the payload', async () => {
    const service = new StripeDisputeService('sk_test_123');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'dp_123' })
    });
    global.fetch = mockFetch;

    const evidence: StripeEvidenceData = {
      customer_name: 'John Doe',
      shipping_carrier: undefined
    };

    await service.submitEvidence('dp_123', evidence);

    const expectedBody = new URLSearchParams();
    expectedBody.append('evidence[customer_name]', 'John Doe');
    expectedBody.append('submit', 'true');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/disputes/dp_123',
      expect.objectContaining({
        body: expectedBody.toString()
      })
    );
  });
});
