/**
 * AgentPulse Commerce — API client layer.
 * Calls daemon through Next.js rewrite proxy (/api/* -> 127.0.0.1:7456/api/*).
 * NO mock fallback — if daemon is offline, the request fails.
 * Pages handle errors explicitly via ErrorState.
 */

const BASE = '/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Product {
  id: string; name: string; type: string; status: string; description?: string
  sku?: string; price?: number; cost?: number; created_at: string
}
export interface Order {
  id: string; product_id: string; quantity: number; total: number; status: string
  customer_email?: string; customer_name?: string; created_at: string
  tracking_number?: string; shipping_address?: string
}
export interface Agent {
  id: string; name: string; division: string; description: string; color: string
}
export interface Summary { revenue: number; orders: number; aov: number; conversionRate: number; adSpend: number; roas: number; customers: number }
export interface Skill { id: string; name: string; description: string; mode: string }

// P0 module types
export interface ResearchSheet {
  id: string
  productName: string
  niche: string
  targetCustomer: string
  occasion: string
  firstTestChannel: string
  mainCompetitors: string[]
  keywords: string[]
  priceProposed: number
  cogsEstimated: number
  shippingEstimated: number
  platformFeesEstimated: number
  cpaTarget: number
  marginTarget: number
  ipRisks: string
  fulfillmentRisks: string
  contentAngles: string[]
  score: number
  conclusion: string
  proposer: string
  approver: string
  status: string
  created_at: string
}
export interface CompetitorEntry {
  id: string
  productId: string
  competitorName: string
  price?: number
  reviews?: number
  rating?: number
  mainImageUrl?: string
  offer?: string
  shippingTime?: string
  keyMessage?: string
  createdAt: string
}
export interface IpCheckResult {
  id: string
  productId: string
  keywordsChecked: string[]
  assetsChecked: string[]
  assetSource: string
  license: string
  trademarkRisk: string
  copyrightRisk: string
  characterRisk: string
  conclusion: string
  checker: string
  approver?: string
}
export interface IpBlacklistEntry {
  id: string
  keyword: string
  type: string
  notes?: string
}
export interface LaunchOrchestration {
  id: string; product_id: string; channel: string; status: string
  stage: string; flags?: Record<string, boolean>; created_at: string
}
export interface LaunchChecklistItem {
  id: string; launch_id: string; item: string; completed: boolean
  blocked_by?: string; completed_at?: string
}
export interface ListingLog {
  id: string; product_id: string; channel: string; action: string
  status: string; detail?: string; created_at: string
}
export interface ChannelLaunchLog {
  id: string; channel: string; product_name: string; status: string
  launched_at?: string; errors?: string; created_at: string
}
export interface OrderIssueLog {
  id: string; order_id: string; issue: string; severity: string
  status: string; resolution?: string; created_at: string
}
export interface AdTestLog {
  id: string; product_id: string; platform: string; variant: string
  impressions?: number; clicks?: number; spend?: number; created_at: string
}
export interface IncidentLog {
  id: string; title: string; severity: string; status: string
  description?: string; resolved_at?: string; created_at: string
}
export interface CreativeBrief {
  id: string; sheet_id: string; product_name: string; status: string
  requirements?: string; due_date?: string; created_at: string
}
export interface CompanyDashboard {
  total_revenue: number; total_orders: number; active_products: number
  active_launches: number; open_alerts: number; sla_breaches: number
}
export interface FinanceAlert {
  id: string; type: string; severity: string; message: string
  channel?: string; value?: number; acknowledged: boolean; createdAt: string
}
export interface SlaBreach {
  id: string; processName: string; objectId: string | null
  slaHours: number; breachedAt: string | null
  severity: string; status: string; createdAt: string
}
export interface SlaDashboard {
  totalActive: number; totalBreached: number; complianceRate: number
  byProcess: Record<string, { active: number; breached: number; total: number }>
  activeBreaches: SlaBreach[]; periodDays: number
}

export interface SupportTicket {
  id: string; channel: string; customer_email?: string; customer_name?: string
  ticket_type: string; content: string; status: string
  sla_deadline?: string; assigned_to?: string; created_at: string
}
export interface TicketResponse {
  id: string; ticket_id: string; response: string; created_by?: string; created_at: string
}
export interface Macro {
  key: string; name: string; subject: string; body: string; channel: string
}
export interface RefundRequest {
  id: string; order_id: string; channel: string; amount: number; reason: string
  status: string; handler?: string; created_at: string
}

export interface FulfillmentOrder {
  id: string; order_id: string; sku: string; quantity: number; status: string
  is_personalized?: boolean; vendor_id?: string; assigned_to?: string
  tracking_number?: string; carrier?: string; notes?: string; created_at: string
}
export interface VendorScorecard {
  id: string; vendor_id: string; period: string; overall_score: number
  on_time_delivery?: number; defect_rate?: number; response_time_hours?: number
}
export interface QcLog {
  id: string; order_id: string; checked_by?: string; result: string; notes?: string
  sku_ok?: boolean; personalization_ok?: boolean; color_size_ok?: boolean
  surface_ok?: boolean; packaging_ok?: boolean; photo_url?: string; created_at: string
}
export interface EtsyListing {
  id: string; product_id: string; title: string; description?: string
  tags?: string; price: number; quantity: number; status: string
  etsy_listing_id?: string; url?: string; views?: number; created_at: string
}
export interface ShopifyProduct {
  id: string; product_id: string; title: string; description_html?: string
  status: string; vendor?: string; price?: number; sku?: string; created_at: string
}
export interface AmazonListing {
  id: string; product_id: string; title: string; asin?: string; sku?: string
  price?: number; status: string; fulfillment_type?: string; created_at: string
}
export interface Conversation {
  id: string; title: string; skill_id: string; created_at: string; updated_at: string; message_count: number
}
export interface Message {
  id: string; conversation_id: string; role: 'user' | 'assistant' | 'system'; content: string; agent_id?: string; created_at: string
}


// ---------------------------------------------------------------------------
// Helpers — throw on failure, no mock
// ---------------------------------------------------------------------------
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`)
  return res.json() as T
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`API POST ${path} returned ${res.status}`)
  return res.json() as T
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const api = {
  health: (): Promise<{ status: string; version?: string }> =>
    apiGet('/health'),

  products: {
    list: (): Promise<{ products: Product[] }> => apiGet('/products'),
    create: (data: Partial<Product>): Promise<{ product: Product }> => apiPost('/products', data),
  },

  orders: {
    list: (): Promise<{ orders: Order[] }> => apiGet('/orders'),
  },

  agents: {
    list: (): Promise<{
      adapters: { id: string; name: string; detected: boolean }[]
      personalities: { total: number; divisions: number; byDivision: { division: string; count: number; agents: Agent[] }[] }
      running: string[]
    }> => apiGet('/agents'),
  },

  summary: (): Promise<{ summary: Summary }> =>
    apiGet('/ecommerce/summary'),

  skills: {
    list: (): Promise<{ skills: Skill[] }> => apiGet('/skills'),
    route: (message: string): Promise<{ skillId: string }> => apiPost('/skills/route', { message }),
  },

  // -----------------------------------------------------------------------
  // Product Research
  // -----------------------------------------------------------------------
  productResearch: {
    sheets: {
      list: (): Promise<{ sheets: ResearchSheet[] }> => apiGet('/product-research/sheets'),
      get: (id: string): Promise<{ sheet: ResearchSheet }> => apiGet(`/product-research/sheets/${id}`),
      create: (data: Partial<ResearchSheet>): Promise<{ sheet: ResearchSheet }> => apiPost('/product-research/sheets', data),
      score: (id: string): Promise<{ score: number }> => apiPost(`/product-research/sheets/${id}/score`, {}),
      approve: (id: string, data?: { status?: string; approver?: string }): Promise<{ sheet: ResearchSheet }> => apiPost(`/product-research/sheets/${id}/approve`, data ?? {}),
    },
    competitors: {
      list: (productId: string): Promise<{ competitors: CompetitorEntry[] }> => apiGet(`/product-research/competitors/${productId}`),
      create: (data: Partial<CompetitorEntry>): Promise<{ competitor: CompetitorEntry }> => apiPost('/product-research/competitors', data),
    },
    ipCheck: {
      run: (data: { productId: string; keywordsChecked?: string[]; assetsChecked?: string[]; assetSource?: string; license?: string; checker?: string }): Promise<{ ipCheck: IpCheckResult }> => apiPost('/product-research/ip-check', data),
      history: (productId: string): Promise<{ ipChecks: IpCheckResult[] }> => apiGet(`/product-research/ip-check/${productId}`),
    },
    ipBlacklist: {
      add: (data: Partial<IpBlacklistEntry>): Promise<{ blacklistEntry: IpBlacklistEntry }> => apiPost('/product-research/ip-blacklist', data),
      check: (keyword: string): Promise<{ blacklisted: boolean; entry?: IpBlacklistEntry }> => apiGet(`/product-research/ip-blacklist/${encodeURIComponent(keyword)}`),
    },
  },

  // -----------------------------------------------------------------------
  // Launch Orchestration
  // -----------------------------------------------------------------------
  orchestration: {
    start: (data: { product_id: string; channel: string }): Promise<{ orchestration: LaunchOrchestration }> => apiPost('/orchestration', data),
    get: (id: string): Promise<{ orchestration: LaunchOrchestration }> => apiGet(`/orchestration/${id}`),
    list: (): Promise<{ orchestrations: LaunchOrchestration[] }> => apiGet('/orchestration/'),
    advance: (id: string): Promise<{ orchestration: LaunchOrchestration }> => apiPost(`/orchestration/${id}/advance`, {}),
    complete: (id: string): Promise<{ orchestration: LaunchOrchestration }> => apiPost(`/orchestration/${id}/complete`, {}),
    block: (id: string, reason: string): Promise<{ orchestration: LaunchOrchestration }> => apiPost(`/orchestration/${id}/block`, { reason }),
    updateFlags: (id: string, flags: Record<string, boolean>): Promise<{ orchestration: LaunchOrchestration }> => apiPost(`/orchestration/${id}/flags`, flags),
    readiness: (id: string): Promise<{ ready: boolean; checks: { item: string; passed: boolean }[] }> => apiGet(`/orchestration/${id}/readiness`),
    checklist: {
      get: (launchId: string): Promise<{ items: LaunchChecklistItem[] }> => apiGet(`/orchestration/${launchId}/checklist`),
      init: (launchId: string): Promise<{ items: LaunchChecklistItem[] }> => apiPost(`/orchestration/${launchId}/checklist/init`, {}),
      completeItem: (launchId: string, itemId: string): Promise<{ item: LaunchChecklistItem }> => apiPost(`/orchestration/${launchId}/checklist/${itemId}/complete`, {}),
      blockedItems: (launchId: string): Promise<{ items: LaunchChecklistItem[] }> => apiGet(`/orchestration/${launchId}/checklist/blocked`),
    },
    checkpoints: {
      record: (launchId: string, data: { stage: string; status: string; notes?: string }): Promise<{ checkpoint: unknown }> => apiPost(`/orchestration/${launchId}/checkpoints`, data),
      get: (launchId: string): Promise<{ checkpoints: unknown[] }> => apiGet(`/orchestration/${launchId}/checkpoints`),
    },
  },

  // -----------------------------------------------------------------------
  // BI Dashboard
  // -----------------------------------------------------------------------
  bi: {
    company: (): Promise<{ dashboard: CompanyDashboard }> => apiGet('/bi/company'),
    channel: (channel: string): Promise<{ data: unknown }> => apiGet(`/bi/channel/${encodeURIComponent(channel)}`),
    product: (productId: string): Promise<{ data: unknown }> => apiGet(`/bi/product/${productId}`),
    ads: (): Promise<{ data: unknown }> => apiGet('/bi/ads'),
    // ponytail: /bi/company, /bi/channel, /bi/product, /bi/ads are endpoints with varying response shapes;
    // typed once UI teams lock response contracts.
    logs: {
      listing: {
        list: (): Promise<{ logs: ListingLog[] }> => apiGet('/bi/logs/listing'),
        create: (data: Partial<ListingLog>): Promise<{ log: ListingLog }> => apiPost('/bi/logs/listing', data),
      },
      channelLaunch: {
        list: (): Promise<{ logs: ChannelLaunchLog[] }> => apiGet('/bi/logs/channel-launch'),
        create: (data: Partial<ChannelLaunchLog>): Promise<{ log: ChannelLaunchLog }> => apiPost('/bi/logs/channel-launch', data),
      },
      orderIssue: {
        list: (): Promise<{ logs: OrderIssueLog[] }> => apiGet('/bi/logs/order-issue'),
        create: (data: Partial<OrderIssueLog>): Promise<{ log: OrderIssueLog }> => apiPost('/bi/logs/order-issue', data),
      },
      adTest: {
        list: (): Promise<{ logs: AdTestLog[] }> => apiGet('/bi/logs/ad-test'),
        create: (data: Partial<AdTestLog>): Promise<{ log: AdTestLog }> => apiPost('/bi/logs/ad-test', data),
      },
      creativeBrief: {
        list: (): Promise<{ logs: CreativeBrief[] }> => apiGet('/bi/logs/creative-brief'),
        create: (data: Partial<CreativeBrief>): Promise<{ log: CreativeBrief }> => apiPost('/bi/logs/creative-brief', data),
      },
      incident: {
        list: (): Promise<{ logs: IncidentLog[] }> => apiGet('/bi/logs/incident'),
        create: (data: Partial<IncidentLog>): Promise<{ log: IncidentLog }> => apiPost('/bi/logs/incident', data),
      },
      ipCheck: {
        list: (): Promise<{ logs: IpCheckResult[] }> => apiGet('/bi/logs/ip-check'),
        create: (data: Partial<IpCheckResult>): Promise<{ log: IpCheckResult }> => apiPost('/bi/logs/ip-check', data),
      },
    },
    sla: {
      breaches: (): Promise<{ breaches: SlaBreach[] }> => apiGet('/bi/sla/breaches'),
      dashboard: (days?: number): Promise<{ slaDashboard: SlaDashboard }> => apiGet(`/bi/sla/dashboard?days=${days ?? 30}`),
    },
  },

  // -----------------------------------------------------------------------
  // Finance
  // -----------------------------------------------------------------------
  finance: {
    disputes: {
      list: (): Promise<{ data: any[] }> => apiGet("/finance/disputes"),
      submitEvidence: (data: { disputeId: string, customerName: string, trackingNumber: string, carrier: string }): Promise<{ id: string, status: string }> => apiPost("/finance/disputes/evidence", data),
    },
    alerts: {
      list: (): Promise<{ alerts: FinanceAlert[] }> => apiGet('/finance/alerts'),
      check: (): Promise<{ alerts: FinanceAlert[] }> => apiPost('/finance/alerts/check', {}),
      acknowledge: (id: string): Promise<{ alert: FinanceAlert }> => apiPost(`/finance/alerts/${id}/acknowledge`, {}),
    },
  },

  // -----------------------------------------------------------------------
  // Support
  // -----------------------------------------------------------------------
  support: {
    tickets: {
      list: (): Promise<{ tickets: SupportTicket[] }> => apiGet('/support/tickets'),
      get: (id: string): Promise<{ ticket: SupportTicket }> => apiGet(`/support/tickets/${id}`),
      create: (data: Partial<SupportTicket>): Promise<{ ticket: SupportTicket }> => apiPost('/support/tickets', data),
      respond: (id: string, response: string): Promise<{ ticket: SupportTicket }> => apiPost(`/support/tickets/${id}/respond`, { response }),
      escalate: (id: string): Promise<{ ticket: SupportTicket }> => apiPost(`/support/tickets/${id}/escalate`, {}),
      resolve: (id: string): Promise<{ ticket: SupportTicket }> => apiPost(`/support/tickets/${id}/resolve`, {}),
    },
    macros: {
      list: (): Promise<{ macros: Macro[] }> => apiGet('/support/macros'),
      get: (key: string): Promise<{ macro: Macro }> => apiGet(`/support/macros/${encodeURIComponent(key)}`),
    },
    refunds: {
      list: (): Promise<{ refunds: RefundRequest[] }> => apiGet('/support/refunds'),
      get: (id: string): Promise<{ refund: RefundRequest }> => apiGet(`/support/refunds/${id}`),
      create: (data: { orderId: string; channel: string; amount: number; reason: string }): Promise<{ refund: RefundRequest }> => apiPost('/support/refunds', data),
      approve: (id: string): Promise<{ refund: RefundRequest }> => apiPost(`/support/refunds/${id}/approve`, {}),
      process: (id: string): Promise<{ refund: RefundRequest }> => apiPost(`/support/refunds/${id}/process`, {}),
    },
    slaBreaches: (): Promise<{ breaches: unknown[] }> => apiGet('/support/sla-breaches'),
  },

  // -----------------------------------------------------------------------
  // Listings (Etsy, Shopify, Amazon)
  // -----------------------------------------------------------------------
  listings: {
    etsy: {
      list: (): Promise<{ listings: EtsyListing[] }> => apiGet('/etsy/listings'),
      get: (id: string): Promise<{ listing: EtsyListing }> => apiGet(`/etsy/listings/${id}`),
      create: (data: { productId: string; title: string; price: number; description?: string; tags?: string }): Promise<{ listing: EtsyListing }> => apiPost('/etsy/listings', data),
      publish: (id: string): Promise<{ listing: EtsyListing }> => apiPost(`/etsy/listings/${id}/publish`, {}),
      optimization: (id: string): Promise<{ suggestions: unknown[] }> => apiGet(`/etsy/listings/${id}/optimization`),
    },
    shopify: {
      list: (): Promise<{ products: ShopifyProduct[] }> => apiGet('/shopify/products'),
      get: (id: string): Promise<{ product: ShopifyProduct }> => apiGet(`/shopify/products/${id}`),
      create: (data: { productId: string; title: string; price?: number }): Promise<{ product: ShopifyProduct }> => apiPost('/shopify/products', data),
      preAdsAudit: (id: string): Promise<{ audit: unknown }> => apiGet(`/shopify/products/${id}/pre-ads-audit`),
      croSuggestions: (id: string): Promise<{ suggestions: unknown[] }> => apiGet(`/shopify/products/${id}/cro-suggestions`),
    },
    amazon: {
      list: (): Promise<{ listings: AmazonListing[] }> => apiGet('/amazon/listings'),
      get: (id: string): Promise<{ listing: AmazonListing }> => apiGet(`/amazon/listings/${id}`),
      create: (data: { productId: string; title: string; price?: number }): Promise<{ listing: AmazonListing }> => apiPost('/amazon/listings', data),
      evaluateSelection: (data: { productId: string; price: number; cost: number }): Promise<{ evaluation: unknown }> => apiPost('/amazon/selection/evaluate', data),
      healthScore: (): Promise<{ health: unknown }> => apiGet('/amazon/health/score'),
    },
  },

  // -----------------------------------------------------------------------
  // Fulfillment
  // -----------------------------------------------------------------------
  fulfillment: {
    orders: {
      list: (): Promise<{ orders: FulfillmentOrder[] }> => apiGet('/fulfillment/orders'),
      get: (orderId: string): Promise<{ orders: FulfillmentOrder[] }> => apiGet(`/fulfillment/orders/${encodeURIComponent(orderId)}`),
      create: (data: { orderId: string; sku: string; quantity: number; vendorId?: string }): Promise<{ order: FulfillmentOrder }> => apiPost('/fulfillment/orders', data),
      startProduction: (id: string): Promise<{ order: FulfillmentOrder }> => apiPost(`/fulfillment/orders/${id}/production`, {}),
      completeProduction: (id: string, productionFileUrl: string): Promise<{ order: FulfillmentOrder }> => apiPost(`/fulfillment/orders/${id}/complete-production`, { productionFileUrl }),
      qualityCheck: (id: string, qcResult: string, notes?: string): Promise<{ order: FulfillmentOrder }> => apiPost(`/fulfillment/orders/${id}/quality-check`, { qcResult, notes }),
      ship: (id: string, trackingNumber: string, carrier: string): Promise<{ order: FulfillmentOrder }> => apiPost(`/fulfillment/orders/${id}/ship`, { trackingNumber, carrier }),
      deliver: (id: string): Promise<{ order: FulfillmentOrder }> => apiPost(`/fulfillment/orders/${id}/deliver`, {}),
      return: (id: string, reason?: string): Promise<{ order: FulfillmentOrder }> => apiPost(`/fulfillment/orders/${id}/return`, { reason }),
    },
    qcLogs: {
      list: (orderId: string): Promise<{ qcLogs: QcLog[] }> => apiGet(`/fulfillment/orders/${encodeURIComponent(orderId)}/qc-logs`),
      create: (data: { orderId: string; result: string; notes?: string; checkedBy?: string }): Promise<{ qcLog: QcLog }> => apiPost(`/fulfillment/orders/${data.orderId}/qc-log`, data),
    },
    vendorScorecards: {
      list: (vendorId: string): Promise<{ scores: VendorScorecard[] }> => apiGet(`/fulfillment/vendor-scorecard/${encodeURIComponent(vendorId)}`),
      create: (data: Record<string, unknown>): Promise<{ scorecard: VendorScorecard }> => apiPost('/fulfillment/vendor-scorecard', data),
      comparison: (): Promise<{ comparison: VendorScorecard[] }> => apiGet('/fulfillment/vendor-comparison'),
    },
  },

  // -----------------------------------------------------------------------
  // Conversations
  // -----------------------------------------------------------------------
  conversations: {
    list: (): Promise<{ conversations: Conversation[] }> => apiGet('/conversations'),
    create: (data: { title: string; skillId: string }): Promise<{ data: Conversation }> => apiPost('/conversations', data),
    delete: (id: string): Promise<{ success: boolean }> => fetch(`${BASE}/conversations/${id}`, { method: 'DELETE' }).then(res => res.json()),
    messages: {
      list: (id: string): Promise<{ data: Message[] }> => apiGet(`/conversations/${id}/messages`),
      create: (id: string, data: { userMessage?: string; assistantMessage?: string; agentId?: string }): Promise<{ success: boolean }> => apiPost(`/conversations/${id}/messages`, data),
    }
  }
}
