import { describe, it, expect, vi } from 'vitest';
import { StockHealthService, StockItemInput, ValidationError } from './stock-health-service';

describe('StockHealthService', () => {
  const service = new StockHealthService();

  describe('evaluateItem', () => {
    it('identifies out_of_stock and recommends reorder if sales exist', () => {
      const item: StockItemInput = { sku: 'SKU1', availableQuantity: 0, daysInStock: 10, averageDailySales: 5 };
      const evalResult = service.evaluateItem(item);
      expect(evalResult.status).toBe('out_of_stock');
      expect(evalResult.recommendedAction).toBe('reorder');
      expect(evalResult.daysOfCover).toBe(0);
    });

    it('identifies out_of_stock and recommends none if no sales', () => {
      const item: StockItemInput = { sku: 'SKU1', availableQuantity: 0, daysInStock: 10, averageDailySales: 0 };
      const evalResult = service.evaluateItem(item);
      expect(evalResult.status).toBe('out_of_stock');
      expect(evalResult.recommendedAction).toBe('none');
      expect(evalResult.daysOfCover).toBe(0);
    });

    it('identifies dead_stock for old items with no movement', () => {
      const item: StockItemInput = { sku: 'SKU2', availableQuantity: 100, daysInStock: 91, averageDailySales: 0.05 };
      const evalResult = service.evaluateItem(item);
      expect(evalResult.status).toBe('dead_stock');
      expect(evalResult.recommendedAction).toBe('liquidate');
      expect(evalResult.daysOfCover).toBe(2000);
    });

    it('identifies aging stock', () => {
      const item: StockItemInput = { sku: 'SKU3', availableQuantity: 500, daysInStock: 65, averageDailySales: 5 };
      const evalResult = service.evaluateItem(item);
      // Days of cover = 500 / 5 = 100 (> 60)
      expect(evalResult.status).toBe('aging');
      expect(evalResult.recommendedAction).toBe('markdown');
      expect(evalResult.daysOfCover).toBe(100);
    });

    it('identifies low_stock', () => {
      const item: StockItemInput = { sku: 'SKU4', availableQuantity: 10, daysInStock: 5, averageDailySales: 1 };
      const evalResult = service.evaluateItem(item);
      // Days of cover = 10 / 1 = 10 (<= 14)
      expect(evalResult.status).toBe('low_stock');
      expect(evalResult.recommendedAction).toBe('reorder');
      expect(evalResult.daysOfCover).toBe(10);
    });

    it('identifies healthy stock', () => {
      const item: StockItemInput = { sku: 'SKU5', availableQuantity: 150, daysInStock: 30, averageDailySales: 5 };
      const evalResult = service.evaluateItem(item);
      // Days of cover = 150 / 5 = 30 (14 < 30 <= 60)
      expect(evalResult.status).toBe('healthy');
      expect(evalResult.recommendedAction).toBe('none');
      expect(evalResult.daysOfCover).toBe(30);
    });

    it('handles zero sales with stock correctly (Infinity days of cover)', () => {
      const item: StockItemInput = { sku: 'SKU6', availableQuantity: 10, daysInStock: 30, averageDailySales: 0 };
      const evalResult = service.evaluateItem(item);
      expect(evalResult.status).toBe('healthy'); // Not >60 days in stock, so just healthy but Infinite cover
      expect(evalResult.daysOfCover).toBe(Infinity);
    });

    it('throws ValidationError for negative inputs', () => {
      expect(() => service.evaluateItem({ sku: '', availableQuantity: 10, daysInStock: 10, averageDailySales: 1 })).toThrow(ValidationError);
      expect(() => service.evaluateItem({ sku: 'SKU', availableQuantity: -1, daysInStock: 10, averageDailySales: 1 })).toThrow(ValidationError);
      expect(() => service.evaluateItem({ sku: 'SKU', availableQuantity: 10, daysInStock: -1, averageDailySales: 1 })).toThrow(ValidationError);
      expect(() => service.evaluateItem({ sku: 'SKU', availableQuantity: 10, daysInStock: 10, averageDailySales: -1 })).toThrow(ValidationError);
    });
  });

  describe('evaluatePortfolio', () => {
    it('returns summary report for a batch of items', () => {
      const before = new Date().getTime();
      const report = service.evaluatePortfolio([
        { sku: '1', availableQuantity: 0, daysInStock: 10, averageDailySales: 5 }, // out_of_stock
        { sku: '2', availableQuantity: 100, daysInStock: 95, averageDailySales: 0 }, // dead_stock
        { sku: '3', availableQuantity: 500, daysInStock: 70, averageDailySales: 5 }, // aging
        { sku: '4', availableQuantity: 10, daysInStock: 5, averageDailySales: 1 }, // low_stock
        { sku: '5', availableQuantity: 150, daysInStock: 30, averageDailySales: 5 }, // healthy
      ]);
      const after = new Date().getTime();

      expect(report.summary.totalItems).toBe(5);
      expect(report.summary.deadStockCount).toBe(1);
      expect(report.summary.agingCount).toBe(1);
      expect(report.summary.lowStockCount).toBe(1);

      const evaluatedAt = new Date(report.evaluatedAt).getTime();
      expect(evaluatedAt).toBeGreaterThanOrEqual(before);
      expect(evaluatedAt).toBeLessThanOrEqual(after);
    });
  });
});
