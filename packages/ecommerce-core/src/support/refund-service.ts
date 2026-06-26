/**
 * Refund Service — refund request lifecycle with approval thresholds.
 *
 * SOP Section 14.4: Refund process (8 steps).
 * SOP Section 27: Refund Return Log form fields.
 * Pure business logic with role-based approval thresholds.
 */

import { randomUUID } from 'node:crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResolutionType = 'partial_refund' | 'remake' | 'reship' | 'store_credit' | 'full_refund'
export type RefundStatus = 'pending_approval' | 'approved' | 'processed' | 'disputed'
export type FaultType = 'customer' | 'shipping' | 'production' | 'design' | 'listing_error'

export interface RefundRequest {
  id: string
  orderId: string
  channel: string
  sku: string
  reason: string
  fault: FaultType
  amount: number
  resolution: ResolutionType
  handler: string
  status: RefundStatus
  preventionLesson?: string
  createdAt: string
  updatedAt: string
}

export interface InitiateRefundInput {
  orderId: string
  channel: string
  sku: string
  reason: string
  fault: FaultType
  amount: number
  resolution: ResolutionType
  handler: string
}

// ─── Thresholds ──────────────────────────────────────────────────────────────

/**
 * Refund approval thresholds by role.
 * SOP Section 14.4 step 5: if refund exceeds authorized amount, request approval.
 */
export const REFUND_THRESHOLDS = {
  agent: { maxAmount: 20, maxPercentOfOrder: 0.5 },
  teamLead: { maxAmount: 50, maxPercentOfOrder: 1.0 },
  manager: { maxAmount: 200, maxPercentOfOrder: 2.0 },
  director: { maxAmount: Infinity, maxPercentOfOrder: Infinity },
} as const

export type ApproverRole = keyof typeof REFUND_THRESHOLDS

// ─── Storage Interface ───────────────────────────────────────────────────────

export interface RefundStorage {
  findAll(): RefundRequest[]
  findById(id: string): RefundRequest | undefined
  create(refund: RefundRequest): RefundRequest
  update(id: string, updates: Partial<RefundRequest>): RefundRequest | undefined
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class RefundService {
  constructor(
    private storage: RefundStorage,
    private getOrderTotal?: (orderId: string) => number,
  ) {}

  /**
   * Step 1-4: Determine reason, check channel policy, identify fault, choose resolution.
   * If amount exceeds agent threshold -> status = pending_approval.
   * Otherwise auto-approved.
   */
  initiateRefund(input: InitiateRefundInput): RefundRequest {
    const orderTotal = this.getOrderTotal?.(input.orderId) ?? Infinity
    const threshold = REFUND_THRESHOLDS.agent
    const needsApproval = input.amount > threshold.maxAmount ||
      (orderTotal !== Infinity && input.amount / orderTotal > threshold.maxPercentOfOrder)

    const now = new Date().toISOString()
    const refund: RefundRequest = {
      id: randomUUID(),
      orderId: input.orderId,
      channel: input.channel,
      sku: input.sku,
      reason: input.reason,
      fault: input.fault,
      amount: input.amount,
      resolution: input.resolution,
      handler: input.handler,
      status: needsApproval ? 'pending_approval' : 'approved',
      createdAt: now,
      updatedAt: now,
    }

    return this.storage.create(refund)
  }

  /**
   * Step 5: Approve refund request with role-based threshold check.
   * Throws if amount exceeds role's authorized limit.
   */
  approveRefund(id: string, approverRole: ApproverRole): RefundRequest {
    const refund = this.storage.findById(id)
    if (!refund) {
      throw new Error(`Refund ${id} not found`)
    }

    if (refund.status !== 'pending_approval') {
      throw new Error(`Refund ${id} is not pending approval (current status: ${refund.status})`)
    }

    const threshold = REFUND_THRESHOLDS[approverRole]
    const orderTotal = this.getOrderTotal?.(refund.orderId) ?? Infinity

    if (refund.amount > threshold.maxAmount) {
      throw new Error(
        `Amount $${refund.amount.toFixed(2)} exceeds ${approverRole} threshold of $${threshold.maxAmount}. Request higher-level approval.`,
      )
    }

    if (orderTotal !== Infinity && refund.amount / orderTotal > threshold.maxPercentOfOrder) {
      throw new Error(
        `Refund amount (${((refund.amount / orderTotal) * 100).toFixed(0)}% of order) exceeds ${approverRole} threshold (${(threshold.maxPercentOfOrder * 100).toFixed(0)}%). Request higher-level approval.`,
      )
    }

    const updated = this.storage.update(id, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    })

    return updated!
  }

  /**
   * Steps 6-7: Execute refund on platform, log in refund log.
   */
  processRefund(id: string): RefundRequest {
    const refund = this.storage.findById(id)
    if (!refund) {
      throw new Error(`Refund ${id} not found`)
    }

    if (refund.status !== 'approved') {
      throw new Error(`Refund ${id} must be approved before processing (current status: ${refund.status})`)
    }

    const updated = this.storage.update(id, {
      status: 'processed',
      updatedAt: new Date().toISOString(),
    })

    return updated!
  }

  /**
   * Step 8: Record root cause / prevention lesson.
   * SOP Section 27: "Bai hoc phong ngua" field.
   */
  logPreventionLesson(id: string, lesson: string): RefundRequest {
    const refund = this.storage.findById(id)
    if (!refund) {
      throw new Error(`Refund ${id} not found`)
    }

    const updated = this.storage.update(id, {
      preventionLesson: lesson,
      updatedAt: new Date().toISOString(),
    })

    return updated!
  }

  /**
   * Reject a refund request.
   * Moves from pending_approval to disputed status with rejection reason.
   */
  rejectRefund(id: string, reason: string): RefundRequest {
    const refund = this.storage.findById(id)
    if (!refund) {
      throw new Error(`Refund ${id} not found`)
    }

    if (refund.status !== 'pending_approval') {
      throw new Error(`Refund ${id} is not pending approval (current status: ${refund.status})`)
    }

    const updated = this.storage.update(id, {
      status: 'disputed',
      reason,
      updatedAt: new Date().toISOString(),
    })

    return updated!
  }

  /**
   * Get a refund request by ID.
   */
  getRefund(id: string): RefundRequest | undefined {
    return this.storage.findById(id)
  }

  /**
   * Get all refund requests.
   */
  getRefunds(): RefundRequest[] {
    return this.storage.findAll()
  }
}
