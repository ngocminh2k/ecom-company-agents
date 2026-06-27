export interface InventoryItem {
  sku: string;
  stock: number;
  threshold: number;
  supplierId: string;
  reorderQty: number;
}

export interface InventoryStorage {
  getLowStock(): Promise<InventoryItem[]>;
}

export interface VendorClient {
  createOrder(supplierId: string, items: { sku: string; qty: number }[]): Promise<string>;
}

export class InventoryReorderService {
  constructor(
    private readonly db: InventoryStorage,
    private readonly vendor: VendorClient
  ) {}

  async processReorders(): Promise<string[]> {
    const items = await this.db.getLowStock();
    if (!items.length) return [];

    const bySupplier = items.reduce((acc, item) => {
      acc[item.supplierId] ??= [];
      acc[item.supplierId].push({ sku: item.sku, qty: item.reorderQty });
      return acc;
    }, {} as Record<string, { sku: string; qty: number }[]>);

    return Promise.all(
      Object.entries(bySupplier).map(([supplierId, orderItems]) =>
        this.vendor.createOrder(supplierId, orderItems)
      )
    );
  }
}
