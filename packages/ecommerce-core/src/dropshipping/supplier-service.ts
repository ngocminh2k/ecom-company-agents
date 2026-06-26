/**
 * Supplier Service — dropshipping supplier management, scoring, and flagging.
 *
 * SOP Section 9: Supplier onboarding and performance tracking.
 * Pure TypeScript, no agent, no mock.
 */

import { randomUUID } from 'node:crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupplierStatus = 'active' | 'inactive' | 'flagged'

export interface Supplier {
  id: string
  name: string
  platform: string
  contactEmail: string
  status: SupplierStatus
  avgShippingDays: number
  reliabilityScore: number
  createdAt: string
  updatedAt: string
}

export interface AddSupplierInput {
  name: string
  platform: string
  contactEmail: string
  avgShippingDays: number
}

// ─── Storage Interface ────────────────────────────────────────────────────────

export interface SupplierStorage {
  findAll(): Supplier[]
  findById(id: string): Supplier | undefined
  insert(supplier: Supplier): void
  update(id: string, supplier: Supplier): void
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class SupplierService {
  constructor(private storage: SupplierStorage) {}

  addSupplier(input: AddSupplierInput): Supplier {
    if (!input.name || !input.name.trim()) throw new Error('Supplier name is required')
    if (!input.platform || !input.platform.trim()) throw new Error('Platform is required')
    if (!input.contactEmail || !input.contactEmail.trim()) throw new Error('Contact email is required')
    if (!Number.isFinite(input.avgShippingDays) || input.avgShippingDays < 1) {
      throw new Error('Average shipping days must be a positive number')
    }

    const now = new Date().toISOString()
    const supplier: Supplier = {
      id: randomUUID(),
      name: input.name.trim(),
      platform: input.platform.trim(),
      contactEmail: input.contactEmail.trim(),
      status: 'active',
      avgShippingDays: input.avgShippingDays,
      reliabilityScore: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.storage.insert(supplier)
    return supplier
  }

  updateSupplierScore(id: string, score: number): Supplier {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('Reliability score must be between 0 and 100')
    }

    const supplier = this.storage.findById(id)
    if (!supplier) throw new Error(`Supplier ${id} not found`)

    const updated: Supplier = {
      ...supplier,
      reliabilityScore: Math.round(score * 10) / 10,
      updatedAt: new Date().toISOString(),
    }

    this.storage.update(id, updated)
    return updated
  }

  getTopSuppliers(minScore: number = 0, limit: number = 10): Supplier[] {
    const all = this.storage.findAll()
    return all
      .filter(s => s.status === 'active' && s.reliabilityScore >= minScore)
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
      .slice(0, limit)
  }

  flagSupplier(id: string, reason?: string): Supplier {
    const supplier = this.storage.findById(id)
    if (!supplier) throw new Error(`Supplier ${id} not found`)

    if (supplier.status === 'flagged') {
      throw new Error(`Supplier ${id} is already flagged`)
    }

    const notes = reason ? `Flagged: ${reason}` : 'Flagged'
    const updated: Supplier = {
      ...supplier,
      status: 'flagged',
      updatedAt: new Date().toISOString(),
    }

    this.storage.update(id, updated)
    return updated
  }
}
