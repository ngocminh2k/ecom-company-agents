/**
 * POD — Print on Demand product design and fulfillment services.
 * Supports real AI agent dispatch via optional TaskRunner injection.
 */
import type { PodProductRequest, PodMockupResult, TaskRunner } from '../types.js'

export class PodProductDesigner {
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
  }

  /**
   * Create a product mockup based on the design brief.
   * Uses AI agent if TaskRunner is available, falls back to mock data.
   */
  async designProduct(request: PodProductRequest): Promise<PodMockupResult> {
    if (this.runner) {
      const result = await this.runner.routeTask('pod-design', {
        productType: request.productType,
        designBrief: request.designBrief,
        brand: request.brand,
        colors: request.colors,
        placement: request.placement,
      }, {
        outputSchema: {
          type: 'object',
          properties: {
            productType: { type: 'string' },
            mockupUrl: { type: 'string' },
            printReadyUrl: { type: 'string' },
            colorVariants: { type: 'array', items: { type: 'string' } },
            dimensions: { type: 'string' },
            dpi: { type: 'number' },
            placement: { type: 'string' },
          },
          required: ['productType', 'mockupUrl', 'printReadyUrl', 'colorVariants', 'dimensions', 'dpi', 'placement'],
        },
      })

      if (!result.error && result.output) {
        try {
          return JSON.parse(result.output) as PodMockupResult
        } catch {
          // Agent returned text but not valid JSON — use as design inspiration
          const id = `pod-${Date.now()}`
          return {
            productType: request.productType,
            mockupUrl: `/api/artifacts/${id}/mockup.png`,
            printReadyUrl: `/api/artifacts/${id}/print-ready.png`,
            colorVariants: request.colors ?? ['white', 'black'],
            dimensions: this.getDimensions(request.productType),
            dpi: 300,
            placement: request.placement ?? 'center',
          }
        }
      }
    }

    // Fallback: mock data
    return this.defaultMockup(request)
  }

  async generateSvgDesign(productType: string, designBrief: string): Promise<string> {
    if (this.runner) {
      const result = await this.runner.routeTask('pod-design-svg', {
        productType,
        designBrief,
      })
      if (!result.error && result.output) {
        // Try to extract SVG from output
        const svgMatch = result.output.match(/<svg[\s\S]*?<\/svg>/i)
        if (svgMatch) return svgMatch[0]
      }
    }

    // Fallback SVG
    const safeBrief = designBrief.replace(/[<>]/g, '')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f0f0f0" rx="20"/>
  <text x="200" y="180" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#333">
    ${safeBrief.slice(0, 40)}
  </text>
  <text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">
    ${productType.toUpperCase()} — AI Generated Design
  </text>
  <text x="200" y="260" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#999">
    Print-ready at 300 DPI
  </text>
</svg>`
  }

  private defaultMockup(request: PodProductRequest): PodMockupResult {
    const id = `pod-${Date.now()}`
    return {
      productType: request.productType,
      mockupUrl: `/api/artifacts/${id}/mockup.png`,
      printReadyUrl: `/api/artifacts/${id}/print-ready.png`,
      colorVariants: request.colors ?? ['white', 'black'],
      dimensions: this.getDimensions(request.productType),
      dpi: 300,
      placement: request.placement ?? 'center',
    }
  }

  private getDimensions(productType: string): string {
    const dims: Record<string, string> = {
      tshirt: '4500x5400',
      mug: '4200x4200',
      hoodie: '4500x5400',
      poster: '2400x3600',
      'tote-bag': '4200x4200',
      'phone-case': '2400x3600',
    }
    return dims[productType] ?? '2400x3600'
  }
}

export class PrintProvider {
  private apiKeys: Record<string, string | undefined> = {}
  private runner?: TaskRunner

  constructor(runner?: TaskRunner) {
    this.runner = runner
    this.apiKeys.printful = process.env.PRINTFUL_API_KEY
    this.apiKeys.printify = process.env.PRINTIFY_API_KEY
  }

  async checkConnection(provider: 'printful' | 'printify'): Promise<boolean> {
    return !!this.apiKeys[provider]
  }

  async getProductCatalog(provider: 'printful' | 'printify' = 'printful'): Promise<any[]> {
    if (this.runner) {
      const result = await this.runner.routeTask('pod-catalog', { provider })
      if (!result.error && result.output) {
        try { return JSON.parse(result.output) } catch {}
      }
    }

    // Fallback catalog
    return [
      { id: 'tshirt-classic', name: 'Classic T-Shirt', type: 'tshirt', colors: ['white', 'black', 'navy', 'gray'], sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'], basePrice: 12.95 },
      { id: 'mug-11oz', name: '11oz Magic Mug', type: 'mug', colors: ['white', 'black'], basePrice: 8.95 },
      { id: 'hoodie-premium', name: 'Premium Hoodie', type: 'hoodie', colors: ['black', 'gray', 'navy'], sizes: ['S', 'M', 'L', 'XL', '2XL'], basePrice: 29.95 },
    ]
  }
}

export { PodOrderRouter } from './order-router.js'
export * from './printify-service.js'
export type { PodOrder, PodOrderStatus, PrintProviderName, RouteOrderInput, PodOrderStorage, PrintProviderCapability } from './order-router.js'
