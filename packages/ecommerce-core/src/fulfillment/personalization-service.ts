export interface PersonalizationData {
  orderId: string;
  type: 'gift_message' | 'engraving' | 'custom_packaging';
  content: string;
  instructions?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface IPersonalizationStorage {
  getPersonalizationData(orderId: string): Promise<PersonalizationData[]>;
  updateStatus(orderId: string, type: string, status: PersonalizationData['status']): Promise<void>;
  addPersonalization(data: PersonalizationData): Promise<void>;
}

export class PersonalizationService {
  constructor(private readonly storage: IPersonalizationStorage) {}

  public async getOrderPersonalizations(orderId: string): Promise<PersonalizationData[]> {
    return this.storage.getPersonalizationData(orderId);
  }

  public async markPersonalizationComplete(orderId: string, type: string): Promise<void> {
    await this.storage.updateStatus(orderId, type, 'completed');
  }

  public async markPersonalizationFailed(orderId: string, type: string): Promise<void> {
    await this.storage.updateStatus(orderId, type, 'failed');
  }
}
