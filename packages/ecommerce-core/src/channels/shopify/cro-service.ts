/**
 * Shopify Channel — CRO (Conversion Rate Optimization) Test Log Service
 *
 * CRUD for A/B testing hypotheses and tracking conversion changes.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CroTest {
  id: string
  shopifyProductId: string
  hypothesis: string
  changeDescription: string
  startDate?: string
  endDate?: string
  conversionBefore?: number
  conversionAfter?: number
  result: 'win' | 'loss' | 'inconclusive' | 'running'
  traffic?: number
  owner?: string
}

export interface CroTestCreateInput {
  shopifyProductId: string
  hypothesis: string
  changeDescription: string
  startDate?: string
  conversionBefore?: number
  owner?: string
}

export interface CroTestUpdateInput {
  endDate?: string
  conversionAfter?: number
  result?: 'win' | 'loss' | 'inconclusive' | 'running'
  traffic?: number
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class CroService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  /**
   * Create a new CRO test entry.
   */
  createTest(input: CroTestCreateInput): CroTest {
    const errors = validateCroTestCreate(input)
    if (errors.length > 0) {
      throw new Error(`CRO test validation failed: ${errors.join('; ')}`)
    }

    const id = randomUUID()
    const test: CroTest = {
      id,
      shopifyProductId: input.shopifyProductId,
      hypothesis: input.hypothesis,
      changeDescription: input.changeDescription,
      startDate: input.startDate ?? new Date().toISOString().slice(0, 10),
      conversionBefore: input.conversionBefore,
      result: 'running',
      owner: input.owner,
    }

    this.db.prepare(`
      INSERT INTO cro_logs (id, shopify_product_id, hypothesis, change_description, start_date, conversion_before, result, owner)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      test.id, test.shopifyProductId, test.hypothesis, test.changeDescription,
      test.startDate ?? null, test.conversionBefore ?? null,
      test.result, test.owner ?? null,
    )

    return test
  }

  /**
   * Get a CRO test by ID.
   */
  getTest(id: string): CroTest | null {
    const row = this.db.prepare('SELECT * FROM cro_logs WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return null
    return this.rowToTest(row)
  }

  /**
   * Update a CRO test with results.
   */
  updateTest(id: string, input: CroTestUpdateInput): CroTest | null {
    const existing = this.getTest(id)
    if (!existing) return null

    this.db.prepare(`
      UPDATE cro_logs SET
        end_date = ?, conversion_after = ?,
        result = ?, traffic = ?
      WHERE id = ?
    `).run(
      input.endDate ?? existing.endDate ?? null,
      input.conversionAfter ?? existing.conversionAfter ?? null,
      input.result ?? existing.result,
      input.traffic ?? existing.traffic ?? null,
      id,
    )

    return this.getTest(id)
  }

  /**
   * Delete a CRO test.
   */
  deleteTest(id: string): boolean {
    const existing = this.getTest(id)
    if (!existing) return false
    this.db.prepare('DELETE FROM cro_logs WHERE id = ?').run(id)
    return true
  }

  /**
   * List CRO tests for a product.
   */
  listTestsByProduct(shopifyProductId: string): CroTest[] {
    const rows = this.db.prepare(
      'SELECT * FROM cro_logs WHERE shopify_product_id = ? ORDER BY created_at DESC'
    ).all(shopifyProductId) as Record<string, unknown>[]
    return rows.map((r) => this.rowToTest(r))
  }

  /**
   * List all CRO tests.
   */
  listAllTests(): CroTest[] {
    const rows = this.db.prepare('SELECT * FROM cro_logs ORDER BY created_at DESC').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToTest(r))
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private rowToTest(row: Record<string, unknown>): CroTest {
    return {
      id: row.id as string,
      shopifyProductId: row.shopify_product_id as string,
      hypothesis: row.hypothesis as string,
      changeDescription: row.change_description as string,
      startDate: (row.start_date as string) ?? undefined,
      endDate: (row.end_date as string) ?? undefined,
      conversionBefore: (row.conversion_before as number) ?? undefined,
      conversionAfter: (row.conversion_after as number) ?? undefined,
      result: (row.result as CroTest['result']) ?? 'running',
      traffic: (row.traffic as number) ?? undefined,
      owner: (row.owner as string) ?? undefined,
    }
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateCroTestCreate(input: CroTestCreateInput): string[] {
  const errors: string[] = []

  if (!input.shopifyProductId) {
    errors.push('shopifyProductId is required')
  }

  if (!input.hypothesis || input.hypothesis.trim().length === 0) {
    errors.push('Hypothesis is required')
  } else if (input.hypothesis.trim().length < 10) {
    errors.push('Hypothesis should be at least 10 characters')
  }

  if (!input.changeDescription || input.changeDescription.trim().length === 0) {
    errors.push('Change description is required')
  }

  if (input.conversionBefore !== undefined) {
    if (input.conversionBefore < 0 || input.conversionBefore > 100) {
      errors.push('Conversion rate must be between 0 and 100')
    }
  }

  return errors
}
