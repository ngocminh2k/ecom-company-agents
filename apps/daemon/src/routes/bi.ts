/**
 * BI Routes — Dashboards, logs, and SLA monitoring.
 *
 * Phase 10: Dashboard + BI (SOP Section 20).
 */
import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import {
  DashboardService,
  type DashboardDataSource,
  type CompanyDashboard,
  type ChannelDashboard,
  type ProductDashboard,
  type AdDashboard,
  type ProductMetric,
  type AdCampaignMetric,
  BiLogsService,
  type ListingLogStorage,
  type ListingLog,
  type ChannelLaunchLogStorage,
  type ChannelLaunchLog,
  type OrderIssueLogStorage,
  type OrderIssueLog,
  type AdTestLogStorage,
  type AdTestLog,
  type CreativeBriefStorage,
  type CreativeBrief,
  type IncidentLogStorage,
  type IncidentLog,
  type IpCheckLogStorage,
  type IpCheckLog,
  SlaMonitorService,
  type SlaStorage,
  type SlaEvent,
} from '@ngocminh2k/ecommerce-core'

export const biRouter: RouterType = Router()

// ─── Dashboard Data Source ────────────────────────────────────────────────────────

const dashboardDataSource: DashboardDataSource = {
  async getTotalRevenue(start: string, end: string): Promise<number> {
    const db = getDb()
    const row = db.prepare(
      'SELECT COALESCE(SUM(revenue), 0) as total FROM daily_reconciliation WHERE date >= ? AND date <= ?'
    ).get(start, end) as any
    return row.total
  },
  async getTotalOrders(start: string, end: string): Promise<number> {
    const db = getDb()
    const row = db.prepare(
      'SELECT COALESCE(SUM(orders_count), 0) as total FROM daily_reconciliation WHERE date >= ? AND date <= ?'
    ).get(start, end) as any
    return row.total
  },
  async getTotalRefunds(start: string, end: string): Promise<number> {
    const db = getDb()
    const row = db.prepare(
      'SELECT COALESCE(SUM(refunds), 0) as total FROM daily_reconciliation WHERE date >= ? AND date <= ?'
    ).get(start, end) as any
    return row.total
  },
  async getTotalAdSpend(start: string, end: string): Promise<number> {
    const db = getDb()
    const row = db.prepare(
      'SELECT COALESCE(SUM(ad_spend), 0) as total FROM daily_reconciliation WHERE date >= ? AND date <= ?'
    ).get(start, end) as any
    return row.total
  },
  async getRevenueByChannel(start: string, end: string): Promise<Array<{ channel: string; revenue: number; orders: number; adSpend: number; refunds: number }>> {
    const db = getDb()
    const rows = db.prepare(`
      SELECT channel,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(orders_count), 0) as orders,
        COALESCE(SUM(ad_spend), 0) as ad_spend,
        COALESCE(SUM(refunds), 0) as refunds
      FROM daily_reconciliation
      WHERE date >= ? AND date <= ?
      GROUP BY channel
      ORDER BY revenue DESC
    `).all(start, end) as any[]
    return rows.map((r: any) => ({
      channel: r.channel,
      revenue: r.revenue,
      orders: r.orders,
      adSpend: r.ad_spend,
      refunds: r.refunds,
    }))
  },
  async getTopProducts(channel: string, start: string, end: string, limit: number): Promise<ProductMetric[]> {
    const db = getDb()
    const rows = db.prepare(`
      SELECT p.id as product_id, p.name as product_name, p.sku,
        COALESCE(SUM(o.total), 0) as revenue,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.quantity), 0) as units_sold,
        COALESCE(SUM(o.unit_price * o.quantity), 0) as cogs
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.created_at >= ? AND o.created_at <= ?
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT ?
    `).all(start, end, limit) as any[]
    return rows.map((r: any) => ({
      productId: r.product_id,
      productName: r.product_name,
      sku: r.sku ?? '',
      revenue: r.revenue,
      orders: r.orders,
      unitsSold: r.units_sold,
      cogs: r.cogs,
      adSpend: 0,
      refunds: 0,
      margin: r.revenue > 0 ? Math.round(((r.revenue - r.cogs) / r.revenue) * 10000) / 100 : 0,
    }))
  },
  async getProductMetrics(productId: string, start: string, end: string): Promise<ProductDashboard> {
    const db = getDb()
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any
    const orders = db.prepare(
      'SELECT * FROM orders WHERE product_id = ? AND created_at >= ? AND created_at <= ?'
    ).all(productId, start, end) as any[]

    const revenue = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0)
    const unitsSold = orders.reduce((s: number, o: any) => s + (o.quantity ?? 0), 0)

    return {
      productId,
      productName: product?.name ?? 'Unknown',
      sku: product?.sku ?? '',
      revenue,
      orders: orders.length,
      unitsSold,
      cogs: product?.cost ?? 0,
      adSpend: 0,
      refunds: 0,
      platformFees: 0,
      grossMargin: revenue > 0 ? Math.round(((revenue - (product?.cost ?? 0)) / revenue) * 10000) / 100 : 0,
      contributionMargin: revenue > 0 ? Math.round(((revenue - (product?.cost ?? 0)) / revenue) * 10000) / 100 : 0,
      aov: orders.length > 0 ? Math.round((revenue / orders.length) * 100) / 100 : 0,
      cpa: 0,
      roas: 0,
      channelBreakdown: {},
    }
  },
  async getCampaignMetrics(start: string, end: string): Promise<AdCampaignMetric[]> {
    return []
  },
}

// ─── Log Storage Adapters ─────────────────────────────────────────────────────────

function createListingLogStorage(): ListingLogStorage {
  return {
    findAll(): ListingLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM listing_logs ORDER BY created_at DESC').all() as any[]).map(rowToListingLog)
    },
    findByProductId(productId: string): ListingLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM listing_logs WHERE product_id = ? ORDER BY created_at DESC').all(productId) as any[]).map(rowToListingLog)
    },
    findById(id: string): ListingLog | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM listing_logs WHERE id = ?').get(id) as any
      return row ? rowToListingLog(row) : undefined
    },
    insert(log: ListingLog): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO listing_logs (id, product_id, channel, listing_url, title, published_at, status, optimization_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(log.id, log.productId, log.channel, log.listingUrl, log.title, log.publishedAt, log.status, log.optimizationNotes, log.createdAt, log.updatedAt)
    },
    update(id: string, updates: Partial<ListingLog>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.optimizationNotes !== undefined) { fields.push('optimization_notes = ?'); values.push(updates.optimizationNotes) }
      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title) }
      if (updates.listingUrl !== undefined) { fields.push('listing_url = ?'); values.push(updates.listingUrl) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE listing_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToListingLog(row: any): ListingLog {
  return {
    id: row.id, productId: row.product_id, channel: row.channel, listingUrl: row.listing_url,
    title: row.title, publishedAt: row.published_at, status: row.status,
    optimizationNotes: row.optimization_notes ?? '', createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

function createChannelLaunchLogStorage(): ChannelLaunchLogStorage {
  return {
    findAll(): ChannelLaunchLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM channel_launch_logs ORDER BY created_at DESC').all() as any[]).map(rowToChannelLaunchLog)
    },
    findByProductId(productId: string): ChannelLaunchLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM channel_launch_logs WHERE product_id = ? ORDER BY created_at DESC').all(productId) as any[]).map(rowToChannelLaunchLog)
    },
    findById(id: string): ChannelLaunchLog | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM channel_launch_logs WHERE id = ?').get(id) as any
      return row ? rowToChannelLaunchLog(row) : undefined
    },
    insert(log: ChannelLaunchLog): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO channel_launch_logs (id, product_id, channel, launched_at, owner, checklist_complete, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(log.id, log.productId, log.channel, log.launchedAt, log.owner, log.checklistComplete ? 1 : 0, log.notes, log.createdAt)
    },
    update(id: string, updates: Partial<ChannelLaunchLog>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.owner !== undefined) { fields.push('owner = ?'); values.push(updates.owner) }
      if (updates.checklistComplete !== undefined) { fields.push('checklist_complete = ?'); values.push(updates.checklistComplete ? 1 : 0) }
      if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE channel_launch_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToChannelLaunchLog(row: any): ChannelLaunchLog {
  return {
    id: row.id, productId: row.product_id, channel: row.channel,
    launchedAt: row.launched_at, owner: row.owner,
    checklistComplete: !!row.checklist_complete, notes: row.notes ?? '',
    createdAt: row.created_at,
  }
}

function createOrderIssueLogStorage(): OrderIssueLogStorage {
  return {
    findAll(): OrderIssueLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM order_issue_logs ORDER BY created_at DESC').all() as any[]).map(rowToOrderIssueLog)
    },
    findByOrderId(orderId: string): OrderIssueLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM order_issue_logs WHERE order_id = ? ORDER BY created_at DESC').all(orderId) as any[]).map(rowToOrderIssueLog)
    },
    findById(id: string): OrderIssueLog | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM order_issue_logs WHERE id = ?').get(id) as any
      return row ? rowToOrderIssueLog(row) : undefined
    },
    insert(log: OrderIssueLog): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO order_issue_logs (id, order_id, issue_type, severity, description, resolved_at, resolution, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(log.id, log.orderId, log.issueType, log.severity, log.description, log.resolvedAt, log.resolution, log.createdAt)
    },
    update(id: string, updates: Partial<OrderIssueLog>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.resolvedAt !== undefined) { fields.push('resolved_at = ?'); values.push(updates.resolvedAt) }
      if (updates.resolution !== undefined) { fields.push('resolution = ?'); values.push(updates.resolution) }
      if (updates.severity !== undefined) { fields.push('severity = ?'); values.push(updates.severity) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE order_issue_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToOrderIssueLog(row: any): OrderIssueLog {
  return {
    id: row.id, orderId: row.order_id, issueType: row.issue_type, severity: row.severity,
    description: row.description, resolvedAt: row.resolved_at ?? null, resolution: row.resolution ?? null,
    createdAt: row.created_at,
  }
}

function createAdTestLogStorage(): AdTestLogStorage {
  return {
    findAll(): AdTestLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM ad_test_logs ORDER BY created_at DESC').all() as any[]).map(rowToAdTestLog)
    },
    findByProductId(productId: string): AdTestLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM ad_test_logs WHERE product_id = ? ORDER BY created_at DESC').all(productId) as any[]).map(rowToAdTestLog)
    },
    findById(id: string): AdTestLog | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM ad_test_logs WHERE id = ?').get(id) as any
      return row ? rowToAdTestLog(row) : undefined
    },
    insert(log: AdTestLog): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO ad_test_logs (id, product_id, ad_channel, campaign_id, creative_id, angle, spend, impressions, clicks, ctr, cpc, add_to_cart, purchases, cpa, roas, key_comments, conclusion, next_action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        log.id, log.productId, log.adChannel, log.campaignId, log.creativeId,
        log.angle, log.spend, log.impressions, log.clicks, log.ctr, log.cpc,
        log.addToCart, log.purchases, log.cpa, log.roas,
        log.keyComments, log.conclusion, log.nextAction, log.createdAt,
      )
    },
    update(id: string, updates: Partial<AdTestLog>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.conclusion !== undefined) { fields.push('conclusion = ?'); values.push(updates.conclusion) }
      if (updates.nextAction !== undefined) { fields.push('next_action = ?'); values.push(updates.nextAction) }
      if (updates.keyComments !== undefined) { fields.push('key_comments = ?'); values.push(updates.keyComments) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE ad_test_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToAdTestLog(row: any): AdTestLog {
  return {
    id: row.id, productId: row.product_id, adChannel: row.ad_channel,
    campaignId: row.campaign_id ?? '', creativeId: row.creative_id ?? '',
    angle: row.angle, spend: row.spend, impressions: row.impressions, clicks: row.clicks,
    ctr: row.ctr, cpc: row.cpc, addToCart: row.add_to_cart, purchases: row.purchases,
    cpa: row.cpa, roas: row.roas, keyComments: row.key_comments ?? '',
    conclusion: row.conclusion ?? '', nextAction: row.next_action ?? '',
    createdAt: row.created_at,
  }
}

function createCreativeBriefStorage(): CreativeBriefStorage {
  return {
    findAll(): CreativeBrief[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM creative_briefs ORDER BY created_at DESC').all() as any[]).map(rowToCreativeBrief)
    },
    findById(id: string): CreativeBrief | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM creative_briefs WHERE id = ?').get(id) as any
      return row ? rowToCreativeBrief(row) : undefined
    },
    insert(brief: CreativeBrief): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO creative_briefs (id, product_name, product_code, customer_persona, gift_recipient, occasion, emotion, main_message, visual_style, colors, prohibited_content, personalization_requirements, file_dimensions, channels, deadline, owner, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        brief.id, brief.productName, brief.productCode, brief.customerPersona,
        brief.giftRecipient, brief.occasion, brief.emotion, brief.mainMessage,
        brief.visualStyle, brief.colors, brief.prohibitedContent,
        brief.personalizationRequirements, brief.fileDimensions, brief.channels,
        brief.deadline, brief.owner, brief.status, brief.createdAt, brief.updatedAt,
      )
    },
    update(id: string, updates: Partial<CreativeBrief>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.mainMessage !== undefined) { fields.push('main_message = ?'); values.push(updates.mainMessage) }
      if (updates.visualStyle !== undefined) { fields.push('visual_style = ?'); values.push(updates.visualStyle) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE creative_briefs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToCreativeBrief(row: any): CreativeBrief {
  return {
    id: row.id, productName: row.product_name, productCode: row.product_code ?? '',
    customerPersona: row.customer_persona ?? '', giftRecipient: row.gift_recipient ?? '',
    occasion: row.occasion ?? '', emotion: row.emotion ?? '', mainMessage: row.main_message ?? '',
    visualStyle: row.visual_style ?? '', colors: row.colors ?? '',
    prohibitedContent: row.prohibited_content ?? '',
    personalizationRequirements: row.personalization_requirements ?? '',
    fileDimensions: row.file_dimensions ?? '', channels: row.channels ?? '',
    deadline: row.deadline ?? '', owner: row.owner ?? '', status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

function createIncidentLogStorage(): IncidentLogStorage {
  return {
    findAll(): IncidentLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM incident_logs ORDER BY created_at DESC').all() as any[]).map(rowToIncidentLog)
    },
    findById(id: string): IncidentLog | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM incident_logs WHERE id = ?').get(id) as any
      return row ? rowToIncidentLog(row) : undefined
    },
    insert(log: IncidentLog): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO incident_logs (id, platform, incident_type, severity, description, evidence_url, assumed_cause, owner, immediate_action, preventive_action, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        log.id, log.platform, log.incidentType, log.severity, log.description,
        log.evidenceUrl, log.assumedCause, log.owner, log.immediateAction,
        log.preventiveAction, log.status, log.createdAt,
      )
    },
    update(id: string, updates: Partial<IncidentLog>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.owner !== undefined) { fields.push('owner = ?'); values.push(updates.owner) }
      if (updates.immediateAction !== undefined) { fields.push('immediate_action = ?'); values.push(updates.immediateAction) }
      if (updates.preventiveAction !== undefined) { fields.push('preventive_action = ?'); values.push(updates.preventiveAction) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE incident_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToIncidentLog(row: any): IncidentLog {
  return {
    id: row.id, platform: row.platform, incidentType: row.incident_type, severity: row.severity,
    description: row.description, evidenceUrl: row.evidence_url ?? '',
    assumedCause: row.assumed_cause ?? '', owner: row.owner ?? '',
    immediateAction: row.immediate_action ?? '', preventiveAction: row.preventive_action ?? '',
    status: row.status, createdAt: row.created_at, closedAt: row.closed_at ?? null,
  }
}

function createIpCheckLogStorage(): IpCheckLogStorage {
  return {
    findAll(): IpCheckLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM ip_check_logs ORDER BY created_at DESC').all() as any[]).map(rowToIpCheckLog)
    },
    findByProductId(productId: string): IpCheckLog[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM ip_check_logs WHERE product_id = ? ORDER BY created_at DESC').all(productId) as any[]).map(rowToIpCheckLog)
    },
    findById(id: string): IpCheckLog | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM ip_check_logs WHERE id = ?').get(id) as any
      return row ? rowToIpCheckLog(row) : undefined
    },
    insert(log: IpCheckLog): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO ip_check_logs (id, product_id, keywords_checked, assets_checked, asset_source, license, trademark_risk, copyright_risk, character_risk, conclusion, checker, approver, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        log.id, log.productId, log.keywordsChecked, log.assetsChecked, log.assetSource,
        log.license, log.trademarkRisk, log.copyrightRisk, log.characterRisk,
        log.conclusion, log.checker, log.approver, log.createdAt,
      )
    },
    update(id: string, updates: Partial<IpCheckLog>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.conclusion !== undefined) { fields.push('conclusion = ?'); values.push(updates.conclusion) }
      if (updates.approver !== undefined) { fields.push('approver = ?'); values.push(updates.approver) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE ip_check_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToIpCheckLog(row: any): IpCheckLog {
  return {
    id: row.id, productId: row.product_id, keywordsChecked: row.keywords_checked,
    assetsChecked: row.assets_checked ?? '', assetSource: row.asset_source ?? '',
    license: row.license ?? '', trademarkRisk: row.trademark_risk, copyrightRisk: row.copyright_risk,
    characterRisk: row.character_risk, conclusion: row.conclusion ?? '',
    checker: row.checker ?? '', approver: row.approver ?? '', createdAt: row.created_at,
  }
}

// ─── SLA Storage ──────────────────────────────────────────────────────────────────

function createSlaStorage(): SlaStorage {
  return {
    findAll(): SlaEvent[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM sla_events ORDER BY created_at DESC').all() as any[]).map(rowToSlaEvent)
    },
    findActive(): SlaEvent[] {
      const db = getDb()
      return (db.prepare("SELECT * FROM sla_events WHERE status = 'active' ORDER BY created_at ASC").all() as any[]).map(rowToSlaEvent)
    },
    findBreached(): SlaEvent[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM sla_events WHERE breached_at IS NOT NULL ORDER BY created_at DESC').all() as any[]).map(rowToSlaEvent)
    },
    findById(id: string): SlaEvent | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM sla_events WHERE id = ?').get(id) as any
      return row ? rowToSlaEvent(row) : undefined
    },
    insert(event: SlaEvent): void {
      const db = getDb()
      db.prepare(`
        INSERT INTO sla_events (id, process_name, object_id, sla_hours, breached_at, severity, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(event.id, event.processName, event.objectId, event.slaHours, event.breachedAt, event.severity, event.status, event.createdAt)
    },
    update(id: string, updates: Partial<SlaEvent>): void {
      const db = getDb()
      const fields: string[] = []; const values: any[] = []
      if (updates.severity !== undefined) { fields.push('severity = ?'); values.push(updates.severity) }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
      if (updates.breachedAt !== undefined) { fields.push('breached_at = ?'); values.push(updates.breachedAt) }
      values.push(id)
      if (fields.length > 0) {
        db.prepare(`UPDATE sla_events SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      }
    },
  }
}

function rowToSlaEvent(row: any): SlaEvent {
  return {
    id: row.id, processName: row.process_name, objectId: row.object_id ?? null,
    slaHours: row.sla_hours, breachedAt: row.breached_at ?? null, severity: row.severity,
    status: row.status, createdAt: row.created_at,
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────────

const dashboardService = new DashboardService(dashboardDataSource)

const listingLogStorage = createListingLogStorage()
const channelLaunchLogStorage = createChannelLaunchLogStorage()
const orderIssueLogStorage = createOrderIssueLogStorage()
const adTestLogStorage = createAdTestLogStorage()
const creativeBriefStorage = createCreativeBriefStorage()
const incidentLogStorage = createIncidentLogStorage()
const ipCheckLogStorage = createIpCheckLogStorage()

const biLogsService = new BiLogsService(
  listingLogStorage, channelLaunchLogStorage, orderIssueLogStorage,
  adTestLogStorage, creativeBriefStorage, incidentLogStorage, ipCheckLogStorage,
)

const slaStorage = createSlaStorage()
const slaMonitorService = new SlaMonitorService(slaStorage)

// ─── Dashboard Routes ─────────────────────────────────────────────────────────────

/**
 * Get company-level dashboard.
 * GET /api/bi/company?start=...&end=...
 */
biRouter.get('/company', async (req: any, res) => {
  const start = req.query.start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = req.query.end ?? new Date().toISOString().slice(0, 10)
  try {
    const dashboard = await dashboardService.getCompanyDashboard(start, end)
    res.json({ dashboard })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

/**
 * Get channel-level dashboard.
 * GET /api/bi/channel/:channel?start=...&end=...
 */
biRouter.get('/channel/:channel', async (req: any, res) => {
  const start = req.query.start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = req.query.end ?? new Date().toISOString().slice(0, 10)
  try {
    const dashboard = await dashboardService.getChannelDashboard(req.params.channel, start, end)
    res.json({ dashboard })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

/**
 * Get product-level dashboard.
 * GET /api/bi/product/:productId?start=...&end=...
 */
biRouter.get('/product/:productId', async (req: any, res) => {
  const start = req.query.start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = req.query.end ?? new Date().toISOString().slice(0, 10)
  try {
    const dashboard = await dashboardService.getProductDashboard(req.params.productId, start, end)
    res.json({ dashboard })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

/**
 * Get ad dashboard.
 * GET /api/bi/ads?start=...&end=...
 */
biRouter.get('/ads', async (req: any, res) => {
  const start = req.query.start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const end = req.query.end ?? new Date().toISOString().slice(0, 10)
  try {
    const dashboard = await dashboardService.getAdDashboard(start, end)
    res.json({ dashboard })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// ─── Listing Log Routes ───────────────────────────────────────────────────────────

biRouter.get('/logs/listing', (req: any, res) => {
  const logs = biLogsService.getListingLogs(req.query.productId as string)
  res.json({ logs })
})

biRouter.post('/logs/listing', (req: any, res) => {
  const { productId, channel, listingUrl, title, publishedAt, status, optimizationNotes } = req.body
  if (!productId || !channel || !listingUrl || !title) {
    return res.status(400).json({ error: true, message: 'productId, channel, listingUrl, and title are required' })
  }
  const log = biLogsService.createListingLog({ productId, channel, listingUrl, title, publishedAt, status, optimizationNotes })
  res.status(201).json({ log })
})

biRouter.put('/logs/listing/:id', (req: any, res) => {
  try {
    const log = biLogsService.updateListingLog(req.params.id, req.body)
    res.json({ log })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})

// ─── Channel Launch Log Routes ────────────────────────────────────────────────────

biRouter.get('/logs/channel-launch', (req: any, res) => {
  const logs = biLogsService.getChannelLaunchLogs(req.query.productId as string)
  res.json({ logs })
})

biRouter.post('/logs/channel-launch', (req: any, res) => {
  const { productId, channel, owner, checklistComplete, notes } = req.body
  if (!productId || !channel || !owner) {
    return res.status(400).json({ error: true, message: 'productId, channel, and owner are required' })
  }
  const log = biLogsService.createChannelLaunchLog({ productId, channel, owner, checklistComplete, notes })
  res.status(201).json({ log })
})

// ─── Order Issue Log Routes ───────────────────────────────────────────────────────

biRouter.get('/logs/order-issue', (req: any, res) => {
  const logs = biLogsService.getOrderIssueLogs(req.query.orderId as string)
  res.json({ logs })
})

biRouter.post('/logs/order-issue', (req: any, res) => {
  const { orderId, issueType, severity, description } = req.body
  if (!orderId || !issueType || !description) {
    return res.status(400).json({ error: true, message: 'orderId, issueType, and description are required' })
  }
  const log = biLogsService.createOrderIssueLog({ orderId, issueType, severity, description })
  res.status(201).json({ log })
})

biRouter.post('/logs/order-issue/:id/resolve', (req: any, res) => {
  const { resolution } = req.body
  if (!resolution) {
    return res.status(400).json({ error: true, message: 'resolution is required' })
  }
  try {
    const log = biLogsService.resolveOrderIssue(req.params.id, resolution)
    res.json({ log })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})

// ─── Ad Test Log Routes ───────────────────────────────────────────────────────────

biRouter.get('/logs/ad-test', (req: any, res) => {
  const logs = biLogsService.getAdTestLogs(req.query.productId as string)
  res.json({ logs })
})

biRouter.post('/logs/ad-test', (req: any, res) => {
  const { productId, adChannel, angle, spend, impressions, clicks, addToCart, purchases, keyComments, conclusion, nextAction } = req.body
  if (!productId || !adChannel || !angle) {
    return res.status(400).json({ error: true, message: 'productId, adChannel, and angle are required' })
  }
  const log = biLogsService.createAdTestLog({ productId, adChannel, angle, spend, impressions, clicks, addToCart, purchases, keyComments, conclusion, nextAction })
  res.status(201).json({ log })
})

// ─── Creative Brief Routes ────────────────────────────────────────────────────────

biRouter.get('/logs/creative-brief', (_req, res) => {
  const briefs = biLogsService.getCreativeBriefs()
  res.json({ briefs })
})

biRouter.post('/logs/creative-brief', (req: any, res) => {
  const input = req.body
  if (!input.productName) {
    return res.status(400).json({ error: true, message: 'productName is required' })
  }
  const brief = biLogsService.createCreativeBrief(input)
  res.status(201).json({ brief })
})

biRouter.put('/logs/creative-brief/:id', (req: any, res) => {
  try {
    const brief = biLogsService.updateCreativeBrief(req.params.id, req.body)
    res.json({ brief })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})

// ─── Incident Log Routes ──────────────────────────────────────────────────────────

biRouter.get('/logs/incident', (_req, res) => {
  const logs = biLogsService.getIncidentLogs()
  res.json({ logs })
})

biRouter.post('/logs/incident', (req: any, res) => {
  const { platform, incidentType, severity, description, evidenceUrl, assumedCause, owner, immediateAction, preventiveAction } = req.body
  if (!platform || !incidentType || !severity || !description) {
    return res.status(400).json({ error: true, message: 'platform, incidentType, severity, and description are required' })
  }
  const log = biLogsService.createIncidentLog({ platform, incidentType, severity, description, evidenceUrl, assumedCause, owner, immediateAction, preventiveAction })
  res.status(201).json({ log })
})

biRouter.put('/logs/incident/:id', (req: any, res) => {
  try {
    const log = biLogsService.updateIncidentLog(req.params.id, req.body)
    res.json({ log })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})

// ─── IP Check Log Routes ──────────────────────────────────────────────────────────

biRouter.get('/logs/ip-check', (req: any, res) => {
  const logs = biLogsService.getIpCheckLogs(req.query.productId as string)
  res.json({ logs })
})

biRouter.post('/logs/ip-check', (req: any, res) => {
  const { productId, keywordsChecked, assetsChecked, assetSource, license, trademarkRisk, copyrightRisk, characterRisk, conclusion, checker, approver } = req.body
  if (!productId || !keywordsChecked) {
    return res.status(400).json({ error: true, message: 'productId and keywordsChecked are required' })
  }
  const log = biLogsService.createIpCheckLog({ productId, keywordsChecked, assetsChecked, assetSource, license, trademarkRisk, copyrightRisk, characterRisk, conclusion, checker, approver })
  res.status(201).json({ log })
})

// ─── SLA Routes ───────────────────────────────────────────────────────────────────

/**
 * Check all SLAs for breaches.
 * POST /api/bi/sla/check
 */
biRouter.post('/sla/check', (_req, res) => {
  const breached = slaMonitorService.checkAllSlas()
  res.json({ breached, count: breached.length })
})

/**
 * Create an SLA event.
 * POST /api/bi/sla/events
 */
biRouter.post('/sla/events', (req: any, res) => {
  const { processName, objectId, slaHours } = req.body
  if (!processName || !slaHours) {
    return res.status(400).json({ error: true, message: 'processName and slaHours are required' })
  }
  const event = slaMonitorService.createSlaEvent({ processName, objectId, slaHours })
  res.status(201).json({ slaEvent: event })
})

/**
 * Acknowledge an SLA event.
 * POST /api/bi/sla/events/:id/acknowledge
 */
biRouter.post('/sla/events/:id/acknowledge', (req: any, res) => {
  try {
    const event = slaMonitorService.acknowledgeSlaEvent(req.params.id)
    res.json({ slaEvent: event })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})

/**
 * Resolve an SLA event.
 * POST /api/bi/sla/events/:id/resolve
 */
biRouter.post('/sla/events/:id/resolve', (req: any, res) => {
  try {
    const event = slaMonitorService.resolveSlaEvent(req.params.id)
    res.json({ slaEvent: event })
  } catch (err: any) {
    res.status(404).json({ error: true, message: err.message })
  }
})

/**
 * Get active SLA breaches.
 * GET /api/bi/sla/breaches
 */
biRouter.get('/sla/breaches', (_req, res) => {
  const breaches = slaMonitorService.getActiveBreaches()
  res.json({ breaches })
})

/**
 * Get SLA compliance dashboard.
 * GET /api/bi/sla/dashboard
 */
biRouter.get('/sla/dashboard', (req: any, res) => {
  const days = parseInt(req.query.days as string, 10) || 30
  const dashboard = slaMonitorService.getSlaDashboard(days)
  res.json({ slaDashboard: dashboard })
})
