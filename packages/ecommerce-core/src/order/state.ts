/**
 * Order State Machine — real transition graph, not array.includes()
 *
 * SOP Section 15.2: Order lifecycle from receive → production → ship → deliver
 * Each state explicitly defines valid transitions.
 */
export const ORDER_STATES = {
  pending:        { label: 'Pending',        transitions: ['processing', 'cancelled'] },
  processing:     { label: 'Processing',     transitions: ['shipped', 'cancelled'] },
  shipped:        { label: 'Shipped',        transitions: ['delivered', 'returned'] },
  delivered:      { label: 'Delivered',      transitions: ['returned', 'refunded'] },
  cancelled:      { label: 'Cancelled',      transitions: [] },
  returned:       { label: 'Returned',       transitions: ['refunded'] },
  refunded:       { label: 'Refunded',       transitions: [] },
} as const

export type OrderStatus = keyof typeof ORDER_STATES

export function isValidOrderTransition(from: OrderStatus | string, to: string): boolean {
  const state = ORDER_STATES[from as OrderStatus]
  if (!state) return false
  return (state.transitions as readonly string[]).includes(to)
}

export function getValidOrderTransitions(from: OrderStatus | string): string[] {
  const state = ORDER_STATES[from as OrderStatus]
  return state ? [...(state.transitions as readonly string[])] : []
}

/**
 * Campaign State Machine
 * SOP Section 8: Campaign lifecycle from draft → active → paused → completed
 */
export const CAMPAIGN_STATES = {
  draft:      { label: 'Draft',     transitions: ['active', 'archived'] },
  active:     { label: 'Active',    transitions: ['paused', 'completed'] },
  paused:     { label: 'Paused',    transitions: ['active', 'completed'] },
  completed:  { label: 'Completed', transitions: [] },
  archived:   { label: 'Archived',  transitions: [] },
} as const

export type CampaignStatus = keyof typeof CAMPAIGN_STATES

export function isValidCampaignTransition(from: CampaignStatus | string, to: string): boolean {
  const state = CAMPAIGN_STATES[from as CampaignStatus]
  if (!state) return false
  return (state.transitions as readonly string[]).includes(to)
}

/**
 * Product Status Machine
 * SOP Section 11.2: Product lifecycle from research → active → archived
 */
export const PRODUCT_STATES = {
  idea:         { label: 'Idea',        transitions: ['researching'] },
  researching:  { label: 'Researching', transitions: ['in_design', 'discontinued'] },
  in_design:    { label: 'In Design',   transitions: ['ready_for_launch', 'discontinued'] },
  ready_for_launch: { label: 'Ready for Launch', transitions: ['active', 'discontinued'] },
  active:       { label: 'Active',      transitions: ['archived', 'discontinued'] },
  archived:     { label: 'Archived',    transitions: ['active'] },
  discontinued: { label: 'Discontinued', transitions: [] },
} as const

export type ProductStatus = keyof typeof PRODUCT_STATES

export function isValidProductTransition(from: ProductStatus | string, to: string): boolean {
  const state = PRODUCT_STATES[from as ProductStatus]
  if (!state) return false
  return (state.transitions as readonly string[]).includes(to)
}
