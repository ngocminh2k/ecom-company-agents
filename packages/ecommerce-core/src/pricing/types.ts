export interface CostToServe {
  cogs: number;                // Cost of goods sold
  packagingCost: number;       // Packaging and handling
  platformFeeRate: number;     // e.g., 0.05 for 5% marketplace commission
  paymentFeeRate: number;      // e.g., 0.02 for 2% payment gateway fee
  fulfillmentCost: number;     // Fixed cost for 3PL pick/pack or shipping subsidy
}

export interface ChannelPriceConfig {
  sku: string;
  channel: string;             // e.g., 'website', 'shopee', 'tiktok'
  sellingPrice: number;
  compareAtPrice?: number;     // Optional strike-through price
}

export interface PricingRule {
  categoryId: string;
  channel: string;
  minFloorMargin: number;      // Minimum net margin percentage (e.g., 0.20 for 20%)
  maxDiscountDepth: number;    // Max allowed discount from compareAtPrice
}

export interface PriceEvaluationResult {
  sku: string;
  channel: string;
  isValid: boolean;
  netMarginPercentage: number;
  netMarginAbsolute: number;
  violations: string[];
}
