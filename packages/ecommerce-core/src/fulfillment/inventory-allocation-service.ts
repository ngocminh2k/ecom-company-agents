export interface InventoryRecord {
  sku: string
  available: number
  reserved: number
  damaged: number
  updatedAt: string
}

export type ReservationResult =
  | { success: true; sku: string; reservedQuantity: number }
  | { success: false; reason: 'insufficient_stock'; available: number }

export interface InventoryStorage {
  findBySku(sku: string): InventoryRecord | undefined
  upsert(record: InventoryRecord): void
}

export class InventoryAllocationService {
  constructor(private readonly storage: InventoryStorage) {}

  reserveStock(sku: string, quantity: number, orderId: string): ReservationResult {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    const record = this.storage.findBySku(sku)

    if (!record) {
      return { success: false, reason: 'insufficient_stock', available: 0 }
    }

    if (record.available < quantity) {
      return { success: false, reason: 'insufficient_stock', available: record.available }
    }

    const updatedRecord: InventoryRecord = {
      ...record,
      available: record.available - quantity,
      reserved: record.reserved + quantity,
      updatedAt: new Date().toISOString()
    }

    this.storage.upsert(updatedRecord)

    return { success: true, sku, reservedQuantity: quantity }
  }

  releaseStock(sku: string, quantity: number, orderId: string): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    const record = this.storage.findBySku(sku)
    if (!record) {
      throw new Error(`Cannot release stock for unknown SKU: ${sku}`)
    }

    if (record.reserved < quantity) {
      throw new Error(`Cannot release ${quantity} stock: only ${record.reserved} reserved for ${sku}`)
    }

    const updatedRecord: InventoryRecord = {
      ...record,
      available: record.available + quantity,
      reserved: record.reserved - quantity,
      updatedAt: new Date().toISOString()
    }

    this.storage.upsert(updatedRecord)
  }

  deductShippedStock(sku: string, quantity: number, orderId: string): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    const record = this.storage.findBySku(sku)
    if (!record) {
      throw new Error(`Cannot deduct shipped stock for unknown SKU: ${sku}`)
    }

    if (record.reserved < quantity) {
      throw new Error(`Cannot deduct ${quantity} shipped stock: only ${record.reserved} reserved for ${sku}`)
    }

    const updatedRecord: InventoryRecord = {
      ...record,
      reserved: record.reserved - quantity,
      updatedAt: new Date().toISOString()
    }

    this.storage.upsert(updatedRecord)
  }

  adjustStock(sku: string, quantity: number, type: 'available' | 'damaged', reasonCode: string): void {
    const record = this.storage.findBySku(sku)

    // If it doesn't exist and we're adding stock, we create it.
    // Wait, the interface says adjust, we should handle negative and positive.
    const currentRecord: InventoryRecord = record ?? {
      sku,
      available: 0,
      reserved: 0,
      damaged: 0,
      updatedAt: new Date().toISOString()
    }

    let updatedRecord = { ...currentRecord, updatedAt: new Date().toISOString() }

    if (type === 'available') {
      updatedRecord.available += quantity
      if (updatedRecord.available < 0) {
        throw new Error(`Cannot adjust stock below 0 for SKU: ${sku}`)
      }
    } else if (type === 'damaged') {
      updatedRecord.damaged += quantity
      if (updatedRecord.damaged < 0) {
        throw new Error(`Cannot adjust damaged stock below 0 for SKU: ${sku}`)
      }
    }

    this.storage.upsert(updatedRecord)
  }
}
