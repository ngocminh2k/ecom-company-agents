/**
 * Report Service — sales and product performance reporting.
 * Pure TypeScript business logic, no I/O or agent dependencies.
 */

export interface SalesReport {
  dateRange: { start: string; end: string }
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  topProducts: Array<{ productId: string; name: string; revenue: number; units: number }>
}

export interface ProductPerformance {
  productId: string
  name: string
  revenue: number
  unitsSold: number
  avgPrice: number
}

export interface DailySalesInput {
  orders: Array<{ total: number }>
  products: Array<{ productId: string; name: string; revenue: number; units: number }>
  dateRange: { start: string; end: string }
}

export class ReportService {
  /**
   * Generate a daily sales report from raw order and product data.
   */
  generateDailySalesReport(input: DailySalesInput): SalesReport {
    const totalRevenue = input.orders.reduce((sum, o) => sum + o.total, 0)
    const totalOrders = input.orders.length
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0

    const sorted = [...input.products].sort((a, b) => b.revenue - a.revenue)
    const topProducts = sorted.slice(0, 10).map((p) => ({
      productId: p.productId,
      name: p.name,
      revenue: p.revenue,
      units: p.units,
    }))

    return {
      dateRange: input.dateRange,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      topProducts,
    }
  }

  /**
   * Generate a product performance report.
   * Returns sorted list of products by revenue descending.
   */
  generateProductPerformanceReport(products: Array<{ productId: string; name: string; revenue: number; units: number }>): ProductPerformance[] {
    return [...products]
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        revenue: p.revenue,
        unitsSold: p.units,
        avgPrice: p.units > 0 ? Math.round((p.revenue / p.units) * 100) / 100 : 0,
      }))
  }
}
