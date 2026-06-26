import { ProductEntity } from './entity.js';

export interface PublishApprovalInput {
  productId: string;
  reviewerId: string;
  creatorId: string; // Extracted from product metadata
  images: string[];
  dimensions?: { length: number; width: number; height: number };
}

export function validatePublishReadiness(product: ProductEntity, input: PublishApprovalInput): string[] {
  const errors: string[] = [];

  // 1. 4-Eyes Review Principle
  if (input.reviewerId === input.creatorId) {
    errors.push('Reviewer must be different from creator (4-eyes principle)');
  }

  // 2. Mandatory Attributes Gate
  if (!input.images || input.images.length === 0) {
    errors.push('At least one product image is required for publishing');
  }

  if (product.weight === undefined || product.weight <= 0 || !input.dimensions) {
    errors.push('Weight and dimensions are required for accurate logistics routing');
  }

  if (!product.category) {
    errors.push('Product taxonomy/category must be mapped before publishing');
  }

  if (product.price === undefined || product.cost === undefined || product.price <= product.cost) {
    errors.push('Price must be set and strictly greater than cost');
  }

  return errors;
}

export class CatalogPublishGateService {
  /**
   * Approves and transitions a product to active/published state.
   * Returns an immutable copy of the product with snapshot metadata.
   */
  publishProduct(product: ProductEntity, input: PublishApprovalInput): ProductEntity {
    // Only allow transition from ready_for_launch or idea etc (we won't enforce state graph here strictly, but usually it transitions to active)
    
    const errors = validatePublishReadiness(product, input);
    
    if (errors.length > 0) {
      throw new Error(`Publish Gate Failed: ${errors.join(', ')}`);
    }

    return {
      ...product,
      status: 'active', // Using 'active' as the published state according to PRODUCT_STATES
      metadata: {
        ...product.metadata,
        publishSnapshot: {
          approvedBy: input.reviewerId,
          approvedAt: new Date().toISOString(),
          version: ((product.metadata?.version as number) || 1) + 1
        }
      },
      updatedAt: new Date().toISOString()
    };
  }
}
