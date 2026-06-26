import { describe, it, expect } from 'vitest';
import { OrderSplitValidationService } from './order-split-validation-service.js';
import type { OrderWithMultipleItems } from './order-split-validation-service.js';

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
