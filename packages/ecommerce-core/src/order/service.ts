import { randomUUID } from 'node:crypto';
import type { OrderCreateInput, OrderEntity } from './entity.js';
import { validateOrderCreate } from './entity.js';
import { FulfillmentExceptionOrchestrator, type OrderData } from '../fulfillment/exception-orchestrator-service.js';

export class ValidationError extends Error {
  constructor(message: string, public errors: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class OrderService {
  private orchestrator: FulfillmentExceptionOrchestrator;

  constructor() {
    this.orchestrator = new FulfillmentExceptionOrchestrator();
  }

  /**
   * Process a new order according to SOP rules
   */
  async processNewOrder(input: OrderCreateInput, fraudScore: number): Promise<OrderEntity> {
    // 1. Validation
    const validationErrors = validateOrderCreate(input);
    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid order creation input', validationErrors);
    }

    // 2. Duplicate Check
    const isDuplicate = this.checkDuplicate(input);
    if (isDuplicate) {
      // For now we just log, but this could throw or handle gracefully
      console.warn('Duplicate order detected');
    }

    // 3. Exception Orchestration
    const orderId = randomUUID();
    const orderData: OrderData = {
      id: orderId,
      customerEmail: input.customerEmail || '',
      customerName: input.customerName || '',
      shippingAddress: input.shippingAddress || '',
      isPersonalized: input.isPersonalized || false,
      personalizationData: input.personalizationData,
      fraudScore
    };

    const exceptions = await this.orchestrator.validateOrder(orderData);

    // 4. Status Assignment
    let initialStatus: 'pending' | 'cancelled' = 'pending';
    let notes = input.notes || '';

    const hasFraudOrInvalidAddress = exceptions.some(
      e => e.type === 'fraud_risk' || e.type === 'invalid_address'
    );

    if (hasFraudOrInvalidAddress) {
      initialStatus = 'cancelled';
      const exceptionMessages = exceptions.map(e => e.message).join('; ');
      notes = notes ? `${notes}\nExceptions: ${exceptionMessages}` : `Exceptions: ${exceptionMessages}`;
    }

    // 5. Entity Creation (Immutable)
    const now = new Date().toISOString();

    const entity: OrderEntity = {
      id: orderId,
      productId: input.productId,
      quantity: input.quantity ?? 1,
      unitPrice: 0, // Should be fetched from product service in a real app
      total: 0, // Should be calculated
      status: initialStatus,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      shippingAddress: input.shippingAddress,
      isPersonalized: input.isPersonalized || false,
      personalizationData: input.personalizationData,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now
    };

    return Object.freeze(entity) as OrderEntity;
  }

  /**
   * Mock duplicate check method defined for future DB integration
   */
  private checkDuplicate(input: OrderCreateInput): boolean {
    return false;
  }
}
