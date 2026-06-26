import { describe, it, expect } from 'vitest';
import { CatalogPublishGateService, validatePublishReadiness, PublishApprovalInput } from './catalog-publish-gate.js';
import { ProductEntity } from './entity.js';

describe('Catalog Publish Gate', () => {
  const service = new CatalogPublishGateService();

  const baseProduct: ProductEntity = {
    id: 'prod-123',
    name: 'Awesome T-Shirt',
    type: 'pod',
    status: 'ready_for_launch',
    weight: 0.5,
    category: 'Apparel',
    price: 25,
    cost: 10,
    tags: [],
    isPersonalized: false,
    processingTimeDays: 3,
    metadata: { version: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validApprovalInput: PublishApprovalInput = {
    productId: 'prod-123',
    reviewerId: 'user-manager',
    creatorId: 'user-creator',
    images: ['https://example.com/image1.jpg'],
    dimensions: { length: 10, width: 10, height: 2 }
  };

  it('validates publish readiness successfully', () => {
    const errors = validatePublishReadiness(baseProduct, validApprovalInput);
    expect(errors).toHaveLength(0);
  });

  it('fails if reviewer is the same as creator (4-eyes principle)', () => {
    const errors = validatePublishReadiness(baseProduct, {
      ...validApprovalInput,
      reviewerId: 'user-creator'
    });
    expect(errors).toContain('Reviewer must be different from creator (4-eyes principle)');
  });

  it('fails if there are no images', () => {
    const errors = validatePublishReadiness(baseProduct, {
      ...validApprovalInput,
      images: []
    });
    expect(errors).toContain('At least one product image is required for publishing');
  });

  it('fails if weight or dimensions are missing', () => {
    const p1 = { ...baseProduct, weight: undefined };
    const e1 = validatePublishReadiness(p1, validApprovalInput);
    expect(e1).toContain('Weight and dimensions are required for accurate logistics routing');

    const e2 = validatePublishReadiness(baseProduct, { ...validApprovalInput, dimensions: undefined });
    expect(e2).toContain('Weight and dimensions are required for accurate logistics routing');
  });

  it('fails if category is missing', () => {
    const p = { ...baseProduct, category: undefined };
    const errors = validatePublishReadiness(p, validApprovalInput);
    expect(errors).toContain('Product taxonomy/category must be mapped before publishing');
  });

  it('fails if price is not set or not strictly greater than cost', () => {
    const p1 = { ...baseProduct, price: undefined };
    const e1 = validatePublishReadiness(p1, validApprovalInput);
    expect(e1).toContain('Price must be set and strictly greater than cost');

    const p2 = { ...baseProduct, price: 10, cost: 10 };
    const e2 = validatePublishReadiness(p2, validApprovalInput);
    expect(e2).toContain('Price must be set and strictly greater than cost');
  });

  it('publishes product and returns an immutable copy with active status and publishSnapshot', () => {
    const publishedProduct = service.publishProduct(baseProduct, validApprovalInput);

    expect(publishedProduct).not.toBe(baseProduct); // Check immutability
    expect(publishedProduct.status).toBe('active');
    expect(publishedProduct.metadata.publishSnapshot).toBeDefined();
    
    const snapshot = publishedProduct.metadata.publishSnapshot as any;
    expect(snapshot.approvedBy).toBe('user-manager');
    expect(snapshot.version).toBe(2);
    expect(new Date(snapshot.approvedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('throws an error during publish if validation fails', () => {
    const invalidInput = { ...validApprovalInput, images: [] };
    
    expect(() => {
      service.publishProduct(baseProduct, invalidInput);
    }).toThrowError(/Publish Gate Failed:/);
  });
});
