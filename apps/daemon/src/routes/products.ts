import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { randomUUID } from 'node:crypto'

export const productsRouter: RouterType = Router()

// List products
productsRouter.get('/', (_req, res) => {
  const db = getDb()
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all()
  res.json({ products })
})

// Create product
productsRouter.post('/', (req: any, res) => {
  const db = getDb()
  const { name, type = 'pod', description, sku, price, cost, supplierId } = req.body

  if (!name) {
    return res.status(400).json({ error: true, message: 'Product name is required' })
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO products (id, name, type, description, sku, price, cost, supplier_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, type, description || null, sku || null, price || null, cost || null, supplierId || null)

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  res.status(201).json({ product })
})

// Get product by id
productsRouter.get('/:id', (req: any, res) => {
  const db = getDb()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!product) {
    return res.status(404).json({ error: true, message: 'Product not found' })
  }
  res.json({ product })
})

// Update product
productsRouter.patch('/:id', (req: any, res) => {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any
  if (!existing) {
    return res.status(404).json({ error: true, message: 'Product not found' })
  }

  const { name, type, description, sku, price, cost, status, supplierId } = req.body
  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      description = COALESCE(?, description),
      sku = COALESCE(?, sku),
      price = COALESCE(?, price),
      cost = COALESCE(?, cost),
      status = COALESCE(?, status),
      supplier_id = COALESCE(?, supplier_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || null, type || null, description || null,
    sku || null, price || null, cost || null,
    status || null, supplierId || null, req.params.id
  )

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  res.json({ product })
})
