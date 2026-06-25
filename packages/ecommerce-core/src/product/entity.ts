/**
 * Product Entity — real business logic for product management
 *
 * Chứa validation rules, margin calculation, và lifecycle state.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */
import type { ProductStatus } from '../order/state.js'

export interface ProductEntity {
  id: string
  name: string
  type: 'pod' | 'dropshipping' | 'digital'
  status: ProductStatus
  description?: string
  sku?: string
  price?: number
  cost?: number
  shippingCost?: number
  supplierId?: string
  supplierName?: string
  category?: string
  tags: string[]
  weight?: number
  isPersonalized: boolean
  processingTimeDays: number
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProductCreateInput {
  name: string
  type: 'pod' | 'dropshipping' | 'digital'
  description?: string
  sku?: string
  price?: number
  cost?: number
  shippingCost?: number
  supplierId?: string
  category?: string
  tags?: string[]
  weight?: number
  isPersonalized?: boolean
  processingTimeDays?: number
}

export interface ProductUpdateInput {
  name?: string
  description?: string
  sku?: string
  price?: number
  cost?: number
  shippingCost?: number
  supplierId?: string
  category?: string
  tags?: string[]
  weight?: number
  isPersonalized?: boolean
  processingTimeDays?: number
}

export function validateProductCreate(input: ProductCreateInput): string[] {
  const errors: string[] = []

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Product name is required')
  } else {
    if (input.name.length < 3) errors.push('Product name must be at least 3 characters')
    if (input.name.length > 200) errors.push('Product name must be less than 200 characters')
  }

  if (!['pod', 'dropshipping', 'digital'].includes(input.type)) {
    errors.push('Product type must be pod, dropshipping, or digital')
  }

  if (input.price !== undefined) {
    if (input.price < 0) errors.push('Price cannot be negative')
    if (input.type === 'pod' && input.price < 0.5) errors.push('POD product price must be at least $0.50')
  }

  if (input.cost !== undefined && input.price !== undefined) {
    if (input.cost >= input.price) errors.push('Cost must be less than price')
  }

  if (input.sku && input.sku.length > 50) {
    errors.push('SKU must be less than 50 characters')
  }

  if (input.shippingCost !== undefined && input.shippingCost < 0) {
    errors.push('Shipping cost cannot be negative')
  }

  if (input.processingTimeDays !== undefined) {
    if (input.processingTimeDays < 1) errors.push('Processing time must be at least 1 day')
    if (input.processingTimeDays > 30) errors.push('Processing time cannot exceed 30 days')
  }

  return errors
}

export function calculateGrossMargin(price: number, cost: number): number {
  if (price <= 0) return 0
  return ((price - cost) / price) * 100
}

export function calculateContributionMargin(
  price: number,
  cost: number,
  shippingCost: number,
  platformFeePercent: number,
  platformFeeFixed: number,
  adCostPerUnit: number
): number {
  const netRevenue = price - platformFeePercent * price - platformFeeFixed
  const totalCost = cost + shippingCost + adCostPerUnit
  return netRevenue - totalCost
}
