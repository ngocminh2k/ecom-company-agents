<!-- Generated: 2026-06-26 | Files scanned: ~580 | Token estimate: ~950 -->

# AgentPulse Commerce Architecture

## System Diagram
```
Web App (Next.js 16) ──HTTP──▶ Daemon (Express:7456) ──spawn──▶ CLI Agents
         │                              │                        (Claude Code, Codex)
    Dashboard ─────┐                SQLite ◀── 35+ REST ──▶ Agent Router
    Research ──────┤                routes                        │
    Launch ────────┤                    │                    Routing Matrix
    BI ────────────┤            ┌───────┴───────┐          (11 rules A2A)
    Orders ────────┤            │               │
    Products ──────┘    Business Entities    Agent Tasks
                        (pure code)          (creative only)
```

## Source Map (Monorepo)
```
apps/
  daemon/     Express 5 + SQLite, 35+ REST routes, MCP server
  web/        Next.js 16, React 19, Tailwind 4, 11 pages

packages/
  agent-adapter/   AgentAdapter interface, pool, routing matrix, AgentRouterService
  mcp-server/      stdio MCP protocol server
  skill-system/    SKILL.md parser + executor
  plugin-system/   Plugin manifest + pipeline
  design-system/   DESIGN.md 9-section parser + tokens
  ecommerce-core/  Business entities, state machines, channels, fulfillment, finance, support, BI, launch orchestration
  contracts/       Shared TypeScript types
  cli/             CLI entry point
  ui/              Shared UI components

skills/            SKILL.md files (30+)
design-systems/    DESIGN.md brand files (5)
plugins/           Plugin marketplace
agents/            230+ agent personalities (18 divisions)
docs/              Architecture, adapters, skills, design, plugins
```

## Data Flow
```
HTTP → Express Route → validation → entity → state machine → SQLite → response
HTTP → Express Route → TaskRunner → AgentRouter → ClaudeCode → structured JSON → response
Web Page → api.ts fetch → Next.js proxy → daemon route → SQLite → JSON → React state
```

## Route Inventory (35+)
```
/api/health, /api/agents, /api/skills, /api/plugins, /api/design-systems
/api/products, /api/orders, /api/campaigns, /api/suppliers
/api/ecommerce (pod, dropshipping, marketing, analytics)
/api/etsy (listings, disputes), /api/shopify (products, CRO, email), /api/amazon (listings, ads, account health)
/api/fulfillment (orders, QC, vendors), /api/finance (reconciliation, PnL, alerts)
/api/product-research (sheets, competitors, IP check), /api/support (tickets, refunds, escalation, macros)
/api/orchestration (launch pipeline, checklist, checkpoints, readiness)
/api/bi (dashboard, logs, SLA, alerts)
```

## Frontend Pages (11)
```
/ → Home (dashboard summary)
/dashboard → KPI grid + alert feed + SLA chart
/products → Product CRUD table
/orders → Order listing + status badges
/research → Research sheets list
/research/new → Create sheet form
/research/[id] → Sheet detail + score + approve
/research/[id]/competitors → Competitor entries
/research/[id]/ip-check → IP check results
/launch → Pipeline view (5-stage kanban)
/launch/[id] → Detail + stage bar + readiness + actions
/launch/[id]/checklist → 17-item launch checklist
/launch/[id]/checkpoints → Lifecycle checkpoint records
/bi/alerts → Alert feed + SLA dashboard
/bi/logs → Log hub (7 types)
/bi/logs/[type] → Type-specific log listing
/agents → Agent personality list
/workspace → Agent workspace
```

## Web Component Tree
```
Layout → Sidebar + DaemonBanner
  ├─ Home: KpiCard grid, AlertFeed
  ├─ Research: Table → Badge → Pagination
  ├─ Launch: Card → Badge → StageBar
  ├─ BI: AlertFeed, logs hub
  ├─ Products: Table → Skeleton → EmptyState → ErrorState
  ├─ Orders: Table → Pagination
  └─ Shared: Button, Input, Select, SearchInput, Modal, Toast
```

## Key ADRs (see DECISIONS.md)
- ADR-015: Business logic = pure code, no agent fallback in production
- ADR-016: 11-phase delivery (domain → channels → fulfillment → finance → research → support → launch → BI → agents)
- ADR-017: User Experience Review Agent — end-user test before merge
- ADR-029: Fulfillment + QC state machines
- ADR-030: Finance reconciliation + PnL by SKU
- ADR-031: Product Research + IP scoring
- ADR-032: Customer Support SLA + escalation
