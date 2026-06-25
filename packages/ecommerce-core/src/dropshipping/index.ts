/**
 * Dropshipping — product research, supplier management, order processing.
 * Supports real AI agent dispatch via optional TaskRunner injection.
 */
import type { DropshippingResearchRequest, ProductRecommendation, TaskRunner } from '../types.js'

export class ProductResearchService {
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  async research(request: DropshippingResearchRequest): Promise<ProductRecommendation[]> {
    if (this.runner) {
      const result = await this.runner.routeTask('product-research', {
        niche: request.niche,
        minPrice: request.minPrice,
        maxPrice: request.maxPrice,
        minMargin: request.minMargin,
      }, {
        outputSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string' },
              costPrice: { type: 'number' },
              sellingPrice: { type: 'number' },
              estimatedMargin: { type: 'number' },
              competition: { type: 'string', enum: ['low', 'medium', 'high'] },
              demandSignal: { type: 'string', enum: ['trending', 'stable', 'declining'] },
              suppliers: { type: 'array', items: { type: 'string' } },
              risk: { type: 'array', items: { type: 'string' } },
              goNoGo: { type: 'string', enum: ['go', 'no-go'] },
            },
            required: ['name', 'category', 'costPrice', 'sellingPrice', 'estimatedMargin', 'competition', 'demandSignal', 'suppliers', 'risk', 'goNoGo'],
          },
        },
      })

      if (!result.error && result.output) {
        try { return JSON.parse(result.output) as ProductRecommendation[] } catch {}
      }
    }

    // Fallback: mock research
    const minMargin = request.minMargin ?? 30
    return [
      {
        name: `Premium ${request.niche} Kit`, category: request.niche,
        costPrice: request.minPrice ?? 15, sellingPrice: (request.minPrice ?? 15) * 2.8,
        estimatedMargin: 64, competition: 'medium', demandSignal: 'trending',
        suppliers: ['AliExpress Supplier A', 'CJDropshipping'],
        risk: ['Seasonal demand fluctuation'], goNoGo: minMargin <= 64 ? 'go' : 'no-go',
      },
      {
        name: `Eco ${request.niche} Bundle`, category: request.niche,
        costPrice: (request.minPrice ?? 15) + 5, sellingPrice: ((request.minPrice ?? 15) + 5) * 3.0,
        estimatedMargin: 67, competition: 'low', demandSignal: 'trending',
        suppliers: ['AliExpress Supplier B', 'Spocket'],
        risk: ['Higher shipping cost'], goNoGo: minMargin <= 67 ? 'go' : 'no-go',
      },
      {
        name: `${request.niche} Essential Pack`, category: request.niche,
        costPrice: (request.minPrice ?? 15) + 2, sellingPrice: ((request.minPrice ?? 15) + 2) * 2.2,
        estimatedMargin: 55, competition: 'high', demandSignal: 'stable',
        suppliers: ['AliExpress Supplier C'], risk: ['High competition', 'Price pressure'],
        goNoGo: 'no-go',
      },
    ]
  }
}

export class SupplierImportService {
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  async searchSuppliers(query: string): Promise<any[]> {
    if (this.runner) {
      const result = await this.runner.routeTask('supplier-search', { query })
      if (!result.error && result.output) {
        try { return JSON.parse(result.output) } catch {}
      }
    }
    return [
      { name: 'Supplier Pro', platform: 'aliexpress', rating: 4.7, orders: 15000, shippingTime: '7-14 days', minOrder: 1 },
      { name: 'Quality Goods Co', platform: 'aliexpress', rating: 4.5, orders: 8700, shippingTime: '10-18 days', minOrder: 5 },
    ]
  }
}

export class OrderProcessorService {
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  async processOrder(order: { productId: string; quantity: number; shippingAddress: string; customerEmail: string }): Promise<{ orderId: string; status: string; trackingNumber?: string }> {
    if (this.runner) {
      const result = await this.runner.routeTask('order-processing', { ...order })
      if (!result.error && result.output) {
        try { return JSON.parse(result.output) } catch {}
      }
    }
    return {
      orderId: `ORD-${Date.now()}`,
      status: 'processing',
      trackingNumber: `TRK-${Date.now().toString(36).toUpperCase()}`,
    }
  }
}
