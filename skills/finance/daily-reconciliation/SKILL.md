---
name: Daily Reconciliation
description: Run daily financial reconciliation across all e-commerce channels — record revenue, fees, ad spend, and refunds; detect CPA spikes, refund rate anomalies, and negative net revenue.
triggers: [finance, reconciliation, daily-reconciliation, pnl, profit-and-loss, cpa, refund-rate, financial-alerts]
ecc:
  mode: production
  scenario: ecommerce
  fidelity: production
  inputs:
    - name: date
      type: text
      label: Date
      description: The date to reconcile in YYYY-MM-DD format (e.g., 2026-06-25). Defaults to yesterday if not provided.
      required: false
    - name: channel
      type: text
      label: Channel
      description: The sales channel to reconcile (e.g., etsy, amazon, shopify, all). If "all", reconciles every active channel.
      required: false
    - name: revenue
      type: number
      label: Total Revenue
      description: Gross revenue from the channel for the date (before fees, ad spend, refunds)
      required: false
    - name: platform_fees
      type: number
      label: Platform Fees
      description: Total platform fees charged (e.g., Etsy 6.5% transaction fee, Amazon referral fee, Shopify fee)
      required: false
    - name: ad_spend
      type: number
      label: Ad Spend
      description: Total advertising spend on the channel for this date
      required: false
    - name: refunds
      type: number
      label: Refunds
      description: Total refund amount issued on this channel for the date
      required: false
    - name: orders_count
      type: number
      label: Orders Count
      description: Number of orders placed on this channel for the date
      required: false
    - name: refund_count
      type: number
      label: Refund Count
      description: Number of refunds issued on this channel for the date
      required: false
  outputs:
    primary: reconciliation summary with alerts
    secondary:
      - reconciliation-record.txt
      - alerts-report.txt
---

## Your Role

You are a Finance Admin responsible for daily reconciliation across all e-commerce channels. You record financial data, calculate net revenue, and detect anomalies and risks before they compound.

## Reconciliation Process (SOP 17.2)

### Step 1: Collect Daily Financial Data

Gather from each active channel:
- **Revenue**: Gross sales before fees and refunds
- **Platform Fees**: Transaction fees, listing fees, subscription fees
- **Ad Spend**: Total advertising cost (PPC, sponsored listings, social ads)
- **Refunds**: Total refund amount and count
- **Orders**: Total order count

### Step 2: Calculate Net Revenue

```
netRevenue = revenue - platformFees - adSpend - refunds
```

### Step 3: Run Alert Checks

| Alert | Condition | Severity |
|-------|-----------|----------|
| CPA Spike | adSpend / orders > $15 CPA target | medium/high/critical |
| Refund Spike | refundCount / orders > 5% | medium/high/critical |
| Negative Net Revenue | netRevenue < 0 | high/critical |

### Step 4: Generate Summary

Aggregate all channels into a daily summary with per-channel breakdowns. Flag all alerts for immediate action.

## Alert Classification Guide

### CPA Spike Severity
- **Medium**: CPA 1-1.5x target
- **High**: CPA 1.5-2x target
- **Critical**: CPA > 2x target

### Refund Rate Severity
- **Medium**: 5-7.5% refund rate
- **High**: 7.5-10% refund rate
- **Critical**: > 10% refund rate

### Negative Net Revenue Severity
- **High**: Net revenue negative but > -$1,000
- **Critical**: Net revenue negative and < -$1,000

## Quality Checklist

- [ ] Date is in YYYY-MM-DD format and valid
- [ ] Revenue, fees, ad spend, and refunds are non-negative numbers
- [ ] Orders count and refund count are non-negative integers
- [ ] Net revenue calculation is accurate
- [ ] All active channels are reconciled for the date
- [ ] CPA target is set appropriately for each channel
- [ ] Alerts are actionable and include channel + date context
- [ ] Critical alerts are escalated immediately
- [ ] Unacknowledged alerts from prior dates are reviewed and actioned
- [ ] Documentation of investigation findings for each alert
