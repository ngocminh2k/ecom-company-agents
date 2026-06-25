import { Router, type Router as RouterType } from 'express'
import { getDb } from '../db.js'
import { randomUUID } from 'node:crypto'

export const campaignsRouter: RouterType = Router()

campaignsRouter.get('/', (_req, res) => {
  const db = getDb()
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all()
  res.json({ campaigns })
})

campaignsRouter.post('/', (req: any, res) => {
  const db = getDb()
  const { name, platform, budget, productIds } = req.body

  if (!name || !platform) {
    return res.status(400).json({ error: true, message: 'name and platform are required' })
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO campaigns (id, name, platform, budget, product_ids)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, platform, budget || null, productIds ? JSON.stringify(productIds) : null)

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)
  res.status(201).json({ campaign })
})

campaignsRouter.patch('/:id/status', (req: any, res) => {
  const db = getDb()
  const { status } = req.body
  const validStatuses = ['draft', 'active', 'paused', 'completed']

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: true,
      message: `Status must be one of: ${validStatuses.join(', ')}`,
    })
  }

  db.prepare('UPDATE campaigns SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(status, req.params.id)

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id)
  res.json({ campaign })
})
