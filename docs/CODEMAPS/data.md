<!-- Generated: 2026-06-26 | Tables: 24 | Migration: 12 | Token estimate: ~300 -->

# Data Architecture

## Core Tables (7)
- products, orders, campaigns, suppliers, customers, projects, conversations

## Channel Tables (5)
- etsy_listings (16 cols), shopify_products (13), amazon_listings (13)
- amazon_account_health + incidents, amazon_campaigns + performance

## Product Research (4)
- product_research_sheets (22), competitor_entries (11), ip_blacklist (4), ip_check_logs (12)

## Finance (3)
- daily_reconciliation (9), pnl_by_sku (16), finance_alerts (8)

## Launch Orchestration (3)
- launch_orchestrations (11), launch_checklist (9), product_lifecycle (9)

## Fulfillment (3)
- fulfillment_orders (16), qc_logs (11), vendor_scorecards (14)

## Support (3)
- support_tickets (14), ticket_responses, refund_logs (12)

## BI + Logs (7)
- listing_logs, channel_launch_logs, order_issue_logs, ad_test_logs
- creative_briefs, incident_logs, sla_events

## Migrations: 12
```
001 → 011: Domain + channel + support (original Phase 1-8)
012: launch_orchestrations + indexes (Phase 9-10)
```
