export type ReconciliationMatchStatus = 
  | 'matched' 
  | 'unmatched_missing_psp' 
  | 'unmatched_missing_wms' 
  | 'unmatched_revenue_mismatch' 
  | 'unmatched_fee_mismatch'
  | 'unmatched_orphan_psp'
  | 'unmatched_orphan_wms';

export interface OMSOrderRecord {
  orderId: string;
  expectedRevenue: number;
  expectedCarrierFee: number;
  paymentMethod: 'COD' | 'Prepaid';
}

export interface PSPBankRecord {
  orderId: string;
  settledAmount: number;
  settledAt: string;
}

export interface WMSCarrierRecord {
  orderId: string;
  actualCarrierFee: number;
  deliveredAt: string;
}

export interface OrderReconciliationResult {
  orderId: string;
  status: ReconciliationMatchStatus;
  revenueDiscrepancy: number; // expectedRevenue - settledAmount (0 if matched)
  feeDiscrepancy: number; // expectedCarrierFee - actualCarrierFee (0 if matched)
  reconciledAt: string;
}

const EPSILON = 0.001;

export class ThreeWayReconciliationService {
  /**
   * Performs a 3-way reconciliation for a batch of orders.
   * Compares the source of truth (OMS) against actual cash collected (PSP/Bank)
   * and actual shipping costs incurred (WMS/Carrier).
   * 
   * Validation Rules:
   * 1. If an order in OMS has no corresponding PSP record -> 'unmatched_missing_psp'
   * 2. If an order in OMS has no corresponding WMS record -> 'unmatched_missing_wms'
   * 3. If expectedRevenue != settledAmount -> 'unmatched_revenue_mismatch'
   * 4. If expectedCarrierFee != actualCarrierFee -> 'unmatched_fee_mismatch'
   * 5. If PSP has a record but OMS doesn't -> 'unmatched_orphan_psp'
   * 6. If WMS has a record but OMS doesn't -> 'unmatched_orphan_wms'
   * 7. Otherwise -> 'matched'
   */
  reconcileOrders(
    omsRecords: OMSOrderRecord[],
    pspRecords: PSPBankRecord[],
    wmsRecords: WMSCarrierRecord[],
    reconciledAt: string = new Date().toISOString()
  ): OrderReconciliationResult[] {
    const pspMap = new Map<string, PSPBankRecord>(pspRecords.map(r => [r.orderId, r]));
    const wmsMap = new Map<string, WMSCarrierRecord>(wmsRecords.map(r => [r.orderId, r]));
    const omsMap = new Set<string>(omsRecords.map(r => r.orderId));

    const results: OrderReconciliationResult[] = omsRecords.map(oms => {
      const psp = pspMap.get(oms.orderId);
      const wms = wmsMap.get(oms.orderId);

      if (!psp) {
        return {
          orderId: oms.orderId,
          status: 'unmatched_missing_psp',
          revenueDiscrepancy: oms.expectedRevenue,
          feeDiscrepancy: oms.expectedCarrierFee - (wms?.actualCarrierFee ?? 0),
          reconciledAt
        };
      }

      if (!wms) {
        return {
          orderId: oms.orderId,
          status: 'unmatched_missing_wms',
          revenueDiscrepancy: Math.abs(oms.expectedRevenue - psp.settledAmount) > EPSILON 
            ? (oms.expectedRevenue - psp.settledAmount) 
            : 0,
          feeDiscrepancy: oms.expectedCarrierFee,
          reconciledAt
        };
      }

      // We use a small epsilon for floating point comparison to be safe
      const revenueDiff = oms.expectedRevenue - psp.settledAmount;
      const feeDiff = oms.expectedCarrierFee - wms.actualCarrierFee;
      
      const hasRevenueMismatch = Math.abs(revenueDiff) > EPSILON;
      const hasFeeMismatch = Math.abs(feeDiff) > EPSILON;

      let status: ReconciliationMatchStatus = 'matched';
      if (hasRevenueMismatch) {
        status = 'unmatched_revenue_mismatch';
      } else if (hasFeeMismatch) {
        status = 'unmatched_fee_mismatch';
      }

      return {
        orderId: oms.orderId,
        status,
        revenueDiscrepancy: hasRevenueMismatch ? revenueDiff : 0,
        feeDiscrepancy: hasFeeMismatch ? feeDiff : 0,
        reconciledAt
      };
    });

    for (const psp of pspRecords) {
      if (!omsMap.has(psp.orderId)) {
        results.push({
          orderId: psp.orderId,
          status: 'unmatched_orphan_psp',
          revenueDiscrepancy: -psp.settledAmount,
          feeDiscrepancy: 0,
          reconciledAt
        });
      }
    }

    for (const wms of wmsRecords) {
      if (!omsMap.has(wms.orderId)) {
        results.push({
          orderId: wms.orderId,
          status: 'unmatched_orphan_wms',
          revenueDiscrepancy: 0,
          feeDiscrepancy: -wms.actualCarrierFee,
          reconciledAt
        });
      }
    }

    return results;
  }
}
