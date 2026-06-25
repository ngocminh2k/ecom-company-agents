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
