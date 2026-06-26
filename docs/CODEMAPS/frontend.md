<!-- Generated: 2026-06-26 | Files scanned: ~580 | Token estimate: ~600 -->

# Frontend Architecture

## Stack
- Next.js 16 App Router, React 19, TypeScript
- Tailwind 4 (CSS utility framework)
- lucide-react (icons)
- No client state library — local useState + Context

## Pages (11 routes, 20 files)
```
app/
├─ page.tsx          Home dashboard (summary cards + alert feed)
├─ layout.tsx        Root layout + Sidebar + DaemonBanner
├─ dashboard/
│   └─ page.tsx      KPI grid, AlertFeed, DateRangePicker
├─ products/
│   └─ page.tsx      Table with status badges + search + pagination
├─ orders/
│   └─ page.tsx      Order table with status + customer info
├─ research/
│   ├─ page.tsx      Sheets list with score gauge + status
│   ├─ new/page.tsx  Create sheet form (17 fields per SOP)
│   └─ [id]/
│       ├─ page.tsx  Sheet detail + score + approve/reject
│       ├─ competitors/page.tsx  Competitor entries CRUD
│       └─ ip-check/page.tsx    IP check history + new check
├─ launch/
│   ├─ page.tsx      Pipeline kanban (5 stages) + start modal
│   └─ [productId]/
│       ├─ page.tsx  Detail + stage bar + readiness + actions
│       ├─ checklist/page.tsx   17-item launch checklist
│       └─ checkpoints/page.tsx Lifecycle checkpoint records
├─ bi/
│   ├─ alerts/page.tsx     Alert list + SLA dashboard
│   └─ logs/
│       ├─ page.tsx        Log type hub (7 types with counts)
│       └─ [type]/page.tsx Type-specific log table + create
├─ agents/
│   └─ page.tsx      Agent personalities browser
└─ workspace/
    └─ page.tsx      Agent workspace chat
```

## Component Tree
```
Layout.tsx
├─ Sidebar.tsx (nav items + active state)
├─ DaemonBanner.tsx (connection status pill)
└─ {children}
   ├─ Page uses:
   │  ├─ ErrorState.tsx (error + retry button)
   │  ├─ EmptyState.tsx (icon + title + action)
   │  └─ Skeleton.tsx (loading state)
   ├─ Data display:
   │  ├─ Card.tsx (section wrapper)
   │  ├─ Badge.tsx (status pill)
   │  ├─ KpiCard.tsx (metric display)
   │  ├─ Table.tsx (data table)
   │  └─ Pagination.tsx
   └─ Interactive:
      ├─ Button.tsx (variants: primary, secondary, danger, ghost)
      ├─ Input.tsx
      ├─ Select.tsx
      ├─ SearchInput.tsx
      ├─ Modal.tsx (overlay dialog)
      └─ Toast.tsx (notification)
```

## Data Flow
```
Page Component
  → useEffect → api.<module>.<method>(params)     // api.ts fetch layer
    → fetch(/api/<path>)                           // Next.js proxy → daemon:7456
      → Express Route → Service → SQLite → JSON
    ← typed response
  → setState → React re-render
  → ErrorState | EmptyState | Skeleton | data render
```

## API Client (lib/api.ts, 294 lines)
```
api.health()                          → GET /api/health
api.products.list/create()            → Products CRUD
api.orders.list()                     → Orders list
api.agents.list()                     → Agents + personalities
api.summary()                         → E-commerce summary
api.skills.list()                     → Skills list
api.productResearch.{sheets,competitors,ipCheck,ipBlacklist}
api.orchestration.{start,get,list,advance,complete,block,updateFlags,readiness,checklist,checkpoints}
api.bi.{company,channel,product,ads,logs,sla}
api.finance.alerts.{list,check,acknowledge}
```

## Components (16 shared)
| Component | Props | States |
|-----------|-------|--------|
| Button | variant, size, loading, disabled, children | normal, loading, disabled |
| Badge | variant (success/warning/error/info/accent/neutral) | — |
| Card | title, padding, className, children | — |
| Table | data, columns, onRowClick | empty, populated |
| Input | label, error, placeholder, ...input | normal, error |
| Select | options, value, onChange | — |
| SearchInput | value, onChange, placeholder | — |
| Pagination | page, total, limit, onChange | — |
| Modal | open, title, onClose, children | open, closed |
| Toast | message, type, onClose | — |
| Skeleton | height, width, count | — |
| EmptyState | icon, title, description, action | — |
| ErrorState | message, onRetry | — |
| KpiCard | label, value, trend, icon | — |
| Badge | variant | — |
| DaemonBanner | status | online, offline |
