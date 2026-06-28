/**
 * Shared TypeScript types for ECC OmniStudio.
 */

// ─── API Responses ─────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  error: boolean
  message?: string
  data?: T
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
}

// ─── E-Commerce ────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  type: 'pod' | 'dropshipping' | 'digital'
  status: 'draft' | 'active' | 'archived'
  description?: string
  sku?: string
  price?: number
  cost?: number
  supplierId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  productId: string
  quantity: number
  total?: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  customerEmail?: string
  shippingAddress?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  name: string
  platform: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  budget?: number
  productIds?: string[]
  adCreativePath?: string
  metrics?: Record<string, number>
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  name: string
  platform: 'printful' | 'printify' | 'aliexpress' | 'custom'
  apiKey?: string
  apiUrl?: string
  enabled: boolean
  createdAt: string
}

// ─── Project / Conversation ────────────────────────────────────────

export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  id: string
  projectId?: string
  title: string
  agentId?: string
  skillId?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agentId?: string
  createdAt: string
}
export * from './agent-adapter-mocks.js';
