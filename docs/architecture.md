# ECC OmniStudio — Architecture

## System Overview

ECC OmniStudio is a local-first AI agent harness for e-commerce (POD & dropshipping). It delegates AI tasks to existing CLI agents on your machine (Claude Code, Codex, Cursor, etc.) through a unified adapter interface.

### Four Layers

```
┌──────────────────────────────────────────────┐
│  Web App (Next.js 16 App Router)             │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Chat    │ │Dashboard │ │ Agent/Skill  │  │
│  │Workspace│ │Analytics │ │ Management   │  │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘  │
│       │           │              │           │
├───────┴───────────┴──────────────┴───────────┤
│  Daemon (Express + SQLite, 127.0.0.1:7456)    │
│  ┌──────────┐ ┌────────┐ ┌────────────────┐  │
│  │REST API  │ │MCP     │ │Agent Adapter   │  │
│  │(30+ rts) │ │Server  │ │Pool            │  │
│  ├──────────┤ ├────────┤ ├────────────────┤  │
│  │Skills    │ │Plugins │ │Design Systems  │  │
│  │System    │ │System  │ │Parser          │  │
│  ├──────────┤ ├────────┤ ├────────────────┤  │
│  │E-commerce│ │Agent   │ │Routing Matrix  │  │
│  │Services  │ │Loader  │ │(A2A)           │  │
│  └──────────┘ └────────┘ └────────────────┘  │
├──────────────────────────────────────────────┤
│  Agent CLIs (subprocesses)                    │
│  Claude Code │ Codex │ Cursor │ Copilot │ API │
├──────────────────────────────────────────────┤
│  Storage (SQLite + Filesystem)                │
│  Projects │ Skills │ Designs │ Artifacts      │
└──────────────────────────────────────────────┘
```

## Core Patterns

### Agent Adapter Pool
Each CLI agent gets an adapter implementing the `AgentAdapter` interface:
- `detect()` — PATH lookup, returns version and config info
- `run(params)` — spawns subprocess, returns `AsyncIterable<AgentEvent>`
- `cancel(runId)` — SIGTERM to the subprocess

**Events:** thinking → tool_call → tool_result → text_delta → file_write → error → done

### Agent-to-Agent Routing (CoAgent)
Agents can delegate tasks via the `RoutingMatrix`:
- Resolves source agent + task type → target agents
- Priority-based rule matching
- Supports request/response/broadcast patterns

### Skill System (SKILL.md)
Standard Claude Code `SKILL.md` format + `ecc:` extension:
- 3 discovery locations: `~/.claude/skills/`, `./skills/`, `./.claude/skills/`
- Frontmatter: name, description, triggers, inputs, outputs, mode
- ECC extension: design_system, craft, fidelity requirements

### Plugin System (open-design.json)
Plugin = SKILL.md + manifest + pipeline stages:
- Stages: discovery → plan → generate → critique (with repeat/until)
- Trust model: official = trusted, third-party = restricted
- Install sources: local folder, GitHub, HTTPS

### Design System (DESIGN.md)
9-section format following Open Design standard:
1. Visual Theme, 2. Color, 3. Typography, 4. Spacing, 5. Layout
6. Components, 7. Motion, 8. Voice, 9. Anti-patterns

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+, TypeScript (ESM) |
| Monorepo | pnpm workspace |
| Backend | Express 5 |
| Database | SQLite (better-sqlite3) |
| Frontend | Next.js 16, React 19, Tailwind 4 |
| Protocol | MCP stdio server |
| AI Agents | Claude Code, Codex, Cursor, Copilot, Gemini, + API fallback |

## Security Model
- Daemon binds to 127.0.0.1 by default
- CORS off by default, opt-in via env vars
- SSRF guard on proxy endpoints
- Read-only MCP by default
- BYOK for LLM access (no mandatory subscriptions)

## Directory Structure

```
ecc-omnistudio/
├── apps/
│   ├── daemon/        Express + SQLite server
│   └── web/           Next.js frontend
├── packages/
│   ├── agent-adapter/     Agent interface + pool + routing
│   ├── mcp-server/        MCP protocol server
│   ├── skill-system/      SKILL.md parser + executor
│   ├── plugin-system/     Plugin manifest + pipeline
│   ├── design-system/     DESIGN.md parser + tokens
│   ├── ecommerce-core/    POD, dropshipping, marketing, analytics
│   ├── contracts/         Shared TypeScript types
│   └── cli/               CLI entry point
├── skills/                SKILL.md files (30+)
├── design-systems/        DESIGN.md brand files (5+)
├── plugins/               Plugin marketplace
├── agents/                230 agent personalities
└── docs/                  Documentation
```
