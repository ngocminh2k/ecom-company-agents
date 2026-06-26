import { describe, it, expect, vi } from 'vitest';
import { OrderService, ValidationError } from './service.js';
import type { OrderCreateInput } from './entity.js';
import { validatePersonalizationContent } from './entity.js';
import { FulfillmentExceptionOrchestrator } from '../fulfillment/exception-orchestrator-service.js';

describe('validatePersonalizationContent', () => {
  it('should return empty array for valid personalization content', () => {
    const errors = validatePersonalizationContent('Happy Birthday Mom');
    expect(errors).toHaveLength(0);
  });

  it('should return error for copyright term', () => {
    const errors = validatePersonalizationContent('I love Disney World');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('disney');
  });

  it('should return error for profanity', () => {
    const errors = validatePersonalizationContent('What the fuck');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('fuck');
  });

  it('should return multiple errors for multiple violations', () => {
    const errors = validatePersonalizationContent('fucking disney');
    expect(errors).toHaveLength(2);
  });
})

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

    it('should throw ValidationError if personalization contains trademarked or inappropriate terms', async () => {
      const service = new OrderService();
      const input: OrderCreateInput = {
        productId: 'prod-123',
        quantity: 1,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        shippingAddress: '123 Main St',
        isPersonalized: true,
        personalizationData: 'I love disney'
      };

      await expect(service.processNewOrder(input, 10)).rejects.toThrow(ValidationError);

      try {
        await service.processNewOrder(input, 10);
      } catch (err: any) {
        expect(err.errors).toBeDefined();
        expect(err.errors).toHaveLength(1);
        expect(err.errors[0]).toContain('blocked trademark: disney');
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

import { OrderSplitValidationService } from './service.js';
import type { OrderWithMultipleItems } from './service.js';

describe('OrderSplitValidationService', () => {
  it('should not split if order is under 50 items, same vendor, same shipping', () => {
    const service = new OrderSplitValidationService();
    const order: OrderWithMultipleItems = {
      id: 'o-1',
      items: [
        { productId: 'p1', quantity: 20, vendorId: 'v1', shippingMethod: 'standard' },
        { productId: 'p2', quantity: 10, vendorId: 'v1', shippingMethod: 'standard' }
      ]
    };
    const splits = service.suggestSplits(order);
    expect(splits).toHaveLength(1);
    expect(splits[0].items).toHaveLength(2);
    expect(splits[0].vendorId).toBe('v1');
    expect(splits[0].shippingMethod).toBe('standard');
  });

  it('should split if items have different vendors', () => {
    const service = new OrderSplitValidationService();
    const order: OrderWithMultipleItems = {
      id: 'o-2',
      items: [
        { productId: 'p1', quantity: 10, vendorId: 'v1', shippingMethod: 'standard' },
        { productId: 'p2', quantity: 10, vendorId: 'v2', shippingMethod: 'standard' }
      ]
    };
    const splits = service.suggestSplits(order);
    expect(splits).toHaveLength(2);
    expect(splits[0].vendorId).toBe('v1');
    expect(splits[1].vendorId).toBe('v2');
  });

  it('should split if items have different shipping methods', () => {
    const service = new OrderSplitValidationService();
    const order: OrderWithMultipleItems = {
      id: 'o-3',
      items: [
        { productId: 'p1', quantity: 10, vendorId: 'v1', shippingMethod: 'standard' },
        { productId: 'p2', quantity: 10, vendorId: 'v1', shippingMethod: 'express' }
      ]
    };
    const splits = service.suggestSplits(order);
    expect(splits).toHaveLength(2);
    expect(splits.map(s => s.shippingMethod)).toContain('standard');
    expect(splits.map(s => s.shippingMethod)).toContain('express');
  });

  it('should split if quantity exceeds 50', () => {
    const service = new OrderSplitValidationService();
    const order: OrderWithMultipleItems = {
      id: 'o-4',
      items: [
        { productId: 'p1', quantity: 60, vendorId: 'v1', shippingMethod: 'standard' }
      ]
    };
    const splits = service.suggestSplits(order);
    expect(splits).toHaveLength(2);
    expect(splits[0].items[0].quantity).toBe(50);
    expect(splits[1].items[0].quantity).toBe(10);
  });

  it('should split combined quantity across multiple items exceeding 50', () => {
    const service = new OrderSplitValidationService();
    const order: OrderWithMultipleItems = {
      id: 'o-5',
      items: [
        { productId: 'p1', quantity: 30, vendorId: 'v1', shippingMethod: 'standard' },
        { productId: 'p2', quantity: 30, vendorId: 'v1', shippingMethod: 'standard' }
      ]
    };
    const splits = service.suggestSplits(order);
    expect(splits).toHaveLength(2);
    expect(splits[0].items.reduce((sum, i) => sum + i.quantity, 0)).toBe(50);
    expect(splits[1].items.reduce((sum, i) => sum + i.quantity, 0)).toBe(10);
  });

  it('returns immutable objects', () => {
    const service = new OrderSplitValidationService();
    const order: OrderWithMultipleItems = {
      id: 'o-6',
      items: [
        { productId: 'p1', quantity: 10, vendorId: 'v1', shippingMethod: 'standard' }
      ]
    };
    const splits = service.suggestSplits(order);
    expect(Object.isFrozen(splits)).toBe(true);
    expect(Object.isFrozen(splits[0])).toBe(true);
    expect(Object.isFrozen(splits[0].items)).toBe(true);
    expect(Object.isFrozen(splits[0].items[0])).toBe(true);
  });
});
