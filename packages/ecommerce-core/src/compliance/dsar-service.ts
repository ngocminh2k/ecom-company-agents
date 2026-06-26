import { randomUUID } from 'node:crypto'
import { ValidationError } from '../order/service.js'

export type DsarRequestType = 'access' | 'deletion' | 'correction' | 'portability' | 'withdrawal_of_consent'
export type DsarStatus = 'received' | 'in_progress' | 'fulfilled' | 'rejected' | 'escalated'

export interface DsarRequest {
  id: string
  customerId: string
  requestType: DsarRequestType
  status: DsarStatus
  details: string
  dueDate: string
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

export interface DsarStorage {
  create(request: DsarRequest): DsarRequest
  findById(id: string): DsarRequest | undefined
  update(id: string, updates: Partial<DsarRequest>): DsarRequest | undefined
  findOverdue(currentDate: string): DsarRequest[]
}

export class DsarService {
  // Statutory SLA in hours (72 hours per PDPD)
  private readonly SLA_HOURS = 72

  constructor(private storage: DsarStorage) {}

  submitRequest(customerId: string, type: DsarRequestType, details: string): DsarRequest {
    if (!customerId) throw new ValidationError('customerId is required')
    if (!type) throw new ValidationError('requestType is required')
    if (!details) throw new ValidationError('details is required')

    const now = new Date()
    const dueDate = new Date(now.getTime() + this.SLA_HOURS * 60 * 60 * 1000)

    const request: DsarRequest = {
      id: randomUUID(),
      customerId,
      requestType: type,
      status: 'received',
      details,
      dueDate: dueDate.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    return this.storage.create(request)
  }

  resolveRequest(id: string, resolutionNotes: string): DsarRequest {
    if (!id) throw new ValidationError('id is required')
    if (!resolutionNotes) throw new ValidationError('resolutionNotes is required')

    const request = this.storage.findById(id)
    if (!request) {
      throw new ValidationError('Request not found', [`No DSAR request with id: ${id}`])
    }

    if (request.status === 'fulfilled' || request.status === 'rejected') {
      throw new ValidationError('Request is already closed', [`Current status: ${request.status}`])
    }

    const updated = this.storage.update(id, {
      status: 'fulfilled',
      resolutionNotes,
      updatedAt: new Date().toISOString(),
    })

    if (!updated) {
      throw new ValidationError('Failed to update request')
    }

    return updated
  }

  rejectRequest(id: string, legalJustification: string): DsarRequest {
    if (!id) throw new ValidationError('id is required')
    if (!legalJustification) throw new ValidationError('legalJustification is required')

    const request = this.storage.findById(id)
    if (!request) {
      throw new ValidationError('Request not found', [`No DSAR request with id: ${id}`])
    }

    if (request.status === 'fulfilled' || request.status === 'rejected') {
      throw new ValidationError('Request is already closed', [`Current status: ${request.status}`])
    }

    const updated = this.storage.update(id, {
      status: 'rejected',
      resolutionNotes: legalJustification,
      updatedAt: new Date().toISOString(),
    })

    if (!updated) {
      throw new ValidationError('Failed to update request')
    }

    return updated
  }

  checkSlaBreaches(): DsarRequest[] {
    const now = new Date().toISOString()
    return this.storage.findOverdue(now)
  }
}
