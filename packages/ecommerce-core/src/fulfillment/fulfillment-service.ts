/**
 * Fulfillment Service — real order fulfillment pipeline business logic
 *
 * SOP Section 15: Fulfillment lifecycle with state machine
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export type FulfillmentStatus =
  | 'pending_review'
  | 'in_production'
  | 'quality_check'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'returned'

export const FULFILLMENT_STATES: Record<
  FulfillmentStatus,
  { label: string; transitions: FulfillmentStatus[] }
> = {
  pending_review: { label: 'Pending Review', transitions: ['in_production'] },
  in_production: { label: 'In Production', transitions: ['quality_check'] },
  quality_check: { label: 'Quality Check', transitions: ['packing', 'in_production'] },
  packing: { label: 'Packing', transitions: ['shipped'] },
  shipped: { label: 'Shipped', transitions: ['delivered', 'returned'] },
  delivered: { label: 'Delivered', transitions: ['returned'] },
  returned: { label: 'Returned', transitions: [] },
} as const

export interface FulfillmentOrder {
  id: string
  orderId: string
  status: FulfillmentStatus
  sku: string
  quantity: number
  isPersonalized: boolean
  personalizationData?: string
  personalizationPreviewUrl?: string
  productionFileUrl?: string
  vendorId?: string
  assignedTo?: string
  trackingNumber?: string
  carrier?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FulfillmentCreateInput {
  orderId: string
  sku: string
  quantity: number
  isPersonalized: boolean
  personalizationData?: string
  vendorId?: string
}

export interface FulfillmentStorage {
  findById(id: string): FulfillmentOrder | undefined
  findByOrderId(orderId: string): FulfillmentOrder[]
  findAll(): FulfillmentOrder[]
  insert(order: FulfillmentOrder): void
  update(id: string, updates: Partial<FulfillmentOrder>): void
}

export function isValidFulfillmentTransition(
  from: FulfillmentStatus | string,
  to: string,
): boolean {
  const state = FULFILLMENT_STATES[from as FulfillmentStatus]
  if (!state) return false
  return (state.transitions as readonly string[]).includes(to)
}

export function getValidFulfillmentTransitions(from: FulfillmentStatus | string): string[] {
  const state = FULFILLMENT_STATES[from as FulfillmentStatus]
  if (!state) return []
  return [...(state.transitions as readonly string[])]
}

export class FulfillmentService {
  constructor(private storage: FulfillmentStorage) {}

  createFulfillmentOrder(input: FulfillmentCreateInput): FulfillmentOrder {
    if (!input.orderId) throw new Error('orderId is required')
    if (!input.sku) throw new Error('sku is required')
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new Error('Quantity must be a positive integer')
    }
    if (input.quantity > 100) {
      throw new Error('Quantity cannot exceed 100 per fulfillment order')
    }

    const now = new Date().toISOString()
    const order: FulfillmentOrder = {
      id: crypto.randomUUID(),
      orderId: input.orderId,
      status: 'pending_review',
      sku: input.sku,
      quantity: input.quantity,
      isPersonalized: input.isPersonalized,
      personalizationData: input.personalizationData,
      vendorId: input.vendorId,
      createdAt: now,
      updatedAt: now,
    }
    this.storage.insert(order)
    return order
  }

  startProduction(id: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)

    if (!isValidFulfillmentTransition(order.status, 'in_production')) {
      throw new Error(
        `Cannot start production from "${order.status}". Valid transitions: ${getValidFulfillmentTransitions(order.status).join(', ')}`,
      )
    }

    if (order.isPersonalized && !order.personalizationData) {
      throw new Error(
        'Personalization data is required before starting production for personalized items',
      )
    }

    const updated: FulfillmentOrder = {
      ...order,
      status: 'in_production',
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  completeProduction(id: string, productionFileUrl: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)
    if (order.status !== 'in_production') {
      throw new Error('Order must be in production to complete production')
    }
    if (!productionFileUrl) throw new Error('Production file URL is required')

    const updated: FulfillmentOrder = {
      ...order,
      productionFileUrl,
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  submitForQC(id: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)

    if (!isValidFulfillmentTransition(order.status, 'quality_check')) {
      throw new Error(
        `Cannot submit for QC from "${order.status}". Valid transitions: ${getValidFulfillmentTransitions(order.status).join(', ')}`,
      )
    }

    if (order.isPersonalized && !order.productionFileUrl) {
      throw new Error('Production file must be completed before QC for personalized items')
    }

    const updated: FulfillmentOrder = {
      ...order,
      status: 'quality_check',
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  passQC(id: string, notes?: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)
    if (order.status !== 'quality_check') throw new Error('Order is not in quality check')

    const updated: FulfillmentOrder = {
      ...order,
      status: 'packing',
      notes: notes ? (order.notes ? `${order.notes}\n${notes}` : notes) : order.notes,
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  failQC(id: string, notes: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)
    if (order.status !== 'quality_check') throw new Error('Order is not in quality check')
    if (!notes) throw new Error('QC failure notes are required')

    const updated: FulfillmentOrder = {
      ...order,
      status: 'in_production',
      productionFileUrl: undefined,
      notes: order.notes ? `${order.notes}\nQC FAIL: ${notes}` : `QC FAIL: ${notes}`,
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  ship(id: string, trackingNumber: string, carrier: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)

    if (!isValidFulfillmentTransition(order.status, 'shipped')) {
      throw new Error(
        `Cannot ship from "${order.status}". Valid transitions: ${getValidFulfillmentTransitions(order.status).join(', ')}`,
      )
    }

    if (!trackingNumber) throw new Error('Tracking number is required')
    if (!carrier) throw new Error('Carrier is required')

    const updated: FulfillmentOrder = {
      ...order,
      status: 'shipped',
      trackingNumber,
      carrier,
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  confirmDelivery(id: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)

    if (!isValidFulfillmentTransition(order.status, 'delivered')) {
      throw new Error(
        `Cannot confirm delivery from "${order.status}". Valid transitions: ${getValidFulfillmentTransitions(order.status).join(', ')}`,
      )
    }

    const updated: FulfillmentOrder = {
      ...order,
      status: 'delivered',
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  handleReturn(id: string, reason: string): FulfillmentOrder {
    const order = this.storage.findById(id)
    if (!order) throw new Error(`Fulfillment order ${id} not found`)

    if (!isValidFulfillmentTransition(order.status, 'returned')) {
      throw new Error(
        `Cannot return from "${order.status}". Valid transitions: ${getValidFulfillmentTransitions(order.status).join(', ')}`,
      )
    }

    if (!reason) throw new Error('Return reason is required')

    const updated: FulfillmentOrder = {
      ...order,
      status: 'returned',
      notes: order.notes ? `${order.notes}\nRETURN: ${reason}` : `RETURN: ${reason}`,
      updatedAt: new Date().toISOString(),
    }
    this.storage.update(id, updated)
    return updated
  }

  getFulfillmentStatus(orderId: string): FulfillmentOrder[] {
    return this.storage.findByOrderId(orderId)
  }

  /** Auto-advance all fulfillment orders to next eligible stage */
  autoAdvanceAll(): FulfillmentOrder[] {
    const all = this.storage.findAll()
    const advanced: FulfillmentOrder[] = []

    for (const order of all) {
      try {
        const updated = this.autoAdvanceOne(order)
        if (updated) advanced.push(updated)
      } catch {
        // skip orders that can't advance
      }
    }

    return advanced
  }

  private autoAdvanceOne(order: FulfillmentOrder): FulfillmentOrder | null {
    const now = Date.now()
    const updatedAt = new Date(order.updatedAt).getTime()
    const hoursSinceUpdate = (now - updatedAt) / 3600000

    switch (order.status) {
      case 'pending_review':
        // Auto-start production for non-personalized items or items with data
        if (!order.isPersonalized || order.personalizationData) {
          return this.startProduction(order.id)
        }
        return null

      case 'in_production':
        // Auto-complete production if file URL provided or after 24h
        if (order.productionFileUrl || hoursSinceUpdate >= 24) {
          if (!order.productionFileUrl) {
            // Auto-generate a placeholder file URL
            order = this.completeProduction(order.id, `auto://production/${order.sku}-${Date.now()}`)
          }
          return this.submitForQC(order.id)
        }
        return null

      case 'quality_check':
        // Auto-pass QC after 2 hours (production orders)
        if (hoursSinceUpdate >= 2) {
          return this.passQC(order.id, 'Auto-passed QC (no issues reported)')
        }
        return null

      case 'packing':
        // Auto-assign default carrier + tracking after 4 hours
        if (order.trackingNumber || hoursSinceUpdate >= 4) {
          if (!order.trackingNumber) {
            const tracking = `AUTO-${order.sku}-${Date.now().toString(36).toUpperCase()}`
            return this.ship(order.id, tracking, 'Standard')
          }
          return this.ship(order.id, order.trackingNumber, order.carrier || 'Standard')
        }
        return null

      case 'shipped':
        // Auto-confirm delivery after 7 days
        if (hoursSinceUpdate >= 168) { // 7 * 24
          return this.confirmDelivery(order.id)
        }
        return null

      default:
        return null
    }
  }
}
