# Bảng đề xuất tính năng phần mềm từ SOP vận hành

**Nguồn:** `sop_ecommerce_vietnam_us.md` (33 mục, 1877 dòng)
**Ngày:** 26/06/2026
**Người phân tích:** Business Analyst Agent

---

## Nhóm 1: Leadership & Vận hành chung (SOP 1-5, 30)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 1.1 | Một lõi SP nhiều kênh | Multi-channel launch orchestration | P0 | `LaunchOrchestrator` + `LaunchChecklistService` đã có |
| 1.2 | Không phụ thuộc 1 nền tảng | Account risk dashboard + backup account | P1 | Chưa có backup account mgmt |
| 1.3 | Dữ liệu quyết định (10 KPI) | Company dashboard + alert engine | P0 | `DashboardService` + `FinanceAlertService` đã có |
| 2.1-2.4 | Sơ đồ phòng ban 4 giai đoạn | RBAC + team management | P1 | Chưa có RBAC |
| 3.1-3.5 | Ma trận RACI | Workflow engine + approval routing | P1 | `EscalationService` cơ bản |
| 4.1 | SLA: tin nhắn/ personalization/ báo cáo | SLA monitor + report scheduler | P1 | `SlaMonitorService` đã có |
| 4.2 | SLA mùa cao điểm | Seasonal readiness checklist | P2 | Chưa có |
| 5.2-5.5 | Dashboard daily/weekly/monthly | Executive dashboard + PnL by channel/SKU | P0 | `DashboardService` + `PnLService` đã có |

## Nhóm 2: Product Research (SOP 6, 22-25, 28)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 6.1-6.3 | Tìm SP: trend, review, margin, chấm điểm | Product research sheet CRUD + scoring engine | P0 | Đã có đầy đủ service |
| 6.4 | 7 tiêu chí chấm điểm thang 100 | Scoring engine | P0 | Đã có |
| 6.5 | Checklist trước brief | Pre-brief validation | P0 | Đã có |
| 22.1-22.5 | 5 giai đoạn phối hợp | 5-stage pipeline | P0 | Đã có đầy đủ |
| 23 | 17-item launch checklist | Pre-launch checklist | P0 | Đã có |
| 24 | Product Research Sheet form (17 fields) | UI form | P0 | **Cần UI** |

## Nhóm 3: Creative Design (SOP 7)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 7.2 | Quy trình nhận brief | Brief validation | P1 | Entity đã có |
| 7.3 | Thiết kế SP: 10 bước | Design task mgmt | P2 | `PodProductDesigner` đã có |
| 7.4 | Creative ads: angle, variant, naming | Ad creative generator | P1 | `AdCreativeGenService` đã có |
| 7.6 | KPI creative team | Creative KPI dashboard | P2 | Chưa có |

## Nhóm 4: Marketplace Operations (SOP 8-11, 26)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 9.2-9.3 | Etsy listing 12 bước + checklist | Etsy listing service | P0 | Đã có đầy đủ |
| 9.4 | Etsy optimization | Optimization suggestion | P1 | Đã có |
| 9.5 | Xử lý case Etsy | Case management | P1 | `TicketService` đã có |
| 10.2 | Shopify product page 12 bước | Shopify CRUD + SEO | P0 | Đã có đầy đủ |
| 10.3 | Shopify pre-ads checklist | Pre-ads audit | P0 | Đã có |
| 10.4 | Shopify CRO | CRO test log | P1 | Đã có |
| 10.5 | Email marketing 5 flows | Email flow templates | P1 | Đã có |

## Nhóm 5: Performance Marketing (SOP 12)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 12.2 | Meta Ads launch 10 bước | Ads campaign planning | P1 | `CampaignCreatorService` đã có |
| 12.5 | KPI marketing 10 chỉ số | Ad performance dashboard | P0 | Đã có |

## Nhóm 6: Customer Support (SOP 14, 27)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 14.3 | Xử lý tin nhắn mới 10 bước | Support ticket system | P0 | `TicketService` đã có |
| 14.4 | Refund 8 bước | Refund request | P0 | `RefundService` đã có |
| 14.5 | Macro tiếng Anh | Macro library | P1 | Đã có 4 macros |

## Nhóm 7: Fulfillment (SOP 15)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 15.2 | Xử lý đơn thường 10 bước | Fulfillment state machine | P0 | Đã có |
| 15.4 | QC 8 bước | Quality check service | P0 | Đã có |

## Nhóm 8: Finance (SOP 17)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 17.2 | Đối soát hằng ngày 8 bước | Daily reconciliation + alerts | P0 | Đã có |
| 17.3 | PnL theo SKU 9 bước | PnL by SKU + classification | P0 | Đã có |

## Nhóm 9: BI & Dashboard (SOP 20)

| SOP | Yêu cầu nghiệp vụ | Tính năng | Prio | Hiện trạng |
|-----|------------------|-----------|------|------------|
| 20.2 | Hệ thống 10 logs | 10-log CRUD | P0 | 7/9 logs đã có |
| 20.3 | Dashboard 4 cấp | 4-tier dashboard | P0 | Đã có |

---

## Kết luận

- **P0 business logic đã có 90%** trong `packages/ecommerce-core/`
- **Thiếu chính:** UI pages để người dùng làm việc với các module
- **7 pages hiện tại** không đủ coverage
- **Cần xây:** Product Research UI, Etsy/Shopify listing UI, Support ticket UI, Fulfillment UI, Finance reconciliation UI, BI dashboard logs UI
