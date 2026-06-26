import { describe, it, expect } from 'vitest'
import {
  FinanceReconciliationService,
  RevenueTransaction,
  CostTransaction,
  AdSpend
} from './reconciliation-service.js'

describe('FinanceReconciliationService', () => {
  it('computes true SKU-level margin across multi-channel inputs', () => {
    // Arrange
    const revenues: RevenueTransaction[] = [
      {
        id: 'r1',
        channel: 'Shopify',
        sku: 'TSHIRT-BLK-M',
        quantity: 2,
        grossRevenue: 50.00, // $25 each
        platformFee: 1.50, // 3%
        paymentProcessingFee: 1.50, // 3%
        date: '2026-06-26'
      },
      {
        id: 'r2',
        channel: 'Etsy',
        sku: 'TSHIRT-BLK-M',
        quantity: 1,
        grossRevenue: 30.00, // $30 each
        platformFee: 2.00, // Etsy fees
        paymentProcessingFee: 1.00,
        date: '2026-06-26'
      }
    ]

    const costs: CostTransaction[] = [
      {
        id: 'c1',
        sku: 'TSHIRT-BLK-M',
        quantity: 2,
        cogs: 20.00, // $10 each
        shippingCost: 8.00, // $4 each
        vendor: 'Printify',
        date: '2026-06-26'
      },
      {
        id: 'c2',
        sku: 'TSHIRT-BLK-M',
        quantity: 1,
        cogs: 10.00, // $10 each
        shippingCost: 4.00, // $4 each
        vendor: 'Printify',
        date: '2026-06-26'
      }
    ]

    const ads: AdSpend[] = [
      {
        id: 'a1',
        channel: 'Meta Ads',
        campaignId: 'camp_1',
        sku: 'TSHIRT-BLK-M',
        spend: 15.00,
        date: '2026-06-26'
      }
    ]

    const refunds = [
      {
        id: 'rf1',
        sku: 'TSHIRT-BLK-M',
        amount: 5.00,
        date: '2026-06-26'
      }
    ]

    const service = new FinanceReconciliationService()

    // Act
    const reports = service.computeSKUMargin(revenues, costs, ads, refunds)

    // Assert
    expect(reports).toHaveLength(1)

    const report = reports[0]
    expect(report.sku).toBe('TSHIRT-BLK-M')
    expect(report.unitsSold).toBe(3)

    expect(report.grossRevenue).toBe(80.00)
    expect(report.platformFees).toBe(3.50)
    expect(report.paymentProcessingFees).toBe(2.50)
    expect(report.cogs).toBe(30.00)
    expect(report.shippingCost).toBe(12.00)
    expect(report.adSpend).toBe(15.00)
    expect(report.refundsAndRemakes).toBe(5.00)

    // Net Margin = 80 - 3.50 - 2.50 - 30 - 12 - 15 - 5 = 12.00
    expect(report.netMargin).toBe(12.00)

    // Margin Percentage = (12.00 / 80) * 100 = 15%
    expect(report.marginPercentage).toBe(15.00)
  })

  it('handles scenarios with no units sold but ad spend occurred', () => {
    // Arrange
    const ads: AdSpend[] = [
      {
        id: 'a1',
        channel: 'Meta Ads',
        campaignId: 'camp_2',
        sku: 'HOODIE-WHT-L',
        spend: 25.00,
        date: '2026-06-26'
      }
    ]

    const service = new FinanceReconciliationService()

    // Act
    const reports = service.computeSKUMargin([], [], ads)

    // Assert
    expect(reports).toHaveLength(1)
    const report = reports[0]
    expect(report.sku).toBe('HOODIE-WHT-L')
    expect(report.unitsSold).toBe(0)
    expect(report.grossRevenue).toBe(0)
    expect(report.netMargin).toBe(-25.00)
    expect(report.marginPercentage).toBe(0)
  })
})
