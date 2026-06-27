import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripeClient, SubmitEvidencePayload } from './stripe-client';

const mockPayload: SubmitEvidencePayload = {
  disputeId: 'dp_123_test',
  customerName: 'John Doe',
  trackingNumber: '1Z9999999999999999',
  carrier: 'UPS'
};

describe('StripeClient', () => {
  const client = new StripeClient({ apiKey: 'sk_test_123' });

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('lists disputes from Stripe API', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'dp_123_test', amount: 4500, reason: 'product_not_received', status: 'needs_response' }
        ]
      })
    } as Response);

    const disputes = await client.listDisputes();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/disputes',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': 'Bearer sk_test_123'
        }
      })
    );
    expect(disputes).toHaveLength(1);
    expect(disputes[0].id).toBe('dp_123_test');
  });

  it('posts evidence to Stripe API', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'dp_123_test', status: 'under_review' })
    } as Response);

    const result = await client.submitEvidence(mockPayload);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.stripe.com/v1/disputes/dp_123_test',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer sk_test_123',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: expect.stringContaining('evidence%5Bcustomer_name%5D=John+Doe')
      })
    );
    expect(result.id).toBe('dp_123_test');
  });

  it('throws an error when Stripe API fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error": {"message": "Invalid dispute ID"}}'
    } as Response);

    await expect(client.submitEvidence(mockPayload)).rejects.toThrow(
      /Stripe API Error \(400\): {"error": {"message": "Invalid dispute ID"}}/
    );
  });
});
