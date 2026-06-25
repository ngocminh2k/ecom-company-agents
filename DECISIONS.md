# ECC OmniStudio — Architectural Decisions

## Stack Decisions
- **Runtime:** Node.js 22+, TypeScript (ESM)
- **Package manager:** pnpm workspace (monorepo)
- **Backend framework:** Express 5
- **Database:** SQLite via better-sqlite3 (local-first, zero config)
- **Frontend:** Next.js 16 App Router (Phase 6)
- **Protocol:** MCP stdio server for agent connectivity

## Architecture Decisions

### ADR-001: Agent Adapter Pool pattern
Instead of building our own agent loop, delegate to existing CLI agents.
Each CLI gets an adapter implementing AgentAdapter interface.
- detect() -> PATH lookup
- run() -> spawn subprocess, return AsyncIterable<AgentEvent>
- cancel() -> SIGTERM
- Status: **ACCEPTED**

### ADR-002: Agent-to-Agent Routing Matrix
Agents can delegate tasks to other specialized agents via RoutingMatrix.
- Resolved by source agent + task type
- Priority-based rule matching
- CoAgentMessage protocol for inter-agent communication
- Status: **ACCEPTED**

### ADR-003: Skill format = Claude Code compatible SKILL.md
Follow the open standard from Anthropic + extended with ecc: frontmatter.
Skills auto-discovered from 3 locations: ~/.claude/skills/, ./skills/, ./.claude/skills/
- Status: **ACCEPTED**

### ADR-004: Plugin system = Open Design compatible
Plugin = SKILL.md + open-design.json manifest + pipeline stages.
Trust model: official=trusted, third-party=restricted
Install sources: local, GitHub, HTTPS, registry
- Status: **ACCEPTED**

### ADR-005: Design System = 9-section DESIGN.md
Follow Open Design format: visual theme, color, typography, spacing, layout, components, motion, voice, anti-patterns.
- Status: **ACCEPTED**

### ADR-006: Local-first security
Daemon binds to 127.0.0.1 by default.
SSRF guard on proxy endpoints.
CORS off by default, requires explicit opt-in.
- Status: **ACCEPTED**

### ADR-007: BYOK for LLM access
Support BYOK proxy for any OpenAI-compatible endpoint + Anthropic + Google.
No mandatory subscription to any service.
- Status: **ACCEPTED**

### ADR-008: E-commerce data model
Products (pod/dropshipping/digital), Orders, Campaigns, Suppliers as core entities.
SQLite schema with status workflows for each entity.
- Status: **ACCEPTED**

### ADR-009: Agent personalities from The Agency
Import 232 agents from msitarzewski/agency-agents.
Add 10+ e-commerce specialist agents (POD Designer, Dropship Researcher, Ad Optimizer, etc.)
- Status: **ACCEPTED**

### ADR-010: Skills from Awesome Claude Skills + awesomeskill.ai
Adapt SKILL.md format from ComposioHQ/awesome-claude-skills.
Build 30+ e-commerce specific skills for POD, dropshipping, marketing, SEO.
- Status: **ACCEPTED**

### ADR-011: Multi-agent orchestration = CoAgent protocol
Agents communicate via CoAgentMessage (request/response/broadcast).
RoutingMatrix decides which agent handles which task type.
No central orchestrator — agents discover each other via the matrix.
- Status: **ACCEPTED**

### ADR-012: Monorepo package breakdown
apps/daemon, apps/web, packages/agent-adapter, packages/mcp-server, packages/skill-system, packages/plugin-system, packages/design-system, packages/ecommerce-core, packages/contracts, packages/cli
- Status: **ACCEPTED**

### ADR-013: Phase delivery order
Phase 1: Foundation (daemon + agent adapter pool + MCP) -> 1-2 weeks
Phase 2: Skill + Plugin system -> 1-2 weeks
Phase 3: Design System -> 1 week
Phase 4: Agent Personalities -> 1-2 weeks
Phase 5: E-commerce Domain -> 2 weeks
Phase 6: Frontend -> 2 weeks
Phase 7: Polish & Docs -> 1 week
- Status: **ACCEPTED**

### ADR-014: File naming convention
TypeScript files use kebab-case for utilities, PascalCase for classes/components.
Routes follow RESTful naming (products.ts, orders.ts, etc.)
- Status: **ACCEPTED**

### ADR-015: Real Business Logic > Agent Fallback
Mọi business logic CRUD, state machine, validation, calculation đều là CODE THUẦN.
Agent (Claude Code) CHỈ dùng cho creative/analytical tasks (research, copywriting, design).
KHÔNG có mock fallback trong production — agent fail → error response.
Mock chỉ dùng trong dev mode (NODE_ENV=development).
- Status: **ACCEPTED**

### ADR-016: Phases triển khai theo SOP
Phase 1: Domain Layer + Core Entities (state machines, validations, migrations)
Phase 2: Etsy Channel (listing, optimization, case handling)
Phase 3: Shopify Channel (product page, CRO, email flows)
Phase 4: Amazon Channel (listing, account health, ads)
Phase 5: Fulfillment + QC (production pipeline, vendor scorecard)
Phase 6: Finance (reconciliation, PnL by SKU, alerts)
Phase 7: Product Research + IP (scoring, competitor analysis)
Phase 8: Customer Support (ticket, macros, escalation)
Phase 9: Product Launch Orchestration (5-stage pipeline)
Phase 10: Dashboard + BI (logs, metrics, SLA monitoring)
Phase 11: Agent Personalities + Skills (Etsy, Amazon, Fulfillment, Finance specialists)
- Status: **ACCEPTED**

### ADR-017: User Experience Review Agent
Mỗi phase hoàn thành sẽ có 1 agent riêng đóng vai người dùng cuối (end-user reviewer)
để test trải nghiệm thực tế, đưa ra đánh giá và phát hiện vấn đề trước khi merge.
- Status: **ACCEPTED**

### ADR-018: Etsy Listing Validation Rules
- Title: 20-140 chars, có capitalized words, không all-caps, không keyword stuffing
- Tags: max 13, không trùng lặp, phải có category tags
- Price: >= $0.50, phải có margin dương sau fees
- Processing time: 1-30 ngày, phải thực tế với năng lực fulfillment
- Images: cần ảnh chính + ảnh personalization + ảnh kích thước + ảnh chất liệu
- Status: **ACCEPTED**

### ADR-019: Shopify Product Validation Rules
- Title: rõ lợi ích + dịp + đối tượng, có SEO optimization
- Description: cấu trúc problem→solution→highlights→specs→shipping→guarantee
- Images: main + detail + lifestyle + personalization + size guide
- Variants: SKU bắt buộc, price phải nhất quán
- Pre-ads checklist: 10 items (mobile speed, trust elements, pixel tracking, etc.)
- Status: **ACCEPTED**

### ADR-020: Amazon Listing Validation Rules
- Chỉ đưa lên Amazon khi đã bán tốt trên Etsy/Shopify
- Margin sau Amazon fees (referral 15% + fulfillment) >= 20%
- Bullet points: benefit-driven, mỗi bullet một lợi ích chính
- Account health check: ODR < 1%, cancellation < 2.5%, late shipment < 4%
- Status: **ACCEPTED**

### ADR-021: Amazon Channel Architecture
- Amazon entity types defined in `packages/ecommerce-core/src/channels/amazon/amazon-entity.ts`
- Four services: Selection, Listing, Account Health, Ads — all pure business logic, no agent calls
- REST routes in `apps/daemon/src/routes/amazon.ts` under `/api/amazon/`
- Amazon Specialist agent at `agents/ecommerce-specialized/amazon-specialist.md`
- Amazon Listing Optimization skill at `skills/amazon/amazon-listing/SKILL.md`
- State machine: listing `draft -> active -> blocked -> removed`
- Campaign types: sponsored_products, sponsored_brands, sponsored_display
- Targeting types: auto, manual, auto_plus_manual
- Account health score 0-100 with weighted breakdown (ODR 35%, Cancellation 25%, Late Shipment 25%, Valid Tracking 15%)
- Status: **ACCEPTED**

### ADR-022: Etsy Channel Architecture
- Etsy listing entity with real validation rules in `packages/ecommerce-core/src/channels/etsy/etsy-entity.ts`
  - Title: 20-140 chars, capitalized words, no all-caps, no keyword stuffing
  - Tags: max 13, no duplicates, max 20 chars each
  - Price: >= $0.50, positive margin after Etsy 6.5% fee
  - Description: must contain material, size, personalization, shipping, return policy
- Pre-publish checklist (10 SOP checks) in `packages/ecommerce-core/src/channels/etsy/etsy-checklist.ts`
- Listing service with CRUD + publish workflow in `packages/ecommerce-core/src/channels/etsy/etsy-listing-service.ts`
- REST routes in `apps/daemon/src/routes/etsy.ts` under `/api/etsy/listings/`
- Etsy Specialist agent at `agents/ecommerce-specialized/etsy-specialist.md`
- Etsy SEO Copywriter skill at `skills/etsy/etsy-copywriter/SKILL.md`
- State machine: listing `draft -> pending_review -> published -> optimizing -> paused -> removed`
- Service uses EtsyListingStorage interface to stay DB-agnostic; routes provide SQLite adapter
- Status: **ACCEPTED**

### ADR-023: Shopify Channel Architecture
- Shopify product entity with validation rules (ADR-019) in `packages/ecommerce-core/src/channels/shopify/shopify-entity.ts`
  - Title: 20-140 chars, clear benefit + occasion + audience, SEO optimized
  - Description: structure problem->solution->highlights->personalization->specs->shipping->guarantee
  - Pre-ads checklist: 10 items (mobile speed, clear image, price, CTA, trust, policies, cart recovery, pixels, payment, test order)
  - CRO suggestions: data-driven rules engine (pricing, SEO, content, urgency, inventory)
- ShopifyService with CRUD + validation + pre-ads audit + CRO suggestions in `shopify-service.ts`
- CroService with hypothesis tracking in `cro-service.ts`
- Email flow templates in `email-flows.ts` (welcome, abandoned cart, post-purchase, winback, seasonal)
- REST routes in `apps/daemon/src/routes/shopify.ts` under `/api/shopify/`
- Migration 004 adds price, compare_at_price, sku, inventory_qty, is_personalized, personalization_fields columns
- Shopify Specialist agent at `agents/ecommerce-specialized/shopify-specialist.md`
- Shopify Email Marketing skill at `skills/shopify/email-marketing/SKILL.md`
- Status: **ACCEPTED**

### ADR-024: Fix — Amazon services use SQLite storage via interfaces
- AmazonListingService, AmazonAccountHealthService, AmazonAdsService changed to use storage interfaces (AmazonListingStorage, AccountHealthStorage, AmazonAdsStorage) instead of in-memory Maps/arrays
- Routes provide SQLite adapters in `apps/daemon/src/routes/amazon.ts` following the same pattern as Etsy
- New migrations 005-007 add missing columns and tables
- AmazonSelectionService remains ephemeral/in-memory since it's scoped to a request session (evaluate-only, no CRUD persistence needed)
- Status: **ACCEPTED**

### ADR-025: Fix — Shopify createProduct uses passed productId
- `ShopifyProductCreateInput.productId` added as optional field
- `createProduct()` uses `input.productId ?? randomUUID()` instead of always generating a new UUID
- Status: **ACCEPTED**

### ADR-026: Fix — Amazon validateSelection defaults cost/shippingCost to 0
- `validateAmazonSelection()` failed with `price - undefined - undefined - totalFees` producing NaN margin
- Fixed with `const cost = product.cost ?? 0; const shippingCost = product.shippingCost ?? 0` at the top of the function
- Status: **ACCEPTED**

### ADR-027: Fix — Etsy entity state machine + update validation
- Added `ETSY_STATUS_TRANSITIONS` state machine map and `isValidEtsyStatusTransition()` helper to `etsy-entity.ts`
- Added optional `status` field to `EtsyListingUpdateInput`
- `etsy-listing-service.ts` updateListing validates status transitions before applying changes, throws ValidationError on illegal transitions
- State machine: draft -> pending_review <-> published <-> optimizing, paused, removed (one-way to removed)
- Status: **ACCEPTED**

### ADR-028: Fix — Floating point precision in dropshipping
- Mock product prices in `ProductResearchService.research()` now use `Math.round(value * 100) / 100` for consistent 2-decimal precision
- Status: **ACCEPTED**

### ADR-029: Fulfillment + QC Architecture (Phase 5)
- Fulfillment service with explicit state machine: pending_review -> in_production -> quality_check -> packing -> shipped -> delivered -> returned
- QC service with 8-step checklist (SKU, personalization, color/size, surface, packaging, photo, result, log)
- Vendor scorecard service with 8 weighted criteria and monthly period scoring
- All services use storage interfaces for DB agnosticism; routes provide SQLite adapters
- `fulfillment_orders` table in migration 009 with status CHECK constraint
- Routes mounted at `/api/fulfillment/` with sub-paths for orders, QC logs, and vendor scorecards
- Fulfillment Coordinator agent at `agents/ecommerce-specialized/fulfillment-coordinator.md`
- Quality Control skill at `skills/fulfillment/quality-control/SKILL.md` with 8-step SOP checklist
- Status: **ACCEPTED**

### ADR-030: Finance Architecture (Phase 6)
- Three finance services in `packages/ecommerce-core/src/finance/`:
  - ReconciliationService: 8-step daily reconciliation per SOP 17.2, records revenue/fees/ad spend/refunds, generates summaries with per-channel breakdowns, flags CPA spikes (>$15 target), refund rate anomalies (>5%), and negative net revenue
  - PnLService: 9-step PnL by SKU calculation per SOP 17.3, classifies products as scale (margin >=40%, units >=100), keep (margin >=20%), optimize (margin >=0%), stop (margin <0%)
  - FinanceAlertService: monitors reconciliation data, creates alerts with severity levels (low/medium/high/critical), acknowledgment workflow
- All services use storage interfaces for DB agnosticism; routes provide SQLite adapters
- Migration 010 adds orders_count/refund_count columns to daily_reconciliation, pnl_by_sku table, and finance_alerts table
- Routes mounted at `/api/finance/` with sub-paths for reconciliation, PnL, and alerts
- Finance Admin agent at `agents/ecommerce-specialized/finance-admin.md`
- Daily Reconciliation skill at `skills/finance/daily-reconciliation/SKILL.md`
- Pure business logic, no agent calls, no mock data
- Status: **ACCEPTED**

### ADR-031: Product Research + IP Architecture (Phase 7)
- Four modules in `packages/ecommerce-core/src/product/`:
  - `research-sheet-entity.ts`: ProductResearchSheet interface (18-field SOP Section 24 form), validateResearchSheet(), calculateScore(), isValidResearchTransition() state machine for draft -> in_review -> approved/rejected
  - `product-scoring-service.ts`: 7-criteria scoring per SOP Section 6.4 (Search Demand 20pts, Content Potential 15pts, Profit Margin 20pts, Fulfillment Ease 15pts, Low IP Risk 15pts, Variation Potential 10pts, Season Fit 5pts), each criterion has its own pure function; calculateTotalScore() aggregates into 0-100
  - `competitor-analysis-service.ts`: CompetitorEntry and CompetitorAnalysisReport interfaces, CompetitorAnalysisService with recordCompetitor()/getCompetitors()/generateReport() (aggregates avg price, avg rating, price range, top keywords from key messages, opportunities/threats derived from market data)
  - `ip-check-service.ts`: Sop Section 19.2 6-step IP check, IpCheckService with checkProduct() (runs trademark/copyright/character risk checks against blacklist), addToBlacklist()/isBlacklisted()/getCheckHistory(); IpBlacklistEntry with brand/character/sports_team/university/movie/song/quote/celebrity types
- All services use storage interfaces (CompetitorStorage, IpCheckStorage) for DB agnosticism; routes provide SQLite adapters
- Migration 011 adds competitor_entries and ip_blacklist tables (ip_check_logs already existed in migration 003)
- product/index.ts barrel export replaces product/entity.js direct export
- Routes mounted at `/api/product-research/` with 10 endpoints (sheets CRUD, scoring, approval, competitors, IP check, IP blacklist)
- Product Researcher agent at `agents/ecommerce-specialized/product-researcher.md` (enhanced SOP Section 6 specialist)
- IP Check skill at `skills/product/ip-check/SKILL.md` with 6-step SOP workflow
- Pure business logic, no agent calls, no mock data
- Status: **ACCEPTED**

### ADR-032: Customer Support Architecture (Phase 8)
- Four support modules in `packages/ecommerce-core/src/support/`:
  - `ticket-service.ts`: SupportTicket lifecycle per SOP 14.3 (10-step message handling), TicketService with create/respond/escalate/resolve operations, SLA deadline calculation (4h for refund/chargeback/complaint, 12h for others), SLA breach detection
  - `refund-service.ts`: RefundRequest lifecycle per SOP 14.4 (8-step refund process) and SOP 27 (Refund Return Log form), role-based approval thresholds (agent $20/50%, team lead $50/100%, manager $200/200%, director unlimited), prevention lesson logging
  - `macro-library.ts`: 4 English macros matching SOP 14.5 (tracking delays, personalization error, pre-production cancel, refund initiated), getMacroByType/getMacroByKey/personalizeMacro functions for template personalization
  - `escalation-service.ts`: EscalationRule interface, shouldEscalate() determines when chargeback/amount-exceeding-authority triggers escalation, getEscalationLevel() maps amount to role
- All services use storage interfaces (TicketStorage, RefundStorage) for DB agnosticism; routes provide SQLite adapters
- Migration 008 adds columns to support_tickets (customer_email, customer_name, first_response_at, resolved_at), creates ticket_responses table, and recreates refund_logs with expanded CHECK constraint (pending_approval/approved/processed/disputed/closed)
- Routes mounted at `/api/support/` with 12 endpoints for tickets CRUD, macros, refunds, and SLA breaches
- Customer Support agent updated with SOP Section 14 tone, macros, escalation process, API endpoints
- Pure business logic, no agent calls, no mock data
- Status: **ACCEPTED**
