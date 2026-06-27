export interface StripeClientConfig {
  apiKey: string;
}

export interface StripeDispute {
  id: string;
  amount: number;
  reason: string;
  status: string;
}

export interface SubmitEvidencePayload {
  disputeId: string;
  customerName: string;
  trackingNumber: string;
  carrier: string;
}

export class StripeClient {
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly config: StripeClientConfig) {}

  async listDisputes(): Promise<StripeDispute[]> {
    const url = `${this.baseUrl}/disputes`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Stripe API Error (${response.status}): ${errorData}`);
    }

    const json = await response.json() as { data: StripeDispute[] };
    return json.data;
  }

  async submitEvidence(payload: SubmitEvidencePayload): Promise<{ id: string; status: string }> {
    const url = `${this.baseUrl}/disputes/${payload.disputeId}`;

    const params = new URLSearchParams();
    params.append('evidence[customer_name]', payload.customerName);
    params.append('evidence[tracking_number]', payload.trackingNumber);
    params.append('evidence[carrier]', payload.carrier);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Stripe API Error (${response.status}): ${errorData}`);
    }

    const json = await response.json() as { id: string; status: string };
    return json;
  }
}
