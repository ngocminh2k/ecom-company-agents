/**
 * Order Entity — real order management business logic
 *
 * SOP Section 14-15: Order processing, refund handling, QC
 * KHÔNG dùng agent. KHÔNG mock. Code thuần + state machine.
 */
import type { OrderStatus } from './state.js'
import { isValidOrderTransition } from './state.js'

export interface OrderEntity {
  id: string
  productId: string
  productName?: string
  sku?: string
  quantity: number
  unitPrice: number
  total: number
  status: OrderStatus
  customerEmail?: string
  customerName?: string
  shippingAddress?: string
  trackingNumber?: string
  carrier?: string
  isPersonalized: boolean
  personalizationData?: string
  personalizationPreviewUrl?: string
  productionFileUrl?: string
  productionVendor?: string
  notes?: string
  refundAmount?: number
  refundReason?: string
  createdAt: string
  updatedAt: string
}

export interface OrderCreateInput {
  productId: string
  quantity?: number
  customerEmail?: string
  customerName?: string
  shippingAddress?: string
  isPersonalized?: boolean
  personalizationData?: string
  notes?: string
}

export interface OrderStatusUpdateInput {
  status: string
  trackingNumber?: string
  carrier?: string
}

export function validateOrderCreate(input: OrderCreateInput): string[] {
  const errors: string[] = []

  if (!input.productId) {
    errors.push('productId is required')
  }

  if (input.quantity !== undefined) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      errors.push('Quantity must be a positive integer')
    }
    if (input.quantity > 100) {
      errors.push('Quantity cannot exceed 100 per order')
    }
  }

  if (input.shippingAddress && input.shippingAddress.length > 500) {
    errors.push('Shipping address too long (max 500 characters)')
  }

  if (input.customerEmail && !input.customerEmail.includes('@')) {
    errors.push('Invalid email format')
  }

  return errors
}

export function validateOrderStatusUpdate(input: OrderStatusUpdateInput): string[] {
  const errors: string[] = []

  if (!input.status) {
    errors.push('Status is required')
  }

  if (input.trackingNumber && input.trackingNumber.length > 100) {
    errors.push('Tracking number too long (max 100 characters)')
  }

  return errors
}

/**
 * Validate a status transition.
 * Returns error message if invalid, null if valid.
 */
export function checkOrderTransition(order: OrderEntity, newStatus: string): string | null {
  if (!isValidOrderTransition(order.status, newStatus)) {
    return `Cannot transition from "${order.status}" to "${newStatus}". Valid transitions: ${getValidTransitions(order.status)}`
  }

  // Additional business rules
  if (newStatus === 'shipped' && !order.trackingNumber) {
    return 'Cannot mark as shipped without tracking number'
  }

  if (newStatus === 'delivered' && order.isPersonalized && !order.personalizationPreviewUrl) {
    return 'Personalized orders must have preview before delivery'
  }

  return null
}

function getValidTransitions(from: string): string {
  const state = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered', 'returned'], delivered: ['returned', 'refunded'], cancelled: [], returned: ['refunded'], refunded: [] } as Record<string, string[]>
  const t = state[from]
  return t ? t.join(', ') : 'none'
}
