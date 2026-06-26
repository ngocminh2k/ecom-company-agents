<!-- Generated: 2026-06-26 | Files scanned: ~620 | Token estimate: ~700 -->

# Backend Architecture

## Entry
```
server.ts (102) → app.ts (98) → Express app
  ├─ middleware: express.json(10mb), CORS (ENABLED), context→req
  └─ 22 route mounts under /api/*
```

## Route → Service Mapping

| Prefix | File | Service | Lines |
|--------|------|---------|-------|
| /api/health | health.ts | — | 12 |
| /api/agents | agents.ts | AgentAdapterPool + scanAgentPersonalities | 93 |
| /api/skills | skills.ts | scanSkillsDir + SkillExecutor | 160 |
| /api/products | products.ts | SQLite | 72 |
| /api/orders | orders.ts | SQLite + OrderSplitValidationService | 59 |
| /api/ecommerce | ecommerce.ts | PodProductDesigner + ResearchService + AnalyticsService + CampaignCreator + AdCreativeGenService | 153 |
| /api/etsy/listings | etsy.ts | EtsyListingService | 187 |
| /api/shopify | shopify.ts | ShopifyService + CroService + EmailFlows | 142 |
| /api/amazon/* | **rout... | AmazonListingService + SelectionService + HealthService + AdsService | * |
| /api/fulfillment | fulfillment.ts | FulfillmentService + QCService + VendorScorecardService | 477 |
| /api/support | support.ts | TicketService + RefundService + EscalationService | 482 |
| /api/finance | finance.ts | ReconciliationService + PnLService + AlertService | 425 |
| /api/product-research | product-research.ts | ResearchSheetService + CompetitorService + IpCheckService | 418 |
| /api/orchestration | orchestration.ts | LaunchOrchestrator + ChecklistService + LifecycleStateService | 471 |
| /api/bi | bi.ts | DashboardService + BiLogsService + SlaMonitorService | 841 |
| /api/chat | chat.ts | AgentRouterService.routeTaskStream (SSE) | 63 |
| /api/proxy | proxy.ts | fetch → LLM API (6 providers + SSRF guard) | 137 |

\* `/api/amazon` split into: `routes/amazon/listings.ts` (72), `health.ts` (36), `ads.ts` (52), `storage.ts` (67), `health-storage.ts` (48), `ads-storage.ts` (77), `index.ts` (12)

## New Routes (post-refactor)
```
GET  /api/chat?skill=&message= → SSE stream of agent response
POST /api/proxy/{anthropic,openai,google,azure,ollama}/stream → BYOK LLM proxy
```

## Agent Dispatch Flow
```
/api/skills/:id/execute → scanSkillsDir → find skill → 
  AgentRouterService.routeTask(taskType, inputs) →
    RoutingMatrix.findSpecialists → AgentAdapterPool.resolveForTask →
      ClaudeCodeAdapter.run(params) → spawn(claude, ..., {cwd}) →
        SKILL.md read by Claude → structured output → JSON response

/api/chat → AgentRouterService.routeTaskStream → SSE events →
  { type: "thinking" | "text_delta" | "done" | "error" }
```

## Split Status
```
✅ Amazon: 663 → 6 files (routes/amazon/*)
⏸️ BI (841), Fulfillment (477): still flat — need storage interface cleanup
