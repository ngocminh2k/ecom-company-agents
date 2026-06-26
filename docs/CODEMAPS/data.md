<!-- Generated: 2026-06-26 | Tables: 24 | Migration: 12 | Token estimate: ~300 -->

# Data Architecture

## Core Tables
```
products                   20 columns — pod/dropshipping/digital, status state machine
orders                     28 columns — full lifecycle, personalization, refunds
customers                  10 columns — multi-channel, order aggregations
suppliers                  7 columns — Printful/Printify/AliExpress/custom
campaigns                  12 columns — multi-platform, budget, metrics
```

## E-Commerce Tables
```
etsy_listings              16 cols — listing CRUD, SEO, Etsy sync
shopify_products           13 cols — product sync, SEO, personalization
amazon_listings            13 cols — ASIN, FBM/FBA, account health
fulfillment_orders         16 cols — status machine (8 states)
qc_logs                    11 cols — 8-step QC checklist
support_tickets            14 cols — SLA, macro, escalation
refund_logs                12 cols — approval workflow
```

## Product Research Tables
```
product_research_sheets    22 cols — 17 SOP fields, score, approval
competitor_entries         11 cols — price, rating, key messages
ip_blacklist               4 cols  — brand/character/celebrity types
ip_check_logs              12 cols — 6-step IP check
```

## Finance Tables
```
daily_reconciliation       9 cols  — per-channel daily summary
pnl_by_sku                 16 cols — SKU-level PnL, classification
finance_alerts             8 cols  — CPA/refund/margin alerts
```

## Launch Orchestration Tables
```
launch_orchestrations      11 cols — 5-stage pipeline, 6 launch flags
launch_checklist           9 cols  — 17-item pre-launch checklist
product_lifecycle          9 cols  — 3/7/14/30 day checkpoints
```

## BI Tables
```
listing_logs               11 cols — listing publish history
channel_launch_logs        8 cols  — channel launch tracking
order_issue_logs           8 cols  — issue tracking
ad_test_logs               16 cols — ad test results
creative_briefs            16 cols — SOP Section 7 brief
incident_logs              11 cols — platform incidents
sla_events                 7 cols  — SLA breach monitoring
cro_logs                   9 cols  — A/B test results
```

## Migration History
```
001 → 012: 12 migrations, incremental schema evolution
Latest: 012_phases_9_10 (launch_orchestrations + indexes)
```

## Relationships
```
products ──→ orders, etsy_listings, shopify_products, amazon_listings
products ──→ launch_orchestrations, launch_checklist, product_lifecycle
orders ────→ fulfillment_orders, qc_logs, refund_logs, support_tickets
```
