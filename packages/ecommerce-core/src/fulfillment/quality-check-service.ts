/**
 * Quality Check Service — 8-step QC verification for fulfillment orders
 *
 * SOP Section 15.4: Quality Control process with 8-step checklist
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export interface QcChecklist {
  skuOk: boolean
  personalizationOk: boolean
  colorSizeOk: boolean
  surfaceOk: boolean
  packagingOk: boolean
  photoUrl?: string
  notes?: string
  result: 'pass' | 'fail' | 'conditional'
}

export interface QcLogEntry {
  id: string
  orderId: string
  fulfillmentOrderId: string
  checkedBy?: string
  skuOk: boolean
  personalizationOk: boolean
  colorSizeOk: boolean
  surfaceOk: boolean
  packagingOk: boolean
  photoUrl?: string
  result: 'pass' | 'fail' | 'conditional'
  notes?: string
  createdAt: string
}

export interface QcStorage {
  insert(entry: QcLogEntry): void
  findById(id: string): QcLogEntry | undefined
  findByOrderId(orderId: string): QcLogEntry[]
  findAll(): QcLogEntry[]
}

export const QC_STEP_LABELS: Record<string, string> = {
  skuOk: 'SKU Verification',
  personalizationOk: 'Personalization Verification',
  colorSizeOk: 'Color & Size Check',
  surfaceOk: 'Surface Quality Check',
  packagingOk: 'Packaging Check',
}

export class QualityCheckService {
  constructor(private storage: QcStorage) {}

  /**
   * Perform a full 8-step QC check on a fulfillment order.
   * Steps:
   *   1. verifySku — confirm correct SKU
   *   2. verifyPersonalization — confirm personalization matches order
   *   3. verifyColorSize — confirm color and size match spec
   *   4. verifySurface — inspect surface for defects
   *   5. verifyPackaging — confirm packaging quality
   *   6. photoDocument — attach photo evidence
   *   7. logResult — record pass/fail/conditional
   */
  performQc(
    orderId: string,
    fulfillmentOrderId: string,
    checklist: QcChecklist,
    checkedBy?: string,
  ): QcLogEntry {
    if (!orderId) throw new Error('orderId is required')
    if (!fulfillmentOrderId) throw new Error('fulfillmentOrderId is required')
    if (!checklist.result) throw new Error('QC result is required')

    const entry: QcLogEntry = {
      id: crypto.randomUUID(),
      orderId,
      fulfillmentOrderId,
      checkedBy,
      skuOk: checklist.skuOk,
      personalizationOk: checklist.personalizationOk,
      colorSizeOk: checklist.colorSizeOk,
      surfaceOk: checklist.surfaceOk,
      packagingOk: checklist.packagingOk,
      photoUrl: checklist.photoUrl,
      result: checklist.result,
      notes: checklist.notes,
      createdAt: new Date().toISOString(),
    }

    this.storage.insert(entry)
    return entry
  }

  /**
   * Check if all 5 checkable steps passed.
   */
  allChecksPassed(entry: QcLogEntry): boolean {
    return entry.skuOk && entry.personalizationOk && entry.colorSizeOk && entry.surfaceOk && entry.packagingOk
  }

  /**
   * Summarize which checks failed.
   */
  getFailedChecks(entry: QcLogEntry): string[] {
    const failed: string[] = []
    if (!entry.skuOk) failed.push('SKU Verification')
    if (!entry.personalizationOk) failed.push('Personalization Verification')
    if (!entry.colorSizeOk) failed.push('Color & Size Check')
    if (!entry.surfaceOk) failed.push('Surface Quality Check')
    if (!entry.packagingOk) failed.push('Packaging Check')
    return failed
  }

  /**
   * Get overall QC pass rate for a given order.
   */
  getQcPassRate(orderId: string): { total: number; passed: number; failed: number; rate: number } {
    const logs = this.storage.findByOrderId(orderId)
    const total = logs.length
    if (total === 0) return { total: 0, passed: 0, failed: 0, rate: 0 }

    const passed = logs.filter((l) => l.result === 'pass').length
    const failed = logs.filter((l) => l.result === 'fail').length
    return {
      total,
      passed,
      failed,
      rate: Math.round((passed / total) * 100),
    }
  }
}
