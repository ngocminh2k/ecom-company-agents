export {
  validateShopifyTitle,
  validateShopifyDescription,
  validateShopifyProduct,
  validatePreAdsChecklist,
  getCroSuggestions,
} from './shopify-entity.js'

export type {
  ShopifyProduct,
  ShopifyProductCreateInput,
  ShopifyProductUpdateInput,
  ShopifyProductValidationResult,
  PreAdsCheckResult,
  PreAdsCheckItem,
  CroSuggestion,
} from './shopify-entity.js'

export { ShopifyService } from './shopify-service.js'

export { CroService } from './cro-service.js'
export type { CroTest, CroTestCreateInput, CroTestUpdateInput } from './cro-service.js'

export {
  welcomeFlow,
  abandonedCartFlow,
  postPurchaseFlow,
  winbackFlow,
  seasonalCampaignFlow,
  EMAIL_FLOWS,
} from './email-flows.js'

export type {
  EmailFlow,
  EmailFlowStep,
  EmailTemplate,
  EmailFlowName,
  SeasonalCampaignConfig,
  TimingRule,
} from './email-flows.js'
