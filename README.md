# ECC OmniStudio

AI Agent Harness + E-Commerce Platform for POD (Print on Demand) and Dropshipping.

Inspired by:
- [Open Design](https://github.com/nexu-io/open-design) — agent adapter pool, MCP server, skill/plugin architecture
- [The Agency](https://github.com/msitarzewski/agency-agents) — agent personalities (232 specialists)
- [Awesome Claude Skills](https://github.com/ComposioHQ/awesome-claude-skills) — 1000+ skills format

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Start the daemon
pnpm --filter @ecc/daemon dev
```

The daemon starts on http://127.0.0.1:7456.

## Project Structure

```
apps/
  daemon/     Express + SQLite daemon
  web/        Next.js frontend (coming in Phase 6)

packages/
  agent-adapter/   Agent adapter interface + pool + routing matrix
  mcp-server/      MCP stdio protocol server
  skill-system/    SKILL.md loader (Phase 2)
  plugin-system/   Plugin pipeline (Phase 2)
  design-system/   DESIGN.md parser (Phase 3)
  ecommerce-core/  E-commerce domain (Phase 5)
  contracts/       Shared TypeScript types
  cli/             CLI entry point

