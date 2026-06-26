export const MAX_ITEMS_PER_SUB_ORDER = 50;

export interface LineItem {
  id?: string;
  productId: string;
  quantity: number;
  vendorId: string;
  shippingMethod: string;
}

export interface OrderWithMultipleItems {
  id: string;
  items: readonly LineItem[];
}

export interface SubOrderSuggestion {
  vendorId: string;
  shippingMethod: string;
  items: readonly LineItem[];
}

export class OrderSplitValidationService {
  /**
   * Evaluates a list of line items and returns suggested sub-orders
   * according to vendor, shipping method, and maximum item limits.
   */
  public suggestSplits(order: OrderWithMultipleItems): readonly SubOrderSuggestion[] {
    const groups = new Map<string, LineItem[]>();
    for (const item of order.items) {
      const key = `${item.vendorId}|${item.shippingMethod}`;
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }

    const suggestions: SubOrderSuggestion[] = [];

    for (const groupItems of groups.values()) {
      if (groupItems.length === 0) continue;
      const vendorId = groupItems[0].vendorId;
      const shippingMethod = groupItems[0].shippingMethod;

      let currentSubOrderItems: LineItem[] = [];
      let currentQuantity = 0;

      for (const item of groupItems) {
        let remainingQuantity = item.quantity;

        while (remainingQuantity > 0) {
          const availableCapacity = MAX_ITEMS_PER_SUB_ORDER - currentQuantity;
          const quantityToAdd = Math.min(remainingQuantity, availableCapacity);

          if (quantityToAdd > 0) {
            currentSubOrderItems.push(Object.freeze({
              ...item,
              quantity: quantityToAdd
            }));
            currentQuantity += quantityToAdd;
            remainingQuantity -= quantityToAdd;
          }

          if (currentQuantity === MAX_ITEMS_PER_SUB_ORDER) {
            suggestions.push(Object.freeze({
              vendorId,
              shippingMethod,
              items: Object.freeze([...currentSubOrderItems])
            }));
            currentSubOrderItems = [];
            currentQuantity = 0;
          }
        }
      }

      if (currentSubOrderItems.length > 0) {
        suggestions.push(Object.freeze({
          vendorId,
          shippingMethod,
          items: Object.freeze([...currentSubOrderItems])
        }));
      }
    }

    return Object.freeze([...suggestions]);
  }
}
