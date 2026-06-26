<!-- Generated: 2026-06-26 | Files scanned: ~620 | Token estimate: ~1000 -->

# AgentPulse Commerce Architecture

## System Diagram
```
Web App (Next.js 16) ──HTTP──▶ Daemon (Express:7456) ──spawn──▶ CLI Agents
         │                              │                        (Claude Code)
    Dashboard ─────┐               SQLite ◀── 37+ REST ──▶ Agent Router
    Research ──────┤               routes                        │
    Launch ────────┤                   │                    Routing Matrix
    BI ────────────┤           ┌───────┴───────┐          (11 rules A2A)
    Orders ────────┤           │               │
    Fulfillment ───┤   Business Entities   Agent Tasks
    Support ───────┤   (pure code)         (creative only)
    Finance ───────┤
    Listings ──────┤
    Skills ────────┘
```

## Source Map (Monorepo)
```
apps/
  daemon/     Express 5 + SQLite, 37+ REST, BYOK proxy, Chat SSE
              24 route files (19 flat + 5 split under routes/amazon/)
  web/        Next.js 16, React 19, Tailwind 4, 25 pages

packages/
  agent-adapter/   AgentAdapter, pool, routing matrix (946 LOC)
  mcp-server/      stdio MCP protocol server
  skill-system/    SKILL.md parser + executor (349 LOC)
  plugin-system/   Plugin manifest + pipeline
  design-system/   DESIGN.md parser + tokens
  ecommerce-core/  Business logic — 54 files across 12 domains
  contracts/       Shared types
  cli/             CLI entry point
  ui/              Shared UI components

skills/            13 SKILL.md files (amazon, analytics, dropshipping, etsy, etc.)
agents/            238 agent personalities (18 divisions)
docs/              CODEMAPS + plan + SOP
```

## Data Flow
```
HTTP → Express Route → validation → ecommerce-core service → SQLite → JSON
HTTP → Express Route → AgentRouterService → ClaudeCodeAdapter → real CLI → JSON
SSE  → /api/chat → AgentRouterService → routeTaskStream → text/event-stream
POST → /api/proxy/{provider}/stream → fetch(LLM API) → SSE response
Web Page → api.ts fetch → Next.js rewrite (/api/*) → daemon:7456/api/*
```

## Routes (37+)
```
/api/health, /api/agents, /api/skills, /api/plugins, /api/design-systems
/api/products, /api/orders, /api/campaigns, /api/ecommerce
/api/etsy (listings), /api/shopify (products + CRO + email)
/api/amazon (selection + listings + health + ads) — split into 4 files
/api/fulfillment (orders + QC), /api/quality-check, /api/vendors
/api/finance (reconciliation + PnL + alerts)
/api/product-research (sheets + competitors + IP check)
/api/support (tickets + refunds + macros + SLA)
/api/orchestration (launch + checklist + checkpoints)
/api/bi (company + channel + logs + SLA)
/api/chat (SSE agent streaming) — NEW
/api/proxy/{provider}/stream (BYOK, 6 providers) — NEW
```

## Key ADRs (see DECISIONS.md)
- ADR-015: Business logic = pure code (ecommerce-core), no agent fallback
- ADR-016: 11-phase delivery (all phases complete)
- ADR-029→032: Fulfillment, Finance, Research, Support — all live
