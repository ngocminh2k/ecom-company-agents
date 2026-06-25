# ECC OmniStudio

AI Agent Harness + E-Commerce Platform for POD (Print on Demand) and Dropshipping.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-6.0-blue)

Inspired by:
- [Open Design](https://github.com/nexu-io/open-design) — agent adapter pool, MCP server, skill/plugin architecture
- [The Agency](https://github.com/msitarzewski/agency-agents) — agent personalities (232 specialists)
- [Awesome Claude Skills](https://github.com/ComposioHQ/awesome-claude-skills) — 1000+ skills format

## Features

- **Agent Harness** — works with Claude Code, Codex, Cursor, Copilot, Gemini, and 17+ CLI agents
- **230 Agent Personalities** — 18 divisions: engineering, design, marketing, sales, support, security, and 10 e-commerce specialists
- **30+ E-Commerce Skills** — POD design, dropshipping research, ad creative, SEO, analytics
- **5 Design Systems** — Shopify Minimal, Printful Modern, Etsy Vintage, Brand Minimal, Amazon Professional
- **Plugin Pipeline** — multi-stage workflows with critique/repeat loops
- **Agent-to-Agent Routing** — agents can delegate tasks to specialists
- **BYOK Proxy** — bring your own API keys for LLM access
- **Local-First** — 127.0.0.1 only, CORS off by default, SSRF guarded

## Quick Start

```bash
# Clone & install
git clone https://github.com/ngocminh2k/ecom-company-agents.git
cd ecom-company-agents
pnpm install

# Build all packages
pnpm -r build

# Start the daemon
pnpm --filter @ecc/daemon dev
```

The daemon starts on **http://127.0.0.1:7456**.

### Start the Frontend

```bash
# In another terminal
pnpm --filter @ecc/web dev
```

The web app starts on **http://localhost:3000**.

## API Endpoints

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Health | `GET /api/health` | Daemon status |
| Agents | `GET /api/agents` | List adapters + personalities |
| Skills | `GET /api/skills` | List installed skills |
| Design | `GET /api/design-systems` | List design systems |
| POD | `POST /api/ecommerce/pod/design` | Design POD products |
| Research | `POST /api/ecommerce/dropshipping/research` | Research products |
| Marketing | `POST /api/ecommerce/marketing/campaigns/plan` | Plan campaigns |
| Analytics | `GET /api/ecommerce/analytics/report` | Sales report |
| Products | `GET /api/products` | Product CRUD |
| Orders | `GET /api/orders` | Order management |

## Project Structure

```
apps/
  daemon/     Express + SQLite daemon (30+ REST routes)
  web/        Next.js 16 App Router frontend

packages/
  agent-adapter/   Agent interface + pool + routing matrix (CoAgent)
  mcp-server/      MCP stdio protocol server
  skill-system/    SKILL.md parser + executor
  plugin-system/   Plugin manifest + pipeline
  design-system/   DESIGN.md 9-section parser + tokens CSS
  ecommerce-core/  POD, dropshipping, marketing, analytics services
  contracts/       Shared TypeScript types
  cli/             CLI entry point

skills/            SKILL.md files (5 built-in)
design-systems/    DESIGN.md brand files (5 built-in)
plugins/           Plugin marketplace
agents/            230 agent personalities (18 divisions)
docs/              Architecture, adapters, skills, plugins spec
```

## Agent Personalities

| Division | Count | Examples |
|----------|-------|---------|
| Engineering | 33 | Backend Architect, DevOps, AI Engineer |
| Marketing | 36 | Content Creator, Social Media Specialists |
| E-Commerce | 10 | POD Designer, Dropship Researcher, Ad Optimizer |
| Design | 9 | UI Designer, UX Researcher, Brand Guardian |
| Sales | 9 | Outbound Strategist, Deal Strategist |
| Support | 6 | Support Responder, Analytics Reporter |
| Security | 10 | Security Architect, AppSec Engineer |
| Specialized | 53 | Agent Orchestrator, MCP Builder |
| +10 more | 64 | Finance, Testing, Product, PM, etc. |

## Documentation

- [Architecture](docs/architecture.md)
- [Agent Adapters](docs/agent-adapters.md)
- [Skills Protocol](docs/skills-protocol.md)
- [Design Systems](docs/design-systems.md)
- [Plugin Specification](docs/plugins-spec.md)
- [Architectural Decisions](DECISIONS.md)

## License

MIT
