import { Shippo } from 'shippo';

export interface AddressPayload {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ParcelPayload {
  length: string;
  width: string;
  height: string;
  distanceUnit: 'in' | 'cm';
  weight: string;
  massUnit: 'lb' | 'kg' | 'oz' | 'g';
}

export class ShippoShippingService {
  private client: Shippo;

  constructor(apiKey: string) {
    this.client = new Shippo({ apiKeyHeader: apiKey });
  }

  async getLiveRates(addressFrom: AddressPayload, addressTo: AddressPayload, parcels: ParcelPayload[]) {
    const shipment = await this.client.shipments.create({
      addressFrom: addressFrom as any,
      addressTo: addressTo as any,
      parcels: parcels as any,
      async: false,
    });

    return shipment.rates;
  }

  async purchaseLabel(rateId: string) {
    const transaction = await this.client.transactions.create({
      rate: rateId,
      labelFileType: 'PDF',
      async: false,
    });

    if (transaction.status === 'ERROR') {
      throw new Error(`Failed to purchase label: ${JSON.stringify(transaction.messages)}`);
    }

    return {
      trackingNumber: transaction.trackingNumber,
      trackingUrlProvider: transaction.trackingUrlProvider,
      labelUrl: transaction.labelUrl,
    };
  }
}
