# P0 Implementation Plan

## Daemon fixes (1 agent)
- Add `getAll()` to `LaunchOrchestrator` in `ecommerce-core`
- Add `GET /api/product-research/sheets` route
- Add `GET /api/orchestration/` route

## API client + Sidebar (1 agent)
- Extend `lib/api.ts` with all types + namespaces
- Update `Sidebar.tsx` with 4 nav items

## Dashboard Enhancement (1 agent)
- KpiGrid, AlertFeed, DateRangePicker
- Enhance `/` page with alerts + SLA

## Product Research UI (1 agent)
- ResearchSheetForm, ScoreGauge, ResearchSheetCard
- /research pages (list, new, detail, competitors, ip-check)

## Launch Orchestration UI (1 agent)
- PipelineView, ChecklistItem, ChecklistProgress, CheckpointCard
- /launch pages (list, detail, checklist, checkpoints)

## BI Logs UI (1 agent)
- LogTypeNav, all log forms
- /bi/logs pages (hub + 7 types)
- /bi/alerts page

## Code Review (1 agent, after all done)
- Review all new code
- Verify build
- Update codemaps
