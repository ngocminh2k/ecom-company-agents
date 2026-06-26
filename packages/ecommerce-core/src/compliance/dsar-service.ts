export interface DsarRequest {
  id: string
  customerId: string
  requestType: 'access' | 'deletion' | 'correction' | 'portability'
  status: 'submitted' | 'in_review' | 'processing' | 'fulfilled' | 'rejected'
  submittedAt: string // ISO 8601
  deadlineAt: string  // ISO 8601
  resolutionNotes?: string
}

export interface DsarStorage {
  findById(id: string): DsarRequest | undefined
  findAllActive(): DsarRequest[]
  upsert(request: DsarRequest): DsarRequest
}

const SLA_HOURS = 72

export class DsarService {
  constructor(private readonly storage: DsarStorage) {}

  submitRequest(customerId: string, type: 'access' | 'deletion' | 'correction' | 'portability'): DsarRequest {
    const now = new Date()
    const deadline = new Date(now.getTime() + SLA_HOURS * 60 * 60 * 1000)

    const request: DsarRequest = {
      id: crypto.randomUUID(),
      customerId,
      requestType: type,
      status: 'submitted',
      submittedAt: now.toISOString(),
      deadlineAt: deadline.toISOString(),
    }

    return this.storage.upsert(request)
  }

  transitionStatus(id: string, nextStatus: DsarRequest['status'], notes?: string): DsarRequest {
    const request = this.storage.findById(id)
    if (!request) {
      throw new Error(`DSAR not found: ${id}`)
    }

    const currentStatus = request.status

    if (currentStatus === 'fulfilled' || currentStatus === 'rejected') {
      throw new Error(`Cannot transition from terminal state: ${currentStatus}`)
    }

    if ((nextStatus === 'fulfilled' || nextStatus === 'rejected') && (!notes || notes.trim() === '')) {
      throw new Error(`resolutionNotes required when transitioning to terminal state: ${nextStatus}`)
    }

    const validTransitions: Record<DsarRequest['status'], DsarRequest['status'][]> = {
      submitted: ['in_review', 'rejected'],
      in_review: ['processing', 'rejected'],
      processing: ['fulfilled', 'rejected'],
      fulfilled: [],
      rejected: []
    }

    if (!validTransitions[currentStatus].includes(nextStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`)
    }

    const updatedRequest: DsarRequest = {
      ...request,
      status: nextStatus,
    }

    if (notes) {
      updatedRequest.resolutionNotes = notes
    }

    return this.storage.upsert(updatedRequest)
  }

  checkOverdueRequests(): DsarRequest[] {
    const now = new Date().toISOString()
    const activeRequests = this.storage.findAllActive()

    return activeRequests.filter(req => req.deadlineAt < now)
  }
}
