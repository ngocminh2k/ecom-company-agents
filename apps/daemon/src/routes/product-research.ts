/**
 * Product Research Routes — SOP Phase 7: Product Research + IP.
 *
 * REST endpoints for research sheets, competitor analysis, IP checks, and scoring.
 */
import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { randomUUID } from 'node:crypto'
import {
  validateResearchSheet,
  isValidResearchTransition,
  type ProductResearchSheet,
  type ResearchSheetStatus,
  CompetitorAnalysisService,
  type CompetitorEntry,
  type CompetitorCreateInput,
  IpCheckService,
  type IpCheckResult,
  type IpCheckInput,
  type IpBlacklistEntry,
  type IpBlacklistCreateInput,
  calculateTotalScore,
} from '@ngocminh2k/ecommerce-core'

export const productResearchRouter: RouterType = Router()

// ============================================================
// Sheet helpers
// ============================================================

function rowToSheet(row: any): ProductResearchSheet {
  return {
    id: row.id,
    productName: row.product_name,
    niche: row.niche || '',
    targetCustomer: row.target_customer || '',
    occasion: row.occasion || '',
    firstTestChannel: row.first_test_channel || '',
    mainCompetitors: parseJsonField(row.main_competitors, []),
    keywords: parseJsonField(row.keywords, []),
    priceProposed: row.price_proposed ?? 0,
    cogsEstimated: row.cogs_estimated ?? 0,
    shippingEstimated: row.shipping_estimated ?? 0,
    platformFeesEstimated: row.platform_fees_estimated ?? 0,
    cpaTarget: row.cpa_target ?? 0,
    marginTarget: row.margin_target ?? 0,
    ipRisks: row.ip_risks || '',
    fulfillmentRisks: row.fulfillment_risks || '',
    contentAngles: parseJsonField(row.content_angles, []),
    score: row.score ?? 0,
    conclusion: row.conclusion || '',
    proposer: row.proposer || '',
    approver: row.approver || '',
    status: row.status || 'draft',
  }
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return fallback }
  }
  return (value as T) ?? fallback
}

// ============================================================
// Competitor storage adapter
// ============================================================

function createCompetitorStorage() {
  return {
    create(entry: CompetitorEntry): CompetitorEntry {
      const db = getDb()
      db.prepare(`
        INSERT INTO competitor_entries (id, product_id, competitor_name, price, reviews, rating, main_image_url, offer, shipping_time, key_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.id, entry.productId, entry.competitorName, entry.price,
        entry.reviews, entry.rating, entry.mainImageUrl || null,
        entry.offer || null, entry.shippingTime || null,
        entry.keyMessage || null, entry.createdAt,
      )
      return entry
    },
    findByProductId(productId: string): CompetitorEntry[] {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM competitor_entries WHERE product_id = ? ORDER BY created_at DESC').all(productId) as any[]
      return rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        competitorName: r.competitor_name,
        price: r.price,
        reviews: r.reviews,
        rating: r.rating,
        mainImageUrl: r.main_image_url || undefined,
        offer: r.offer || undefined,
        shippingTime: r.shipping_time || undefined,
        keyMessage: r.key_message || undefined,
        createdAt: r.created_at,
      }))
    },
    delete(id: string): boolean {
      const db = getDb()
      return db.prepare('DELETE FROM competitor_entries WHERE id = ?').run(id).changes > 0
    },
  }
}

// ============================================================
// IP check storage adapter
// ============================================================

function createIpCheckStorage() {
  return {
    createCheck(result: IpCheckResult): IpCheckResult {
      const db = getDb()
      db.prepare(`
        INSERT INTO ip_check_logs (id, product_id, keywords_checked, assets_checked, asset_source, license, trademark_risk, copyright_risk, character_risk, conclusion, checker, approver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        result.id, result.productId,
        JSON.stringify(result.keywordsChecked),
        JSON.stringify(result.assetsChecked),
        result.assetSource, result.license,
        result.trademarkRisk, result.copyrightRisk, result.characterRisk,
        result.conclusion, result.checker, result.approver,
      )
      return result
    },
    findChecksByProductId(productId: string): IpCheckResult[] {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM ip_check_logs WHERE product_id = ? ORDER BY created_at DESC').all(productId) as any[]
      return rows.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        keywordsChecked: parseJsonField(r.keywords_checked, []),
        assetsChecked: parseJsonField(r.assets_checked, []),
        assetSource: r.asset_source || '',
        license: r.license || '',
        trademarkRisk: r.trademark_risk,
        copyrightRisk: r.copyright_risk,
        characterRisk: r.character_risk,
        conclusion: r.conclusion,
        checker: r.checker,
        approver: r.approver || '',
      }))
    },
    addToBlacklist(entry: IpBlacklistEntry): IpBlacklistEntry {
      const db = getDb()
      db.prepare(`
        INSERT INTO ip_blacklist (id, keyword, type, notes)
        VALUES (?, ?, ?, ?)
      `).run(entry.id, entry.keyword, entry.type, entry.notes || null)
      return entry
    },
    findBlacklisted(keyword: string): IpBlacklistEntry | undefined {
      const db = getDb()
      const row = db.prepare('SELECT * FROM ip_blacklist WHERE keyword = ?').get(keyword.toLowerCase().trim()) as any
      if (!row) return undefined
      return {
        id: row.id,
        keyword: row.keyword,
        type: row.type,
        notes: row.notes || undefined,
      }
    },
    findAllBlacklisted(): IpBlacklistEntry[] {
      const db = getDb()
      return (db.prepare('SELECT * FROM ip_blacklist').all() as any[]).map((r: any) => ({
        id: r.id,
        keyword: r.keyword,
        type: r.type,
        notes: r.notes || undefined,
      }))
    },
  }
}

// ============================================================
// Research Sheet Routes
// ============================================================

// GET /api/product-research/sheets — list all sheets
productResearchRouter.get('/sheets', (_req: any, res) => {
  try {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM product_research_sheets ORDER BY created_at DESC').all() as any[]
    res.json({ sheets: rows })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// POST /api/product-research/sheets — create sheet
productResearchRouter.post('/sheets', (req: any, res) => {
  try {
    const db = getDb()
    const body = req.body

    const sheet: Partial<ProductResearchSheet> = {
      productName: body.productName,
      niche: body.niche,
      targetCustomer: body.targetCustomer,
      occasion: body.occasion,
      firstTestChannel: body.firstTestChannel,
      mainCompetitors: body.mainCompetitors || [],
      keywords: body.keywords || [],
      priceProposed: body.priceProposed,
      cogsEstimated: body.cogsEstimated,
      shippingEstimated: body.shippingEstimated,
      platformFeesEstimated: body.platformFeesEstimated,
      cpaTarget: body.cpaTarget,
      marginTarget: body.marginTarget,
      ipRisks: body.ipRisks,
      fulfillmentRisks: body.fulfillmentRisks,
      contentAngles: body.contentAngles || [],
      conclusion: body.conclusion,
      proposer: body.proposer,
      status: 'draft',
    }

    const errors = validateResearchSheet(sheet)
    if (errors.length > 0) {
      return res.status(400).json({ error: true, errors })
    }

    const id = randomUUID()

    db.prepare(`
      INSERT INTO product_research_sheets (id, product_name, niche, target_customer, occasion, first_test_channel, main_competitors, keywords, price_proposed, cogs_estimated, shipping_estimated, platform_fees_estimated, cpa_target, margin_target, ip_risks, fulfillment_risks, content_angles, score, conclusion, proposer, approver, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      id, sheet.productName, sheet.niche || null, sheet.targetCustomer || null,
      sheet.occasion || null, sheet.firstTestChannel || null,
      JSON.stringify(sheet.mainCompetitors), JSON.stringify(sheet.keywords),
      sheet.priceProposed ?? null, sheet.cogsEstimated ?? null,
      sheet.shippingEstimated ?? null, sheet.platformFeesEstimated ?? null,
      sheet.cpaTarget ?? null, sheet.marginTarget ?? null,
      sheet.ipRisks || null, sheet.fulfillmentRisks || null,
      JSON.stringify(sheet.contentAngles),
      sheet.conclusion || null, sheet.proposer || null, sheet.approver || null, sheet.status || 'draft'
    )

    const created = db.prepare('SELECT * FROM product_research_sheets WHERE id = ?').get(id)
    res.status(201).json({ sheet: rowToSheet(created) })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// GET /api/product-research/sheets/:id — get sheet
productResearchRouter.get('/sheets/:id', (req: any, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM product_research_sheets WHERE id = ?').get(req.params.id) as any
    if (!row) {
      return res.status(404).json({ error: true, message: 'Research sheet not found' })
    }
    res.json({ sheet: rowToSheet(row) })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// POST /api/product-research/sheets/:id/score — calculate score
productResearchRouter.post('/sheets/:id/score', (req: any, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM product_research_sheets WHERE id = ?').get(req.params.id) as any
    if (!row) {
      return res.status(404).json({ error: true, message: 'Research sheet not found' })
    }

    const sheet = rowToSheet(row)
    const score = calculateTotalScore(sheet)

    db.prepare('UPDATE product_research_sheets SET score = ? WHERE id = ?').run(score, req.params.id)
    res.json({ score })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// POST /api/product-research/sheets/:id/approve — approve/reject
productResearchRouter.post('/sheets/:id/approve', (req: any, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM product_research_sheets WHERE id = ?').get(req.params.id) as any
    if (!row) {
      return res.status(404).json({ error: true, message: 'Research sheet not found' })
    }

    const currentStatus: ResearchSheetStatus = row.status || 'draft'
    const nextStatus: ResearchSheetStatus = req.body.status

    if (!nextStatus || !['approved', 'rejected'].includes(nextStatus)) {
      return res.status(400).json({ error: true, message: 'Status must be approved or rejected' })
    }

    if (!isValidResearchTransition(currentStatus, nextStatus)) {
      return res.status(400).json({
        error: true,
        message: `Cannot transition from ${currentStatus} to ${nextStatus}`,
      })
    }

    db.prepare('UPDATE product_research_sheets SET status = ?, approver = ? WHERE id = ?')
      .run(nextStatus, req.body.approver || row.proposer, req.params.id)

    const updated = db.prepare('SELECT * FROM product_research_sheets WHERE id = ?').get(req.params.id)
    res.json({ sheet: rowToSheet(updated) })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// ============================================================
// Competitor Routes
// ============================================================

const compStorage = createCompetitorStorage()
const competitorService = new CompetitorAnalysisService(compStorage)

// POST /api/product-research/competitors — record competitor
productResearchRouter.post('/competitors', (req: any, res) => {
  try {
    const input: CompetitorCreateInput = {
      productId: req.body.productId,
      competitorName: req.body.competitorName,
      price: req.body.price,
      reviews: req.body.reviews,
      rating: req.body.rating,
      mainImageUrl: req.body.mainImageUrl,
      offer: req.body.offer,
      shippingTime: req.body.shippingTime,
      keyMessage: req.body.keyMessage,
    }

    if (!input.productId || !input.competitorName) {
      return res.status(400).json({ error: true, message: 'productId and competitorName are required' })
    }

    const entry = competitorService.recordCompetitor(input)
    res.status(201).json({ competitor: entry })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// GET /api/product-research/competitors/:productId — list + report
productResearchRouter.get('/competitors/:productId', (req: any, res) => {
  try {
    const entries = competitorService.getCompetitors(req.params.productId)
    const report = competitorService.generateReport(req.params.productId)
    res.json({ competitors: entries, report })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// ============================================================
// IP Check Routes
// ============================================================

const ipStorage = createIpCheckStorage()
const ipCheckService = new IpCheckService(ipStorage)

// POST /api/product-research/ip-check — run IP check
productResearchRouter.post('/ip-check', (req: any, res) => {
  try {
    const input: IpCheckInput = {
      productId: req.body.productId,
      keywordsChecked: req.body.keywordsChecked || [],
      assetsChecked: req.body.assetsChecked || [],
      assetSource: req.body.assetSource || '',
      license: req.body.license || '',
      checker: req.body.checker || '',
      approver: req.body.approver,
    }

    if (!input.productId) {
      return res.status(400).json({ error: true, message: 'productId is required' })
    }

    const result = ipCheckService.checkProduct(input)
    res.status(201).json({ ipCheck: result })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// GET /api/product-research/ip-check/:productId — history
productResearchRouter.get('/ip-check/:productId', (req: any, res) => {
  try {
    const history = ipCheckService.getCheckHistory(req.params.productId)
    res.json({ ipChecks: history })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// POST /api/product-research/ip-blacklist — add to blacklist
productResearchRouter.post('/ip-blacklist', (req: any, res) => {
  try {
    const input: IpBlacklistCreateInput = {
      keyword: req.body.keyword,
      type: req.body.type,
      notes: req.body.notes,
    }

    if (!input.keyword || !input.type) {
      return res.status(400).json({ error: true, message: 'keyword and type are required' })
    }

    const entry = ipCheckService.addToBlacklist(input)
    res.status(201).json({ blacklistEntry: entry })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

// GET /api/product-research/ip-blacklist/:keyword — check
productResearchRouter.get('/ip-blacklist/:keyword', (req: any, res) => {
  try {
    const entry = ipCheckService.isBlacklisted(req.params.keyword)
    res.json({ blacklisted: entry })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})
