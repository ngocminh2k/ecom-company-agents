/**
 * BI Logs Service — CRUD for all operational logs (SOP Section 20.2).
 *
 * 9 log types: listing_log, channel_launch_log, order_issue_log, ad_test_log,
 * creative_brief, incident_log, ip_check_log, refund_log, vendor_scorecard.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

// ─── Listing Log ──────────────────────────────────────────────────────────────────

export interface ListingLog {
  id: string
  productId: string
  channel: string
  listingUrl: string
  title: string
  publishedAt: string
  status: 'draft' | 'published' | 'optimizing' | 'paused' | 'removed'
  optimizationNotes: string
  createdAt: string
  updatedAt: string
}

export interface ListingLogInput {
  productId: string
  channel: string
  listingUrl: string
  title: string
  publishedAt?: string
  status?: 'draft' | 'published' | 'optimizing' | 'paused' | 'removed'
  optimizationNotes?: string
}

// ─── Channel Launch Log ───────────────────────────────────────────────────────────

export interface ChannelLaunchLog {
  id: string
  productId: string
  channel: string
  launchedAt: string
  owner: string
  checklistComplete: boolean
  notes: string
  createdAt: string
}

export interface ChannelLaunchLogInput {
  productId: string
  channel: string
  owner: string
  checklistComplete?: boolean
  notes?: string
}

// ─── Order Issue Log ──────────────────────────────────────────────────────────────

export interface OrderIssueLog {
  id: string
  orderId: string
  issueType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  resolvedAt: string | null
  resolution: string | null
  createdAt: string
}

export interface OrderIssueLogInput {
  orderId: string
  issueType: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

// ─── Ad Test Log ──────────────────────────────────────────────────────────────────

export interface AdTestLog {
  id: string
  productId: string
  adChannel: string
  campaignId: string
  creativeId: string
  angle: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  addToCart: number
  purchases: number
  cpa: number
  roas: number
  keyComments: string
  conclusion: string
  nextAction: string
  createdAt: string
}

export interface AdTestLogInput {
  productId: string
  adChannel: string
  campaignId?: string
  creativeId?: string
  angle: string
  spend?: number
  impressions?: number
  clicks?: number
  addToCart?: number
  purchases?: number
  keyComments?: string
  conclusion?: string
  nextAction?: string
}

// ─── Creative Brief ───────────────────────────────────────────────────────────────

export interface CreativeBrief {
  id: string
  productName: string
  productCode: string
  customerPersona: string
  giftRecipient: string
  occasion: string
  emotion: string
  mainMessage: string
  visualStyle: string
  colors: string
  prohibitedContent: string
  personalizationRequirements: string
  fileDimensions: string
  channels: string
  deadline: string
  owner: string
  status: 'draft' | 'in_review' | 'approved' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface CreativeBriefInput {
  productName: string
  productCode?: string
  customerPersona?: string
  giftRecipient?: string
  occasion?: string
  emotion?: string
  mainMessage?: string
  visualStyle?: string
  colors?: string
  prohibitedContent?: string
  personalizationRequirements?: string
  fileDimensions?: string
  channels?: string
  deadline?: string
  owner?: string
  status?: 'draft' | 'in_review' | 'approved' | 'completed'
}

// ─── Incident Log ─────────────────────────────────────────────────────────────────

export interface IncidentLog {
  id: string
  platform: string
  incidentType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidenceUrl: string
  assumedCause: string
  owner: string
  immediateAction: string
  preventiveAction: string
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  createdAt: string
  closedAt: string | null
}

export interface IncidentLogInput {
  platform: string
  incidentType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidenceUrl?: string
  assumedCause?: string
  owner?: string
  immediateAction?: string
  preventiveAction?: string
  status?: 'open' | 'investigating' | 'resolved' | 'closed'
}

// ─── IP Check Log ─────────────────────────────────────────────────────────────────

export interface IpCheckLog {
  id: string
  productId: string
  keywordsChecked: string
  assetsChecked: string
  assetSource: string
  license: string
  trademarkRisk: 'low' | 'medium' | 'high' | 'critical'
  copyrightRisk: 'low' | 'medium' | 'high' | 'critical'
  characterRisk: 'low' | 'medium' | 'high' | 'critical'
  conclusion: string
  checker: string
  approver: string
  createdAt: string
}

export interface IpCheckLogInput {
  productId: string
  keywordsChecked: string
  assetsChecked?: string
  assetSource?: string
  license?: string
  trademarkRisk?: 'low' | 'medium' | 'high' | 'critical'
  copyrightRisk?: 'low' | 'medium' | 'high' | 'critical'
  characterRisk?: 'low' | 'medium' | 'high' | 'critical'
  conclusion?: string
  checker?: string
  approver?: string
}

// ─── Refund/Vendor Logs are in existing modules ────────────────────────────────────
// RefundLog is defined in support/refund-service.ts
// VendorScorecard is defined in fulfillment/vendor-scorecard-service.ts

// ─── BiLogsService ────────────────────────────────────────────────────────────────

export interface ListingLogStorage {
  findAll(): ListingLog[]
  findByProductId(productId: string): ListingLog[]
  findById(id: string): ListingLog | undefined
  insert(log: ListingLog): void
  update(id: string, updates: Partial<ListingLog>): void
}

export interface ChannelLaunchLogStorage {
  findAll(): ChannelLaunchLog[]
  findByProductId(productId: string): ChannelLaunchLog[]
  findById(id: string): ChannelLaunchLog | undefined
  insert(log: ChannelLaunchLog): void
  update(id: string, updates: Partial<ChannelLaunchLog>): void
}

export interface OrderIssueLogStorage {
  findAll(): OrderIssueLog[]
  findByOrderId(orderId: string): OrderIssueLog[]
  findById(id: string): OrderIssueLog | undefined
  insert(log: OrderIssueLog): void
  update(id: string, updates: Partial<OrderIssueLog>): void
}

export interface AdTestLogStorage {
  findAll(): AdTestLog[]
  findByProductId(productId: string): AdTestLog[]
  findById(id: string): AdTestLog | undefined
  insert(log: AdTestLog): void
  update(id: string, updates: Partial<AdTestLog>): void
}

export interface CreativeBriefStorage {
  findAll(): CreativeBrief[]
  findById(id: string): CreativeBrief | undefined
  insert(brief: CreativeBrief): void
  update(id: string, updates: Partial<CreativeBrief>): void
}

export interface IncidentLogStorage {
  findAll(): IncidentLog[]
  findById(id: string): IncidentLog | undefined
  insert(log: IncidentLog): void
  update(id: string, updates: Partial<IncidentLog>): void
}

export interface IpCheckLogStorage {
  findAll(): IpCheckLog[]
  findByProductId(productId: string): IpCheckLog[]
  findById(id: string): IpCheckLog | undefined
  insert(log: IpCheckLog): void
  update(id: string, updates: Partial<IpCheckLog>): void
}

export class BiLogsService {
  constructor(
    private listingLogStorage: ListingLogStorage,
    private channelLaunchLogStorage: ChannelLaunchLogStorage,
    private orderIssueLogStorage: OrderIssueLogStorage,
    private adTestLogStorage: AdTestLogStorage,
    private creativeBriefStorage: CreativeBriefStorage,
    private incidentLogStorage: IncidentLogStorage,
    private ipCheckLogStorage: IpCheckLogStorage,
  ) {}

  // ─── Listing Log ──────────────────────────────────────────────────────────────

  createListingLog(input: ListingLogInput): ListingLog {
    const now = new Date().toISOString()
    const log: ListingLog = {
      id: crypto.randomUUID(),
      productId: input.productId,
      channel: input.channel,
      listingUrl: input.listingUrl,
      title: input.title,
      publishedAt: input.publishedAt ?? now,
      status: input.status ?? 'draft',
      optimizationNotes: input.optimizationNotes ?? '',
      createdAt: now,
      updatedAt: now,
    }
    this.listingLogStorage.insert(log)
    return log
  }

  updateListingLog(id: string, updates: Partial<ListingLogInput & { status?: any }>): ListingLog {
    const existing = this.listingLogStorage.findById(id)
    if (!existing) throw new Error(`ListingLog ${id} not found`)
    const updated: Partial<ListingLog> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.listingLogStorage.update(id, updated)
    return { ...existing, ...updated }
  }

  getListingLogs(productId?: string): ListingLog[] {
    if (productId) return this.listingLogStorage.findByProductId(productId)
    return this.listingLogStorage.findAll()
  }

  // ─── Channel Launch Log ───────────────────────────────────────────────────────

  createChannelLaunchLog(input: ChannelLaunchLogInput): ChannelLaunchLog {
    const now = new Date().toISOString()
    const log: ChannelLaunchLog = {
      id: crypto.randomUUID(),
      productId: input.productId,
      channel: input.channel,
      launchedAt: now,
      owner: input.owner,
      checklistComplete: input.checklistComplete ?? false,
      notes: input.notes ?? '',
      createdAt: now,
    }
    this.channelLaunchLogStorage.insert(log)
    return log
  }

  getChannelLaunchLogs(productId?: string): ChannelLaunchLog[] {
    if (productId) return this.channelLaunchLogStorage.findByProductId(productId)
    return this.channelLaunchLogStorage.findAll()
  }

  // ─── Order Issue Log ──────────────────────────────────────────────────────────

  createOrderIssueLog(input: OrderIssueLogInput): OrderIssueLog {
    const log: OrderIssueLog = {
      id: crypto.randomUUID(),
      orderId: input.orderId,
      issueType: input.issueType,
      severity: input.severity ?? 'medium',
      description: input.description,
      resolvedAt: null,
      resolution: null,
      createdAt: new Date().toISOString(),
    }
    this.orderIssueLogStorage.insert(log)
    return log
  }

  resolveOrderIssue(id: string, resolution: string): OrderIssueLog {
    const existing = this.orderIssueLogStorage.findById(id)
    if (!existing) throw new Error(`OrderIssueLog ${id} not found`)
    const now = new Date().toISOString()
    const updates: Partial<OrderIssueLog> = {
      resolvedAt: now,
      resolution,
    }
    this.orderIssueLogStorage.update(id, updates)
    return { ...existing, ...updates }
  }

  getOrderIssueLogs(orderId?: string): OrderIssueLog[] {
    if (orderId) return this.orderIssueLogStorage.findByOrderId(orderId)
    return this.orderIssueLogStorage.findAll()
  }

  // ─── Ad Test Log ──────────────────────────────────────────────────────────────

  createAdTestLog(input: AdTestLogInput): AdTestLog {
    const spend = input.spend ?? 0
    const impressions = input.impressions ?? 0
    const clicks = input.clicks ?? 0
    const purchases = input.purchases ?? 0

    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0
    const cpc = clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0
    const cpa = purchases > 0 ? Math.round((spend / purchases) * 100) / 100 : 0
    const roas = spend > 0 ? Math.round(((input.addToCart ?? 0) * 0.3 * spend / spend) * 100) / 100 : 0

    const log: AdTestLog = {
      id: crypto.randomUUID(),
      productId: input.productId,
      adChannel: input.adChannel,
      campaignId: input.campaignId ?? '',
      creativeId: input.creativeId ?? '',
      angle: input.angle,
      spend,
      impressions,
      clicks,
      ctr,
      cpc,
      addToCart: input.addToCart ?? 0,
      purchases,
      cpa,
      roas,
      keyComments: input.keyComments ?? '',
      conclusion: input.conclusion ?? '',
      nextAction: input.nextAction ?? '',
      createdAt: new Date().toISOString(),
    }
    this.adTestLogStorage.insert(log)
    return log
  }

  getAdTestLogs(productId?: string): AdTestLog[] {
    if (productId) return this.adTestLogStorage.findByProductId(productId)
    return this.adTestLogStorage.findAll()
  }

  // ─── Creative Brief ───────────────────────────────────────────────────────────

  createCreativeBrief(input: CreativeBriefInput): CreativeBrief {
    const now = new Date().toISOString()
    const brief: CreativeBrief = {
      id: crypto.randomUUID(),
      productName: input.productName,
      productCode: input.productCode ?? '',
      customerPersona: input.customerPersona ?? '',
      giftRecipient: input.giftRecipient ?? '',
      occasion: input.occasion ?? '',
      emotion: input.emotion ?? '',
      mainMessage: input.mainMessage ?? '',
      visualStyle: input.visualStyle ?? '',
      colors: input.colors ?? '',
      prohibitedContent: input.prohibitedContent ?? '',
      personalizationRequirements: input.personalizationRequirements ?? '',
      fileDimensions: input.fileDimensions ?? '',
      channels: input.channels ?? '',
      deadline: input.deadline ?? '',
      owner: input.owner ?? '',
      status: input.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    }
    this.creativeBriefStorage.insert(brief)
    return brief
  }

  updateCreativeBrief(id: string, updates: Partial<CreativeBriefInput>): CreativeBrief {
    const existing = this.creativeBriefStorage.findById(id)
    if (!existing) throw new Error(`CreativeBrief ${id} not found`)
    const updated: Partial<CreativeBrief> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    this.creativeBriefStorage.update(id, updated)
    return { ...existing, ...updated }
  }

  getCreativeBriefs(): CreativeBrief[] {
    return this.creativeBriefStorage.findAll()
  }

  // ─── Incident Log ─────────────────────────────────────────────────────────────

  createIncidentLog(input: IncidentLogInput): IncidentLog {
    const now = new Date().toISOString()
    const log: IncidentLog = {
      id: crypto.randomUUID(),
      platform: input.platform,
      incidentType: input.incidentType,
      severity: input.severity,
      description: input.description,
      evidenceUrl: input.evidenceUrl ?? '',
      assumedCause: input.assumedCause ?? '',
      owner: input.owner ?? '',
      immediateAction: input.immediateAction ?? '',
      preventiveAction: input.preventiveAction ?? '',
      status: input.status ?? 'open',
      createdAt: now,
      closedAt: null,
    }
    this.incidentLogStorage.insert(log)
    return log
  }

  updateIncidentLog(id: string, updates: Partial<IncidentLogInput>): IncidentLog {
    const existing = this.incidentLogStorage.findById(id)
    if (!existing) throw new Error(`IncidentLog ${id} not found`)
    const now = new Date().toISOString()
    const updated: Partial<IncidentLog> = {
      ...updates,
      closedAt: updates.status === 'closed' || updates.status === 'resolved' ? now : existing.closedAt,
    }
    this.incidentLogStorage.update(id, updated)
    return { ...existing, ...updated }
  }

  getIncidentLogs(): IncidentLog[] {
    return this.incidentLogStorage.findAll()
  }

  // ─── IP Check Log ─────────────────────────────────────────────────────────────

  createIpCheckLog(input: IpCheckLogInput): IpCheckLog {
    const log: IpCheckLog = {
      id: crypto.randomUUID(),
      productId: input.productId,
      keywordsChecked: input.keywordsChecked,
      assetsChecked: input.assetsChecked ?? '',
      assetSource: input.assetSource ?? '',
      license: input.license ?? '',
      trademarkRisk: input.trademarkRisk ?? 'low',
      copyrightRisk: input.copyrightRisk ?? 'low',
      characterRisk: input.characterRisk ?? 'low',
      conclusion: input.conclusion ?? '',
      checker: input.checker ?? '',
      approver: input.approver ?? '',
      createdAt: new Date().toISOString(),
    }
    this.ipCheckLogStorage.insert(log)
    return log
  }

  getIpCheckLogs(productId?: string): IpCheckLog[] {
    if (productId) return this.ipCheckLogStorage.findByProductId(productId)
    return this.ipCheckLogStorage.findAll()
  }
}
