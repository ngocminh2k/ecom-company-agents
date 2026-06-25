/**
 * Dashboard Service — Aggregate KPIs for company, channel, product, and ad dashboards.
 *
 * SOP Section 20: Data BI system with 4-tier dashboard hierarchy.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

export interface CompanyDashboard {
  totalRevenue: number
  totalOrders: number
  totalRefunds: number
  netRevenue: number
  totalAdSpend: number
  averageAov: number
  channelBreakdown: Record<string, ChannelSummary>
  alerts: string[]
  periodStart: string
  periodEnd: string
}

export interface ChannelSummary {
  revenue: number
  orders: number
  adSpend: number
  refunds: number
  netRevenue: number
  aov: number
  roas: number
}

export interface ChannelDashboard {
  channel: string
  revenue: number
  orders: number
  adSpend: number
  refunds: number
  netRevenue: number
  aov: number
  roas: number
  topProducts: ProductMetric[]
  alerts: string[]
  periodStart: string
  periodEnd: string
}

export interface ProductMetric {
  productId: string
  productName: string
  sku: string
  revenue: number
  orders: number
  unitsSold: number
  cogs: number
  adSpend: number
  refunds: number
  margin: number
}

export interface ProductDashboard {
  productId: string
  productName: string
  sku: string
  revenue: number
  orders: number
  unitsSold: number
  cogs: number
  adSpend: number
  refunds: number
  platformFees: number
  grossMargin: number
  contributionMargin: number
  aov: number
  cpa: number
  roas: number
  channelBreakdown: Record<string, { revenue: number; orders: number }>
}

export interface AdDashboard {
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalSales: number
  totalOrders: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  campaignBreakdown: AdCampaignMetric[]
  alerts: string[]
}

export interface AdCampaignMetric {
  campaignId: string
  campaignName: string
  channel: string
  spend: number
  impressions: number
  clicks: number
  sales: number
  orders: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
}

export interface DashboardDataSource {
  getTotalRevenue(start: string, end: string): Promise<number>
  getTotalOrders(start: string, end: string): Promise<number>
  getTotalRefunds(start: string, end: string): Promise<number>
  getTotalAdSpend(start: string, end: string): Promise<number>
  getRevenueByChannel(start: string, end: string): Promise<Array<{ channel: string; revenue: number; orders: number; adSpend: number; refunds: number }>>
  getTopProducts(channel: string, start: string, end: string, limit: number): Promise<ProductMetric[]>
  getProductMetrics(productId: string, start: string, end: string): Promise<ProductDashboard>
  getCampaignMetrics(start: string, end: string): Promise<AdCampaignMetric[]>
}

export class DashboardService {
  constructor(private dataSource: DashboardDataSource) {}

  async getCompanyDashboard(periodStart: string, periodEnd: string): Promise<CompanyDashboard> {
    const [totalRevenue, totalOrders, totalRefunds, totalAdSpend, channelData] = await Promise.all([
      this.dataSource.getTotalRevenue(periodStart, periodEnd),
      this.dataSource.getTotalOrders(periodStart, periodEnd),
      this.dataSource.getTotalRefunds(periodStart, periodEnd),
      this.dataSource.getTotalAdSpend(periodStart, periodEnd),
      this.dataSource.getRevenueByChannel(periodStart, periodEnd),
    ])

    const netRevenue = Math.round((totalRevenue - totalAdSpend - totalRefunds) * 100) / 100
    const averageAov = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0

    const channelBreakdown: Record<string, ChannelSummary> = {}
    const alerts: string[] = []

    for (const ch of channelData) {
      const net = Math.round((ch.revenue - ch.adSpend - ch.refunds) * 100) / 100
      const aov = ch.orders > 0 ? Math.round((ch.revenue / ch.orders) * 100) / 100 : 0
      const roas = ch.adSpend > 0 ? Math.round((ch.revenue / ch.adSpend) * 100) / 100 : 0

      channelBreakdown[ch.channel] = {
        revenue: ch.revenue,
        orders: ch.orders,
        adSpend: ch.adSpend,
        refunds: ch.refunds,
        netRevenue: net,
        aov,
        roas,
      }

      if (net < 0) {
        alerts.push(`[${ch.channel}] Net revenue negative ($${net.toFixed(2)}). Immediate review required.`)
      }
    }

    if (totalRevenue > 0 && totalAdSpend / totalRevenue > 0.5) {
      alerts.push(`Total ad spend to revenue ratio is ${((totalAdSpend / totalRevenue) * 100).toFixed(1)}%. Above 50% threshold.`)
    }

    return {
      totalRevenue,
      totalOrders,
      totalRefunds,
      netRevenue,
      totalAdSpend,
      averageAov,
      channelBreakdown,
      alerts,
      periodStart,
      periodEnd,
    }
  }

  async getChannelDashboard(channel: string, periodStart: string, periodEnd: string): Promise<ChannelDashboard> {
    const [channelData, topProducts] = await Promise.all([
      this.dataSource.getRevenueByChannel(periodStart, periodEnd),
      this.dataSource.getTopProducts(channel, periodStart, periodEnd, 10),
    ])

    const ch = channelData.find((c) => c.channel === channel)
    const revenue = ch?.revenue ?? 0
    const orders = ch?.orders ?? 0
    const adSpend = ch?.adSpend ?? 0
    const refunds = ch?.refunds ?? 0
    const netRevenue = Math.round((revenue - adSpend - refunds) * 100) / 100
    const aov = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0
    const roas = adSpend > 0 ? Math.round((revenue / adSpend) * 100) / 100 : 0

    const alerts: string[] = []
    if (netRevenue < 0) alerts.push(`Net revenue negative ($${netRevenue.toFixed(2)})`)
    if (adSpend > 0 && roas < 1) alerts.push(`ROAS below 1.0 — ad spend not breaking even on ${channel}`)

    return {
      channel,
      revenue,
      orders,
      adSpend,
      refunds,
      netRevenue,
      aov,
      roas,
      topProducts,
      alerts,
      periodStart,
      periodEnd,
    }
  }

  async getProductDashboard(productId: string, periodStart: string, periodEnd: string): Promise<ProductDashboard> {
    return this.dataSource.getProductMetrics(productId, periodStart, periodEnd)
  }

  async getAdDashboard(periodStart: string, periodEnd: string): Promise<AdDashboard> {
    const campaigns = await this.dataSource.getCampaignMetrics(periodStart, periodEnd)

    let totalSpend = 0
    let totalImpressions = 0
    let totalClicks = 0
    let totalSales = 0
    let totalOrders = 0

    for (const c of campaigns) {
      totalSpend += c.spend
      totalImpressions += c.impressions
      totalClicks += c.clicks
      totalSales += c.sales
      totalOrders += c.orders
    }

    const ctr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
    const cpc = totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0
    const cpa = totalOrders > 0 ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0
    const roas = totalSpend > 0 ? Math.round((totalSales / totalSpend) * 100) / 100 : 0

    const alerts: string[] = []
    if (roas < 1) alerts.push(`Overall ROAS ${roas.toFixed(2)} — ad spend exceeding revenue`)
    if (cpa > 30) alerts.push(`Average CPA $${cpa.toFixed(2)} exceeds $30 threshold`)

    return {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalSales,
      totalOrders,
      ctr,
      cpc,
      cpa,
      roas,
      campaignBreakdown: campaigns,
      alerts,
    }
  }
}
