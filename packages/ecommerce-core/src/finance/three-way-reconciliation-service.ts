export type ReconciliationMatchStatus = 
  | 'matched' 
  | 'unmatched_missing_psp' 
  | 'unmatched_missing_wms' 
  | 'unmatched_revenue_mismatch' 
  | 'unmatched_fee_mismatch';

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
   * 5. Otherwise -> 'matched'
   */
  reconcileOrders(
    omsRecords: OMSOrderRecord[],
    pspRecords: PSPBankRecord[],
    wmsRecords: WMSCarrierRecord[]
  ): OrderReconciliationResult[] {
    const pspMap = new Map<string, PSPBankRecord>(pspRecords.map(r => [r.orderId, r]));
    const wmsMap = new Map<string, WMSCarrierRecord>(wmsRecords.map(r => [r.orderId, r]));
    const reconciledAt = new Date().toISOString();

    return omsRecords.map(oms => {
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
          revenueDiscrepancy: Math.abs(oms.expectedRevenue - psp.settledAmount) > 0.001 
            ? (oms.expectedRevenue - psp.settledAmount) 
            : 0,
          feeDiscrepancy: oms.expectedCarrierFee,
          reconciledAt
        };
      }

      // We use a small epsilon for floating point comparison to be safe
      const revenueDiff = oms.expectedRevenue - psp.settledAmount;
      const feeDiff = oms.expectedCarrierFee - wms.actualCarrierFee;
      
      const hasRevenueMismatch = Math.abs(revenueDiff) > 0.001;
      const hasFeeMismatch = Math.abs(feeDiff) > 0.001;

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
  }
}
