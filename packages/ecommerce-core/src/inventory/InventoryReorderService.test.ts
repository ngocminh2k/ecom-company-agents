import { describe, it, expect, vi } from 'vitest';
import { InventoryReorderService, InventoryStorage, VendorClient } from './InventoryReorderService.js';

describe('InventoryReorderService', () => {
  it('returns empty array when no items are low in stock', async () => {
    const db: InventoryStorage = { getLowStock: vi.fn().mockResolvedValue([]) };
    const vendor: VendorClient = { createOrder: vi.fn() };
    const service = new InventoryReorderService(db, vendor);

    const result = await service.processReorders();
    
    expect(result).toEqual([]);
    expect(db.getLowStock).toHaveBeenCalledOnce();
    expect(vendor.createOrder).not.toHaveBeenCalled();
  });

  it('groups items by supplier and creates orders', async () => {
    const mockItems = [
      { sku: 'SKU-1', stock: 5, threshold: 10, supplierId: 'SUP-A', reorderQty: 20 },
      { sku: 'SKU-2', stock: 2, threshold: 5, supplierId: 'SUP-A', reorderQty: 10 },
      { sku: 'SKU-3', stock: 0, threshold: 2, supplierId: 'SUP-B', reorderQty: 50 },
    ];
    
    const db: InventoryStorage = { getLowStock: vi.fn().mockResolvedValue(mockItems) };
    const vendor: VendorClient = { 
      createOrder: vi.fn().mockImplementation(async (supplierId) => `ORDER-${supplierId}`) 
    };
    
    const service = new InventoryReorderService(db, vendor);
    const result = await service.processReorders();
    
    expect(result).toEqual(['ORDER-SUP-A', 'ORDER-SUP-B']);
    expect(vendor.createOrder).toHaveBeenCalledTimes(2);
    expect(vendor.createOrder).toHaveBeenCalledWith('SUP-A', [
      { sku: 'SKU-1', qty: 20 },
      { sku: 'SKU-2', qty: 10 },
    ]);
    expect(vendor.createOrder).toHaveBeenCalledWith('SUP-B', [
      { sku: 'SKU-3', qty: 50 },
    ]);
  });
});
