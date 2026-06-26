import { randomUUID } from 'node:crypto'
import { ValidationError } from '../order/service.js'

export type ReturnCondition = 'new' | 'damaged' | 'defective' | 'wrong_item'
export type DispositionDecision = 'restock' | 'rtv' | 'refurbish' | 'scrap'

export interface ReturnDispositionLog {
  id: string
  orderId: string
  sku: string
  condition: ReturnCondition
  reasonCode: string
  disposition: DispositionDecision
  inspectionNotes?: string
  inspectedBy: string
  claimOpened: boolean
  createdAt: string
}

export interface ReturnDispositionInput {
  orderId: string
  sku: string
  condition: ReturnCondition
  reasonCode: string
  inspectionNotes?: string
  inspectedBy: string
}

export interface ReturnDispositionStorage {
  insert(log: ReturnDispositionLog): void
  findById(id: string): ReturnDispositionLog | undefined
  findByOrderId(orderId: string): ReturnDispositionLog[]
}

export class ReturnDispositionService {
  constructor(private storage: ReturnDispositionStorage) {}

  processReturn(input: ReturnDispositionInput): ReturnDispositionLog {
    if (!input.orderId) throw new Error('orderId is required')
    if (!input.sku) throw new Error('sku is required')
    if (!input.condition) throw new Error('condition is required')
    if (!input.reasonCode) throw new Error('reasonCode is required')
    if (!input.inspectedBy) throw new Error('inspectedBy is required')

    let disposition: DispositionDecision
    let claimOpened = false

    switch (input.condition) {
      case 'new':
        disposition = 'restock'
        claimOpened = false
        break
      case 'defective':
        disposition = 'rtv'
        claimOpened = true
        break
      case 'damaged':
        disposition = 'scrap'
        claimOpened = true
        break
      case 'wrong_item':
        disposition = 'restock'
        claimOpened = false
        break
      default:
        throw new ValidationError('Invalid return condition', [`Unknown condition: ${input.condition}`])
    }

    const log: ReturnDispositionLog = {
      id: randomUUID(),
      orderId: input.orderId,
      sku: input.sku,
      condition: input.condition,
      reasonCode: input.reasonCode,
      disposition,
      inspectionNotes: input.inspectionNotes,
      inspectedBy: input.inspectedBy,
      claimOpened,
      createdAt: new Date().toISOString(),
    }

    this.storage.insert(log)
    return log
  }

  getDisposition(id: string): ReturnDispositionLog | undefined {
    return this.storage.findById(id)
  }

  findByOrderId(orderId: string): ReturnDispositionLog[] {
    return this.storage.findByOrderId(orderId)
  }
}
