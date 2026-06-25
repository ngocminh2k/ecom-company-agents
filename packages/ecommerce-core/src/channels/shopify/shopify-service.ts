/**
 * Shopify Channel — service layer for product management
 *
 * CRUD operations with validation, pre-ads audit, and CRO suggestions.
 * KHONG dung agent. KHONG mock. Code thuan.
 */

import { randomUUID } from 'node:crypto'
import type { Database } from 'better-sqlite3'
import {
  validateShopifyProduct,
  validatePreAdsChecklist,
  getCroSuggestions,
  type ShopifyProduct,
  type ShopifyProductCreateInput,
  type ShopifyProductUpdateInput,
  type ShopifyProductValidationResult,
  type PreAdsCheckResult,
  type CroSuggestion,
} from './shopify-entity.js'

export class ShopifyService {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  /**
   * Create a new Shopify product with full validation.
   */
  createProduct(input: ShopifyProductCreateInput): { product: ShopifyProduct; validation: ShopifyProductValidationResult } {
    const validation = validateShopifyProduct(input)

    const id = randomUUID()
    const now = new Date().toISOString()

    const product: ShopifyProduct = {
      id,
      productId: input.productId ?? randomUUID(),
      title: input.title.trim(),
      descriptionHtml: input.descriptionHtml,
      vendor: input.vendor,
      productType: input.productType,
      tags: input.tags ?? [],
      status: 'draft',
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      sku: input.sku,
      inventoryQty: input.inventoryQty ?? 0,
      isPersonalized: input.isPersonalized ?? false,
      personalizationFields: input.personalizationFields,
      createdAt: now,
      updatedAt: now,
    }

    this.db.prepare(`
      INSERT INTO shopify_products (
        id, product_id, shopify_product_id, title, description_html,
        vendor, product_type, tags, status, seo_title, seo_description,
        price, compare_at_price, sku, inventory_qty,
        is_personalized, personalization_fields,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?
      )
    `).run(
      product.id, product.productId, product.shopifyProductId ?? null,
      product.title, product.descriptionHtml,
      product.vendor ?? null, product.productType ?? null,
      JSON.stringify(product.tags), product.status,
      product.seoTitle ?? null, product.seoDescription ?? null,
      product.price ?? null, product.compareAtPrice ?? null,
      product.sku ?? null, product.inventoryQty,
      product.isPersonalized ? 1 : 0,
      product.personalizationFields ?? null,
      product.createdAt, product.updatedAt,
    )

    return { product, validation }
  }

  /**
   * Get a Shopify product by its internal ID.
   */
  getProduct(id: string): ShopifyProduct | null {
    const row = this.db.prepare('SELECT * FROM shopify_products WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return null
    return this.rowToProduct(row)
  }

  /**
   * Update a Shopify product.
   */
  updateProduct(id: string, input: ShopifyProductUpdateInput): { product: ShopifyProduct; validation: ShopifyProductValidationResult } | null {
    const existing = this.getProduct(id)
    if (!existing) return null

    const merged: ShopifyProductCreateInput = {
      title: input.title ?? existing.title,
      descriptionHtml: input.descriptionHtml ?? existing.descriptionHtml,
      vendor: input.vendor ?? existing.vendor,
      productType: input.productType ?? existing.productType,
      tags: input.tags ?? existing.tags,
      productId: existing.productId,
      seoTitle: input.seoTitle ?? existing.seoTitle,
      seoDescription: input.seoDescription ?? existing.seoDescription,
      price: input.price ?? existing.price,
      compareAtPrice: input.compareAtPrice ?? existing.compareAtPrice,
      sku: input.sku ?? existing.sku,
      inventoryQty: input.inventoryQty ?? existing.inventoryQty,
      isPersonalized: input.isPersonalized ?? existing.isPersonalized,
      personalizationFields: input.personalizationFields ?? existing.personalizationFields,
    }

    const validation = validateShopifyProduct(merged)

    const now = new Date().toISOString()
    const status = input.status ?? existing.status

    this.db.prepare(`
      UPDATE shopify_products SET
        title = ?, description_html = ?,
        vendor = ?, product_type = ?, tags = ?,
        status = ?, seo_title = ?, seo_description = ?,
        price = ?, compare_at_price = ?, sku = ?, inventory_qty = ?,
        is_personalized = ?, personalization_fields = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      merged.title, merged.descriptionHtml,
      merged.vendor ?? null, merged.productType ?? null, JSON.stringify(merged.tags),
      status, merged.seoTitle ?? null, merged.seoDescription ?? null,
      merged.price ?? null, merged.compareAtPrice ?? null,
      merged.sku ?? null, merged.inventoryQty,
      merged.isPersonalized ? 1 : 0, merged.personalizationFields ?? null,
      now,
      id,
    )

    const updated = this.getProduct(id)!
    return { product: updated, validation }
  }

  /**
   * Delete a Shopify product.
   */
  deleteProduct(id: string): boolean {
    const existing = this.getProduct(id)
    if (!existing) return false
    this.db.prepare('DELETE FROM shopify_products WHERE id = ?').run(id)
    return true
  }

  /**
   * Run the 10-point pre-ads checklist.
   */
  getPreAdsAudit(id: string): PreAdsCheckResult | null {
    const product = this.getProduct(id)
    if (!product) return null
    return validatePreAdsChecklist(product)
  }

  /**
   * Get CRO suggestions for a product.
   */
  getCroSuggestionsForProduct(id: string): CroSuggestion[] | null {
    const product = this.getProduct(id)
    if (!product) return null
    return getCroSuggestions(product)
  }

  /**
   * List all Shopify products.
   */
  listProducts(): ShopifyProduct[] {
    const rows = this.db.prepare('SELECT * FROM shopify_products ORDER BY created_at DESC').all() as Record<string, unknown>[]
    return rows.map((r) => this.rowToProduct(r))
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private rowToProduct(row: Record<string, unknown>): ShopifyProduct {
    return {
      id: row.id as string,
      productId: row.product_id as string,
      shopifyProductId: (row.shopify_product_id as string) ?? undefined,
      title: row.title as string,
      descriptionHtml: row.description_html as string,
      vendor: (row.vendor as string) ?? undefined,
      productType: (row.product_type as string) ?? undefined,
      tags: this.parseTags(row.tags),
      status: row.status as 'draft' | 'active' | 'archived',
      seoTitle: (row.seo_title as string) ?? undefined,
      seoDescription: (row.seo_description as string) ?? undefined,
      price: (row.price as number) ?? undefined,
      compareAtPrice: (row.compare_at_price as number) ?? undefined,
      sku: (row.sku as string) ?? undefined,
      inventoryQty: (row.inventory_qty as number) ?? 0,
      isPersonalized: (row.is_personalized as number) === 1,
      personalizationFields: (row.personalization_fields as string) ?? undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  private parseTags(tags: unknown): string[] {
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      }
    }
    return Array.isArray(tags) ? tags : []
  }
}
