export interface StripeEvidenceData {
  customer_name?: string
  customer_email_address?: string
  shipping_tracking_number?: string
  shipping_carrier?: string
  uncategorized_text?: string
  receipt?: string // Stripe File ID
}

export class StripeDisputeService {
  private readonly apiKey: string

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is required')
    this.apiKey = key
  }

  async submitEvidence(disputeId: string, evidence: StripeEvidenceData): Promise<void> {
    const params = new URLSearchParams()
    
    for (const [key, value] of Object.entries(evidence)) {
      if (value !== undefined && value !== null) {
        params.append(`evidence[${key}]`, value as string)
      }
    }
    params.append('submit', 'true')

    const response = await fetch(`https://api.stripe.com/v1/disputes/${disputeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Stripe dispute submission failed: ${response.status} ${JSON.stringify(error)}`)
    }
  }
}
