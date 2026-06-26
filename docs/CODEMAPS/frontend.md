<!-- Generated: 2026-06-26 | Files scanned: ~620 | Token estimate: ~700 -->

# Frontend Architecture

## Stack
- Next.js 16 App Router, React 19, TypeScript, Tailwind 4
- lucide-react (icons), no client-state library

## Pages (25 routes)
```
/ → Home dashboard
├─ /dashboard → KPI grid + AlertFeed + DateRangePicker
├─ /products → Product table + search + pagination
├─ /orders → Order listing + status badges

├─ /research → Research sheets table + score
│  ├─ /research/new → Create sheet form (17 fields)
│  └─ /research/[id] → Detail + score + approve/reject
│     ├─ /research/[id]/competitors → Competitor CRUD
│     └─ /research/[id]/ip-check → IP check results

├─ /launch → Pipeline kanban (5-stage) + start modal
│  └─ /launch/[productId] → Detail + stage bar + readiness
│     ├─ ✓ /checklist → 17-item launch checklist
│     └─ ✓ /checkpoints → Lifecycle checkpoint records

├─ /fulfillment → Order list + search + create modal
│  ├─ /fulfillment/orders/[id] → Detail + 6-stage pipeline + actions
│  └─ /fulfillment/vendors → Vendor scorecard comparison

├─ /support/tickets → Ticket list with SLA indicators
│  ├─ /support/tickets/[id] → Detail + reply + macros + escalate
│  └─ /support/refunds → Refund requests + approval summary

├─ /finance → Hub page + alert feed
│  ├─ /finance/reconciliation → Daily records + channel breakdown
│  └─ /finance/pnl → SKU-level PnL + classification badges

├─ /listings → Channel hub (Etsy + Shopify + Amazon)
│  ├─ /listings/etsy → Etsy listing list + search + status
│  ├─ /listings/shopify → Shopify product list
│  └─ /listings/amazon → Amazon listing + account health

├─ /bi/alerts → Alert feed + SLA dashboard
├─ /bi/logs → Log hub (7 types with counts)
│  └─ /bi/logs/[type] → Type-specific log table + create

├─ /agents → 238 personalities (by division) + adapter status
├─ /skills → 13 executable skills — click → input → RUN → agent
└─ /workspace → Agent chat console with auto-skill-detect
```

## Component Tree
```
Layout.tsx
├─ Sidebar.tsx (14 nav items + collapse)
├─ DaemonBanner.tsx (online/offline pill)
└─ {children}
   ├─ Shared: ErrorState, EmptyState, Skeleton
   ├─ Data: Card, Badge, KpiCard, Table, Pagination
   └─ Inputs: Button, Input, Select, SearchInput, Modal, Toast
```

## Data Flow
```
Component → useEffect → api.module.method() → 
  fetch(/api/...) → Next.js rewrite → daemon:7456 → JSON →
  setState → React re-render
→ ErrorState | EmptyState | Skeleton | data render

Skill execution: fetch(http://127.0.0.1:7456/api/skills/.../execute)
  (bypasses Next.js proxy for long-running POSTs >15s)
```

## API Client (api.ts, 417 LOC)
```
api.health, .products, .orders, .agents, .summary, .skills
api.productResearch.{sheets, competitors, ipCheck, ipBlacklist}
api.orchestration.{start, get, list, advance, complete, block, flags, readiness, checklist, checkpoints}
api.listings.{etsy, shopify, amazon}
api.support.{tickets, macros, refunds, slaBreaches}
api.fulfillment.{orders, qcLogs, vendorScorecards}
api.finance.alerts.{list, check, acknowledge}
api.bi.{company, channel, product, ads, logs, sla}
```
