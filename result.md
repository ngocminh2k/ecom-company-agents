### Carrier Routing Service Technical Spec

#### 1. Purpose
In `ecom-SOP.md` Section "SOP logistics và last-mile", the process requires: "cấu hình carrier matrix theo vùng, trọng lượng, COD, hàng cồng kềnh, SLA" (configure carrier matrix by region, weight, COD, bulky items, SLA). Currently, the `packages/ecommerce-core` package lacks a dedicated service for dynamically assigning the best carrier and shipping method for a fulfillment order based on these rules. We will build a `CarrierRoutingService` to fulfill this operational requirement using a strict rules-based matrix approach.

#### 2. Scope & Implementation Details
- **File location:** `packages/ecommerce-core/src/fulfillment/carrier-routing-service.ts`
- **Functionality:**
  - Define `CarrierRule` interface containing criteria: `supportedRegions`, `maxWeightKg`, `supportsCOD`, `supportsBulky`, `estimatedDays`, and cost calculation fields.
  - Create `CarrierRoutingService` class with a provided set of internal or stored carrier rules.
  - Implement `evaluateBestCarrier(context)` method that takes an order's shipping details (region, weight, COD status, bulky status, SLA requirement) and filters the available rules to find the lowest-cost carrier that meets all criteria and SLA requirements.
  - Export it from `packages/ecommerce-core/src/fulfillment/index.ts`.
- **Constraint Compliance:** The service will use real algorithm logic to evaluate and sort constraints. No agents or AI fallbacks will be used here, adhering strictly to ADR-015 for business logic.

#### 3. Data Structures
```typescript
export interface RoutingContext {
  orderId: string;
  region: string; // e.g., 'VN-SG', 'VN-HN', 'US-CA'
  weightInKg: number;
  isCOD: boolean;
  isBulky: boolean;
  slaDaysRequired: number;
}

export interface CarrierRule {
  id: string;
  carrierId: string;
  serviceLevel: 'standard' | 'express' | 'same_day';
  supportedRegions: string[] | 'ALL';
  maxWeightKg: number;
  supportsCOD: boolean;
  supportsBulky: boolean;
  estimatedDays: number;
  baseCost: number;
  costPerKgAboveBase: number;
  baseWeightKg: number;
}

export interface RoutingResult {
  carrierId: string;
  serviceLevel: string;
  estimatedDays: number;
  calculatedCost: number;
  ruleId: string;
}
```

#### 4. Verification
- We will add `packages/ecommerce-core/src/fulfillment/carrier-routing-service.test.ts` to verify the constraint filtering (e.g., bulky items correctly filtering out carriers that don't support bulky shipments) and cost calculation logic, targeting 80%+ test coverage.
