import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ThreeWayReconciliationService, 
  OMSOrderRecord, 
  PSPBankRecord, 
  WMSCarrierRecord 
} from './three-way-reconciliation-service';

describe('ThreeWayReconciliationService', () => {
  let service: ThreeWayReconciliationService;

  beforeEach(() => {
    service = new ThreeWayReconciliationService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return matched status when everything aligns perfectly', () => {
    const oms: OMSOrderRecord[] = [{ orderId: 'ORD-1', expectedRevenue: 100.5, expectedCarrierFee: 15.0, paymentMethod: 'Prepaid' }];
    const psp: PSPBankRecord[] = [{ orderId: 'ORD-1', settledAmount: 100.5, settledAt: '2026-06-25T10:00:00Z' }];
    const wms: WMSCarrierRecord[] = [{ orderId: 'ORD-1', actualCarrierFee: 15.0, deliveredAt: '2026-06-26T09:00:00Z' }];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      orderId: 'ORD-1',
      status: 'matched',
      revenueDiscrepancy: 0,
      feeDiscrepancy: 0,
      reconciledAt: '2026-06-26T12:00:00.000Z'
    });
  });

  it('should flag unmatched_missing_psp when psp record is missing', () => {
    const oms: OMSOrderRecord[] = [{ orderId: 'ORD-2', expectedRevenue: 50.0, expectedCarrierFee: 5.0, paymentMethod: 'COD' }];
    const psp: PSPBankRecord[] = [];
    const wms: WMSCarrierRecord[] = [{ orderId: 'ORD-2', actualCarrierFee: 5.0, deliveredAt: '2026-06-26T09:00:00Z' }];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      orderId: 'ORD-2',
      status: 'unmatched_missing_psp',
      revenueDiscrepancy: 50.0,
      feeDiscrepancy: 0,
      reconciledAt: '2026-06-26T12:00:00.000Z'
    });
  });

  it('should flag unmatched_missing_wms when wms record is missing', () => {
    const oms: OMSOrderRecord[] = [{ orderId: 'ORD-3', expectedRevenue: 75.0, expectedCarrierFee: 10.0, paymentMethod: 'Prepaid' }];
    const psp: PSPBankRecord[] = [{ orderId: 'ORD-3', settledAmount: 75.0, settledAt: '2026-06-25T10:00:00Z' }];
    const wms: WMSCarrierRecord[] = [];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      orderId: 'ORD-3',
      status: 'unmatched_missing_wms',
      revenueDiscrepancy: 0,
      feeDiscrepancy: 10.0,
      reconciledAt: '2026-06-26T12:00:00.000Z'
    });
  });

  it('should flag unmatched_revenue_mismatch when settled amount differs', () => {
    const oms: OMSOrderRecord[] = [{ orderId: 'ORD-4', expectedRevenue: 100.0, expectedCarrierFee: 15.0, paymentMethod: 'Prepaid' }];
    const psp: PSPBankRecord[] = [{ orderId: 'ORD-4', settledAmount: 95.0, settledAt: '2026-06-25T10:00:00Z' }];
    const wms: WMSCarrierRecord[] = [{ orderId: 'ORD-4', actualCarrierFee: 15.0, deliveredAt: '2026-06-26T09:00:00Z' }];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      orderId: 'ORD-4',
      status: 'unmatched_revenue_mismatch',
      revenueDiscrepancy: 5.0,
      feeDiscrepancy: 0,
      reconciledAt: '2026-06-26T12:00:00.000Z'
    });
  });

  it('should flag unmatched_fee_mismatch when carrier fee differs', () => {
    const oms: OMSOrderRecord[] = [{ orderId: 'ORD-5', expectedRevenue: 100.0, expectedCarrierFee: 15.0, paymentMethod: 'Prepaid' }];
    const psp: PSPBankRecord[] = [{ orderId: 'ORD-5', settledAmount: 100.0, settledAt: '2026-06-25T10:00:00Z' }];
    const wms: WMSCarrierRecord[] = [{ orderId: 'ORD-5', actualCarrierFee: 20.0, deliveredAt: '2026-06-26T09:00:00Z' }];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      orderId: 'ORD-5',
      status: 'unmatched_fee_mismatch',
      revenueDiscrepancy: 0,
      feeDiscrepancy: -5.0,
      reconciledAt: '2026-06-26T12:00:00.000Z'
    });
  });

  it('should prioritize revenue mismatch over fee mismatch if both exist', () => {
    const oms: OMSOrderRecord[] = [{ orderId: 'ORD-6', expectedRevenue: 100.0, expectedCarrierFee: 15.0, paymentMethod: 'Prepaid' }];
    const psp: PSPBankRecord[] = [{ orderId: 'ORD-6', settledAmount: 95.0, settledAt: '2026-06-25T10:00:00Z' }];
    const wms: WMSCarrierRecord[] = [{ orderId: 'ORD-6', actualCarrierFee: 20.0, deliveredAt: '2026-06-26T09:00:00Z' }];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('unmatched_revenue_mismatch');
    expect(result[0].revenueDiscrepancy).toBe(5.0);
    expect(result[0].feeDiscrepancy).toBe(-5.0);
  });
  
  it('should process multiple orders correctly', () => {
    const oms: OMSOrderRecord[] = [
      { orderId: 'ORD-1', expectedRevenue: 100.0, expectedCarrierFee: 10.0, paymentMethod: 'Prepaid' },
      { orderId: 'ORD-2', expectedRevenue: 50.0, expectedCarrierFee: 5.0, paymentMethod: 'COD' }
    ];
    const psp: PSPBankRecord[] = [
      { orderId: 'ORD-1', settledAmount: 100.0, settledAt: '2026-06-25' }
    ];
    const wms: WMSCarrierRecord[] = [
      { orderId: 'ORD-1', actualCarrierFee: 10.0, deliveredAt: '2026-06-26' },
      { orderId: 'ORD-2', actualCarrierFee: 5.0, deliveredAt: '2026-06-26' }
    ];

    const result = service.reconcileOrders(oms, psp, wms);

    expect(result).toHaveLength(2);
    expect(result.find(r => r.orderId === 'ORD-1')?.status).toBe('matched');
    expect(result.find(r => r.orderId === 'ORD-2')?.status).toBe('unmatched_missing_psp');
  });
});
