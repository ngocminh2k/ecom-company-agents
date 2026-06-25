import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { randomUUID } from 'node:crypto'

export const ordersRouter: RouterType = Router()

ordersRouter.get('/', (_req, res) => {
  const db = getDb()
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  res.json({ orders })
})

ordersRouter.post('/', (req: any, res) => {
  const db = getDb()
  const { productId, quantity = 1, total, customerEmail, shippingAddress } = req.body

  if (!productId) {
    return res.status(400).json({ error: true, message: 'productId is required' })
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO orders (id, product_id, quantity, total, customer_email, shipping_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, productId, quantity, total || null, customerEmail || null, shippingAddress || null)

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  res.status(201).json({ order })
})

ordersRouter.get('/:id', (req: any, res) => {
  const db = getDb()
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) {
    return res.status(404).json({ error: true, message: 'Order not found' })
  }
  res.json({ order })
})

ordersRouter.patch('/:id/status', (req: any, res) => {
  const db = getDb()
  const { status, trackingNumber } = req.body
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: true,
      message: `Status must be one of: ${validStatuses.join(', ')}`,
    })
  }

  db.prepare(`
    UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), updated_at = datetime('now')
    WHERE id = ?
  `).run(status, trackingNumber || null, req.params.id)

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  res.json({ order })
})
