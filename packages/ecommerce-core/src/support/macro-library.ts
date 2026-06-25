/**
 * Macro Library — English support response templates.
 *
 * SOP Section 14.5: English macro templates.
 * Each macro includes personalizable fields and applicable ticket types.
 */

export interface SupportMacro {
  key: string
  title: string
  applicableTypes: string[]
  body: string
  personalizableFields: string[]
}

/**
 * English macros matching SOP Section 14.5:
 * - Tracking delays
 * - Personalization error
 * - Pre-production cancellation
 * - Refund initiated
 */
export const MACROS: SupportMacro[] = [
  {
    key: 'slow_tracking',
    title: 'Tracking Delays',
    applicableTypes: ['tracking', 'complaint'],
    body: 'Hi {{customer_name}}, thank you so much for reaching out. I checked your order {{order_id}} and the package is currently in transit. Sometimes tracking can take a little time to update after the carrier receives the package. I will keep an eye on it and follow up with you if there is no new update soon.',
    personalizableFields: ['customer_name', 'order_id'],
  },
  {
    key: 'personalization_error',
    title: 'Personalization Error',
    applicableTypes: ['refund', 'complaint', 'exchange'],
    body: 'Hi {{customer_name}}, I am really sorry about this. I understand how disappointing it is when a personalized item does not arrive as expected. Could you please send us a clear photo of the item and packaging? Once we confirm the issue, we will help with the best solution as quickly as possible.',
    personalizableFields: ['customer_name'],
  },
  {
    key: 'pre_production_cancel',
    title: 'Cancel Before Production',
    applicableTypes: ['pre_purchase'],
    body: 'Hi {{customer_name}}, thank you for letting us know. I checked your order {{order_id}} and it has not entered production yet, so we can cancel it for you. Once the cancellation is completed, the refund should return to your original payment method according to the payment provider timeline.',
    personalizableFields: ['customer_name', 'order_id'],
  },
  {
    key: 'refund_initiated',
    title: 'Refund Initiated',
    applicableTypes: ['refund'],
    body: 'Hi {{customer_name}}, your refund for order {{order_id}} has been processed. The amount of {{refund_amount}} will be returned to your original payment method within 5-10 business days depending on your payment provider.',
    personalizableFields: ['customer_name', 'order_id', 'refund_amount'],
  },
]

/**
 * Get a macro by key.
 */
export function getMacro(key: string): SupportMacro | undefined {
  return MACROS.find((m) => m.key === key)
}

/**
 * Get all macros applicable to a ticket type.
 */
export function getMacrosForType(type: string): SupportMacro[] {
  return MACROS.filter((m) => m.applicableTypes.includes(type))
}

/**
 * Personalize a macro by replacing template fields with provided values.
 * Replaces {{field_name}} placeholders with the corresponding value.
 */
export function personalizeMacro(key: string, fields: Record<string, string>): string | undefined {
  const macro = getMacro(key)
  if (!macro) return undefined

  let personalized = macro.body
  for (const [field, value] of Object.entries(fields)) {
    personalized = personalized.replace(new RegExp(`\\{\\{${field}\\}\\}`, 'g'), value)
  }

  return personalized
}
