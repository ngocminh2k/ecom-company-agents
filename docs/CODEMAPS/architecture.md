<!-- Generated: 2026-06-26 | Files scanned: ~550 | Token estimate: ~900 -->

# ECC OmniStudio Architecture

## System Diagram
```
Web App (Next.js 16) ──HTTP──▶ Daemon (Express:7456) ──spawn──▶ CLI Agents
                                    │                              (Claude Code, Codex)
                                SQLite ◀── 30+ REST ────▶ Agent Router
                                routes                             │
                                    │                         Routing Matrix
                            ┌───────┴───────┐               (11 rules A2A)
                            │               │
                    Business Entities    Agent Tasks
                    (pure code)          (creative only)
```

## Source Map (Monorepo)
```
apps/
  daemon/     Express 5 + SQLite, 30+ REST routes, MCP server
  web/        Next.js 16, React 19, Tailwind 4

packages/
  agent-adapter/   AgentAdapter interface, pool, routing matrix, AgentRouterService
  mcp-server/      stdio MCP protocol server
  skill-system/    SKILL.md parser + executor
  plugin-system/   Plugin manifest + pipeline
  design-system/   DESIGN.md 9-section parser + tokens
  ecommerce-core/  Business entities, state machines, channels, fulfillment, finance, support, BI
  contracts/       Shared TypeScript types
  cli/             CLI entry point

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
```

## Route Inventory (30+)
```
/api/health, /api/agents, /api/skills, /api/plugins, /api/design-systems
/api/products, /api/orders, /api/campaigns, /api/suppliers
/api/ecommerce (pod, dropshipping, marketing, analytics)
/api/etsy, /api/shopify, /api/amazon
/api/fulfillment, /api/finance
/api/product-research, /api/support
/api/orchestration, /api/bi
```
