```typescript
/**
 * EInvoiceService — SOP Section: Finance, Accounting & Tax
 * 
 * Purpose: Generates E-Invoices (Hóa đơn điện tử) according to configured rules 
 * in compliance with Nghị định 123/2020/NĐ-CP and Thông tư 78/2021/TT-BTC.
 * Evaluates orders, applies VAT rates, and constructs the structured e-invoice data.
 */

export interface TaxConfiguration {
  defaultVatRate: number // e.g., 0.08 (8%) or 0.10 (10%)
  applyVatToShipping: boolean
}

export interface EInvoiceItem {
  sku: string
  name: string
  quantity: number
  unitPriceBeforeVat: number
  vatRate: number
  vatAmount: number
  totalAmount: number
}

export interface EInvoice {
  id: string
  orderId: string
  channel: string
  issuedDate: string
  buyerName: string
  buyerTaxCode?: string
  buyerEmail?: string
  items: EInvoiceItem[]
  totalBeforeVat: number
  totalVatAmount: number
  totalAmount: number
  status: 'draft' | 'pending_issuance' | 'issued' | 'error' | 'canceled'
}

export interface EInvoiceStorage {
  save(invoice: EInvoice): EInvoice
  findByOrderId(orderId: string): EInvoice | undefined
  updateStatus(id: string, status: EInvoice['status']): EInvoice | undefined
}

export class EInvoiceService {
  constructor(
    private storage: EInvoiceStorage,
    private config: TaxConfiguration = { defaultVatRate: 0.10, applyVatToShipping: true }
  ) {}

  /**
   * Generates a draft E-Invoice for a completed order.
   * Implements strict immutability and idempotency (returns existing if already created).
   * Calculates VAT based on current configured rates.
   */
  generateForOrder(
    orderId: string, 
    channel: string, 
    items: { sku: string; name: string; quantity: number; unitPrice: number }[],
    shippingCost: number,
    buyer: { name: string; taxCode?: string; email?: string }
  ): EInvoice {
    // 1. Check if invoice already exists for orderId (Idempotent)
    // 2. Map items, calculate unitPriceBeforeVat and vatAmount per item
    // 3. Add shipping cost as an item if applyVatToShipping is true
    // 4. Calculate total amounts (totalBeforeVat, totalVatAmount, totalAmount)
    // 5. Return new EInvoice object in 'draft' status and save to storage
    throw new Error('Not implemented')
  }

  /**
   * Batch evaluates sales ledgers/orders and generates pending e-invoices.
   * Implements "phát hành hóa đơn điện tử theo rule đã cấu hình" from SOP.
   */
  batchGenerateDailyInvoices(orders: any[]): EInvoice[] {
    throw new Error('Not implemented')
  }
}
```
