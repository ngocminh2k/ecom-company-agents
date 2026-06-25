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
