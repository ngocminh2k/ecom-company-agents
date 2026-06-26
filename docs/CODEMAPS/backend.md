<!-- Generated: 2026-06-26 | Files scanned: ~580 | Token estimate: ~600 -->

# Backend Architecture

## Daemon Entry
```
server.ts (100 lines) → app.ts (94 lines) → Express app factory
  ├─ Middleware: express.json, CORS (opt-in), context injection
  └─ 22 route mounts under /api/*
```

## Route → Service Mapping

| Prefix | Router | Service | Key Methods |
|--------|--------|---------|-------------|
| /api/health | health.ts | — | getStatus |
| /api/agents | agents.ts | AgentAdapterPool | list, getSkills, getDesigns |
| /api/products | products.ts | SQLite | list, create |
| /api/orders | orders.ts | SQLite | list |
| /api/ecommerce | ecommerce.ts | — | summary, pod, dropshipping, marketing |
| /api/etsy/listings | etsy.ts | EtsyListingService | list, create, publish, update |
| /api/shopify | shopify.ts | ShopifyService | list, create, validate, preAdsAudit, croSuggest |
| /api/amazon | amazon.ts | AmazonListingService + AmazonAccountHealthService + AmazonAdsService | list, validate, create, campaign CRUD |
| /api/fulfillment | fulfillment.ts | FulfillmentService + QCService + VendorService | create, advanceQC, scorecard |
| /api/finance | finance.ts | ReconciliationService + PnLService + AlertService | reconcile, pnlBySku, checkAlerts |
| /api/product-research | product-research.ts | ResearchSheetService + CompetitorAnalysisService + IpCheckService | sheets CRUD, score, competitors, ipCheck |
| /api/support | support.ts | TicketService + RefundService + EscalationService | tickets CRUD, refunds, escalation, macros |
| /api/orchestration | orchestration.ts | LaunchOrchestrator + ChecklistService + LifecycleStateService | start, advance, checklist, checkpoints, readiness |
| /api/bi | bi.ts | DashboardService + BiLogsService + SlaMonitorService | company dashboard, 7 log types, SLA |

## Orchestration Routes (P0)
```
POST  /api/orchestration/              → startLaunch({ product_id })
GET   /api/orchestration/              → list all orchestrations
GET   /api/orchestration/:id           → get by ID
POST  /api/orchestration/:id/advance   → advanceStage (auto nextStage)
POST  /api/orchestration/:id/complete  → completeStage
POST  /api/orchestration/:id/block     → setBlocked(reason)
POST  /api/orchestration/:id/flags     → updateLaunchFlags
GET   /api/orchestration/:id/readiness → { ready, checks[] }
GET   /api/orchestration/:id/checklist → items[]
POST  /api/orchestration/:id/checklist/init
POST  /api/orchestration/:id/checklist/:itemId/complete
GET   /api/orchestration/:id/checklist/blocked
POST  /api/orchestration/:id/checkpoints → recordCheckpoint
GET   /api/orchestration/:id/checkpoints
```

## E-Commerce Core Modules
```
orchestration/  LaunchOrchestrator, LaunchChecklistService, LifecycleStateService
channels/       Etsy, Shopify, Amazon (entities + services + state machines)
fulfillment/    FulfillmentService, QualityCheckService, VendorScorecardService
finance/        ReconciliationService, PnLService, FinanceAlertService
product/        ResearchSheetEntity, ProductScoringService, CompetitorAnalysisService, IpCheckService
support/        TicketService, RefundService, MacroLibrary, EscalationService
bi/             DashboardService, BiLogsService, SlaMonitorService
```

## Migrations (12 total)
```
001_initial → projects, conversations, messages, skills, plugins
002_ecommerce → products, orders, campaigns, suppliers, customers
003_sop_forms → research sheets, creative briefs, ad_test_logs, refunds, IP checks, incidents
004_shopify_columns → price, compare_at_price, sku, inventory
005-007_amazon → listing columns, account health, campaigns
008_support → ticket columns, responses, refunds
009_fulfillment → fulfillment_orders, QC FK
010_finance → pnl_by_sku, finance_alerts, reconciliation columns
011_product_research_ip → competitor_entries, ip_blacklist
012_phases_9_10 → launch_orchestrations + indexes
```
