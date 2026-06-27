/**
 * Printify API Service
 * 
 * Implements real Printify API syncing for POD orders.
 * SOP Section 13: Print provider order routing.
 */

export interface PrintifyShop {
  id: string;
  title: string;
}

export interface PrintifyAddressTo {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
}

export interface PrintifyLineItem {
  product_id?: string;
  variant_id: number;
  quantity: number;
}

export interface PrintifyOrderPayload {
  external_id: string;
  label: string;
  line_items: PrintifyLineItem[];
  shipping_method: number;
  send_shipping_notification: boolean;
  address_to: PrintifyAddressTo;
}

export class PrintifyService {
  private readonly baseUrl = 'https://api.printify.com/v1';
  private readonly apiKey: string;
  private readonly shopId: string;

  constructor(apiKey?: string, shopId?: string) {
    const key = apiKey ?? process.env.PRINTIFY_API_KEY;
    const shop = shopId ?? process.env.PRINTIFY_SHOP_ID;
    
    if (!key) throw new Error('PRINTIFY_API_KEY is required for Printify API sync');
    if (!shop) throw new Error('PRINTIFY_SHOP_ID is required for Printify API sync');
    
    this.apiKey = key;
    this.shopId = shop;
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Printify API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetches the shops associated with the Printify account
   */
  async getShops(): Promise<PrintifyShop[]> {
    return this.fetchApi<PrintifyShop[]>('/shops.json');
  }

  /**
   * Submits a new order to Printify
   */
  async submitOrder(payload: PrintifyOrderPayload): Promise<{ id: string }> {
    return this.fetchApi<{ id: string }>(`/shops/${this.shopId}/orders.json`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Calculates the shipping cost for an order before placing it
   */
  async calculateShipping(payload: PrintifyOrderPayload): Promise<{ standard: number, express: number }> {
    return this.fetchApi<any>(`/shops/${this.shopId}/orders/shipping.json`, {
      method: 'POST',
      body: JSON.stringify({
        line_items: payload.line_items,
        address_to: payload.address_to,
      }),
    });
  }

  /**
   * Fetches the status of a specific order
   */
  async getOrder(orderId: string): Promise<any> {
    return this.fetchApi<any>(`/shops/${this.shopId}/orders/${orderId}.json`);
  }
}
