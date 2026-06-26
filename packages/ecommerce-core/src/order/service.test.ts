import { describe, it, expect, vi } from 'vitest';
import { OrderService, ValidationError } from './service.js';
import type { OrderCreateInput } from './entity.js';
import { FulfillmentExceptionOrchestrator } from '../fulfillment/exception-orchestrator-service.js';

describe('OrderService', () => {
  describe('processNewOrder', () => {
    it('should successfully create a pending order for valid input', async () => {
      const service = new OrderService();
      const input: OrderCreateInput = {
        productId: 'prod-123',
        quantity: 2,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        shippingAddress: '123 Main St'
      };

      const order = await service.processNewOrder(input, 10);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.status).toBe('pending');
      expect(order.productId).toBe('prod-123');
      expect(order.quantity).toBe(2);
      expect(order.createdAt).toBeDefined();
    });

    it('should throw ValidationError if input is invalid', async () => {
      const service = new OrderService();
      // Missing productId
      const input = {
        quantity: -1 // Invalid quantity too
      } as unknown as OrderCreateInput;

      await expect(service.processNewOrder(input, 10)).rejects.toThrow(ValidationError);

      try {
        await service.processNewOrder(input, 10);
      } catch (err: any) {
        expect(err.errors).toBeDefined();
        expect(err.errors.length).toBeGreaterThan(0);
      }
    });

    it('should create a cancelled order and log exceptions if high fraud score', async () => {
      const service = new OrderService();
      const input: OrderCreateInput = {
        productId: 'prod-123',
        quantity: 1,
        customerEmail: 'fraud@example.com',
        customerName: 'Fraud User',
        shippingAddress: '123 Scam St'
      };

      const order = await service.processNewOrder(input, 95); // High fraud score

      expect(order).toBeDefined();
      expect(order.status).toBe('cancelled');
      expect(order.notes).toContain('Exceptions');
      expect(order.notes).toContain('fraud risk detected');
    });

    it('should create a cancelled order and log exceptions if address is missing', async () => {
      const service = new OrderService();
      const input: OrderCreateInput = {
        productId: 'prod-123',
        quantity: 1,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        shippingAddress: '' // Empty address triggers invalid_address exception
      };

      const order = await service.processNewOrder(input, 10);

      expect(order).toBeDefined();
      expect(order.status).toBe('cancelled');
      expect(order.notes).toContain('Exceptions');
      expect(order.notes).toContain('Shipping address is missing');
    });

    it('should create a pending order even with non-critical exceptions (ambiguous personalization)', async () => {
      const service = new OrderService();
      const input: OrderCreateInput = {
        productId: 'prod-123',
        quantity: 1,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        shippingAddress: '123 Main St',
        isPersonalized: true,
        personalizationData: 'maybe a cat or a dog?' // Triggers ambiguous_personalization
      };

      const order = await service.processNewOrder(input, 10);

      expect(order).toBeDefined();
      // non-critical exceptions don't cancel the order automatically
      expect(order.status).toBe('pending');
    });

    it('should create an immutable entity', async () => {
      const service = new OrderService();
      const input: OrderCreateInput = {
        productId: 'prod-123',
        shippingAddress: '123 Main St'
      };

      const order = await service.processNewOrder(input, 10);

      expect(Object.isFrozen(order)).toBe(true);

      // Should throw when trying to mutate in strict mode, or silently fail/throw in normal execution
      expect(() => {
        // @ts-ignore - intentional mutation for test
        order.status = 'shipped';
      }).toThrow();
    });
  });
});
