import { describe, it, expect } from 'vitest'
import { ReportService } from './report-service.js'

describe('ReportService', () => {
  const service = new ReportService()

  describe('generateDailySalesReport', () => {
    it('generates a sales report with totals and top products', () => {
      const report = service.generateDailySalesReport({
        orders: [
          { total: 100 },
          { total: 50 },
          { total: 75 },
        ],
        products: [
          { productId: 'p1', name: 'T-Shirt', revenue: 200, units: 10 },
          { productId: 'p2', name: 'Mug', revenue: 150, units: 30 },
          { productId: 'p3', name: 'Hoodie', revenue: 300, units: 5 },
        ],
        dateRange: { start: '2026-06-01', end: '2026-06-30' },
      })

      expect(report.dateRange).toEqual({ start: '2026-06-01', end: '2026-06-30' })
      expect(report.totalRevenue).toBe(225)
      expect(report.totalOrders).toBe(3)
      expect(report.avgOrderValue).toBe(75)
      expect(report.topProducts).toHaveLength(3)
      expect(report.topProducts[0].productId).toBe('p3') // highest revenue
      expect(report.topProducts[0].revenue).toBe(300)
    })

    it('returns zero avgOrderValue when no orders', () => {
      const report = service.generateDailySalesReport({
        orders: [],
        products: [],
        dateRange: { start: '2026-06-01', end: '2026-06-01' },
      })

      expect(report.totalRevenue).toBe(0)
      expect(report.totalOrders).toBe(0)
      expect(report.avgOrderValue).toBe(0)
      expect(report.topProducts).toHaveLength(0)
    })

    it('limits top products to 10', () => {
      const products = Array.from({ length: 15 }, (_, i) => ({
        productId: `p${i}`,
        name: `Product ${i}`,
        revenue: 100 - i,
        units: 10,
      }))

      const report = service.generateDailySalesReport({
        orders: [{ total: 100 }],
        products,
        dateRange: { start: '2026-06-01', end: '2026-06-01' },
      })

      expect(report.topProducts).toHaveLength(10)
    })
  })

  describe('generateProductPerformanceReport', () => {
    it('returns products sorted by revenue descending', () => {
      const result = service.generateProductPerformanceReport([
        { productId: 'p1', name: 'A', revenue: 100, units: 10 },
        { productId: 'p2', name: 'B', revenue: 300, units: 5 },
        { productId: 'p3', name: 'C', revenue: 200, units: 20 },
      ])

      expect(result).toHaveLength(3)
      expect(result[0].productId).toBe('p2') // highest revenue
      expect(result[1].productId).toBe('p3')
      expect(result[2].productId).toBe('p1')
      expect(result[0].avgPrice).toBe(60) // 300/5
    })

    it('returns empty array for empty input', () => {
      expect(service.generateProductPerformanceReport([])).toHaveLength(0)
    })

    it('handles zero units gracefully', () => {
      const result = service.generateProductPerformanceReport([
        { productId: 'p1', name: 'A', revenue: 0, units: 0 },
      ])

      expect(result[0].avgPrice).toBe(0)
    })
  })
})
