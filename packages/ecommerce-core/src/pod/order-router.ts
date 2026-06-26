/**
 * POD Order Router — route POD orders to print providers and track status.
 *
 * SOP Section 13: Print provider order routing.
 * Pure TypeScript, no agent, no mock.
 */

import { randomUUID } from 'node:crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrintProviderName = 'printful' | 'printify' | 'custom'

export type PodOrderStatus =
  | 'pending'
  | 'routed'
  | 'processing'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'failed'

export interface PodOrder {
  id: string
  sku: string
  variant: string
  quantity: number
  shippingAddress: string
  printProvider: PrintProviderName
  status: PodOrderStatus
  trackingNumber?: string
  shipDate?: string
  createdAt: string
  updatedAt: string
}

export interface RouteOrderInput {
  sku: string
  variant: string
  quantity: number
  shippingAddress: string
  printProvider: PrintProviderName
}

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface PodOrderStorage {
  findAll(): PodOrder[]
  findById(id: string): PodOrder | undefined
  findByStatus(status: PodOrderStatus): PodOrder[]
  insert(order: PodOrder): void
  update(id: string, order: PodOrder): void
}

// ─── Routing Rules ────────────────────────────────────────────────────────────

export interface PrintProviderCapability {
  provider: PrintProviderName
  supportedSkus: string[]
  maxQuantity: number
  regions: string[]
  baseProcessingDays: number
}

export const DEFAULT_PRINT_CAPABILITIES: PrintProviderCapability[] = [
  {
    provider: 'printful',
    supportedSkus: ['tshirt', 'mug', 'hoodie', 'poster', 'tote-bag', 'phone-case'],
    maxQuantity: 100,
    regions: ['US', 'EU', 'UK', 'CA', 'AU'],
    baseProcessingDays: 3,
  },
  {
    provider: 'printify',
    supportedSkus: ['tshirt', 'mug', 'hoodie', 'poster', 'tote-bag', 'phone-case'],
    maxQuantity: 50,
    regions: ['US', 'EU', 'UK', 'CA'],
    baseProcessingDays: 5,
  },
]

// ─── Service ──────────────────────────────────────────────────────────────────

export class PodOrderRouter {
  constructor(
    private storage: PodOrderStorage,
    private capabilities: PrintProviderCapability[] = DEFAULT_PRINT_CAPABILITIES,
  ) {}

  routeToPrintProvider(input: RouteOrderInput): PodOrder {
    if (!input.sku || !input.sku.trim()) throw new Error('SKU is required')
    if (!input.variant || !input.variant.trim()) throw new Error('Variant is required')
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new Error('Quantity must be a positive integer')
    }
    if (!input.shippingAddress || !input.shippingAddress.trim()) throw new Error('Shipping address is required')
    if (!input.printProvider) throw new Error('Print provider is required')

    // Validate provider capability
    const cap = this.capabilities.find(c => c.provider === input.printProvider)
    if (!cap) throw new Error(`Unsupported print provider: ${input.printProvider}`)

    if (input.quantity > cap.maxQuantity) {
      throw new Error(`Quantity ${input.quantity} exceeds ${input.printProvider} max of ${cap.maxQuantity}`)
    }

    const now = new Date().toISOString()
    const order: PodOrder = {
      id: randomUUID(),
      sku: input.sku.trim(),
      variant: input.variant.trim(),
      quantity: input.quantity,
      shippingAddress: input.shippingAddress.trim(),
      printProvider: input.printProvider,
      status: 'routed',
      createdAt: now,
      updatedAt: now,
    }

    this.storage.insert(order)
    return order
  }

  checkPrintStatus(id: string, newStatus: PodOrderStatus, details?: {
    trackingNumber?: string
    shipDate?: string
  }): PodOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`POD order ${id} not found`)

    const validTransitions: Record<PodOrderStatus, PodOrderStatus[]> = {
      pending: ['routed'],
      routed: ['processing', 'failed'],
      processing: ['in_production', 'failed'],
      in_production: ['shipped', 'failed'],
      shipped: ['delivered', 'failed'],
      delivered: [],
      failed: [],
    }

    const allowed = validTransitions[order.status]
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition from "${order.status}" to "${newStatus}". Valid: [${allowed?.join(', ')}]`,
      )
    }

    const updated: PodOrder = {
      ...order,
      status: newStatus,
      ...(details?.trackingNumber ? { trackingNumber: details.trackingNumber } : {}),
      ...(details?.shipDate ? { shipDate: details.shipDate } : {}),
      updatedAt: new Date().toISOString(),
    }

    this.storage.update(id, updated)
    return updated
  }

  getActivePrintOrders(): PodOrder[] {
    const activeStatuses: PodOrderStatus[] = ['pending', 'routed', 'processing', 'in_production']
    return this.storage.findAll().filter(o => activeStatuses.includes(o.status))
  }
}
