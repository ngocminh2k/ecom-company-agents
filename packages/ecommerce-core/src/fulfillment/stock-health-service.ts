export type StockHealthStatus = 'out_of_stock' | 'low_stock' | 'healthy' | 'aging' | 'dead_stock';
export type RecommendedAction = 'none' | 'reorder' | 'markdown' | 'liquidate';

export interface StockItemInput {
  sku: string;
  availableQuantity: number;
  daysInStock: number;       // Age of the oldest batch in stock
  averageDailySales: number; // e.g., 30-day average
}

export interface StockHealthEvaluation {
  sku: string;
  status: StockHealthStatus;
  recommendedAction: RecommendedAction;
  daysOfCover: number;
}

export interface StockHealthReport {
  evaluatedAt: string;
  evaluations: StockHealthEvaluation[];
  summary: {
    totalItems: number;
    deadStockCount: number;
    agingCount: number;
    lowStockCount: number;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StockHealthService {
  /**
   * Evaluates the health status and commercial action for a single stock item.
   */
  evaluateItem(item: StockItemInput): StockHealthEvaluation {
    if (!item.sku || item.sku.trim() === '') {
      throw new ValidationError('SKU cannot be empty.');
    }
    if (item.availableQuantity < 0) {
      throw new ValidationError('Available quantity cannot be negative.');
    }
    if (item.daysInStock < 0) {
      throw new ValidationError('Days in stock cannot be negative.');
    }
    if (item.averageDailySales < 0) {
      throw new ValidationError('Average daily sales cannot be negative.');
    }

    const daysOfCover = item.averageDailySales > 0
      ? item.availableQuantity / item.averageDailySales
      : item.availableQuantity === 0 ? 0 : Infinity;

    let status: StockHealthStatus = 'healthy';
    let recommendedAction: RecommendedAction = 'none';

    if (item.availableQuantity === 0) {
      status = 'out_of_stock';
      recommendedAction = item.averageDailySales > 0 ? 'reorder' : 'none';
    } else if (item.daysInStock > 90 && item.averageDailySales < 0.1) {
      status = 'dead_stock';
      recommendedAction = 'liquidate';
    } else if (item.daysInStock > 60 && daysOfCover > 60) {
      status = 'aging';
      recommendedAction = 'markdown';
    } else if (daysOfCover <= 14 && item.availableQuantity > 0) {
      status = 'low_stock';
      recommendedAction = 'reorder';
    }

    return {
      sku: item.sku,
      status,
      recommendedAction,
      daysOfCover,
    };
  }

  /**
   * Evaluates a portfolio of stock items and generates a summary report.
   */
  evaluatePortfolio(items: StockItemInput[]): StockHealthReport {
    const evaluations = items.map(item => this.evaluateItem(item));

    return {
      evaluatedAt: new Date().toISOString(),
      evaluations,
      summary: {
        totalItems: evaluations.length,
        deadStockCount: evaluations.filter(e => e.status === 'dead_stock').length,
        agingCount: evaluations.filter(e => e.status === 'aging').length,
        lowStockCount: evaluations.filter(e => e.status === 'low_stock').length,
      }
    };
  }
}
