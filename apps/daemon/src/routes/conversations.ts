import { Router } from 'express'
import { db } from '../db.js'

export const conversationsRouter = Router()

conversationsRouter.get('/', (req, res) => {
  try {
    const conversations = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC').all()
    res.json({ conversations })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

conversationsRouter.post('/', (req, res) => {
  try {
    const { title, skillId } = req.body
    const id = `conv_${Date.now()}`
    db.prepare('INSERT INTO conversations (id, title, skill_id) VALUES (?, ?, ?)').run(id, title, skillId)
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)
    res.json({ data: conv })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

conversationsRouter.delete('/:id', (req, res) => {
  try {
    const id = req.params.id
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id)
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

conversationsRouter.get('/:id/messages', (req, res) => {
  try {
    const id = req.params.id
    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all()
    res.json({ data: messages })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})

conversationsRouter.post('/:id/messages', (req, res) => {
  try {
    const id = req.params.id
    const { userMessage, assistantMessage, agentId } = req.body
    const tx = db.transaction(() => {
      if (userMessage) {
        db.prepare('INSERT INTO messages (id, conversation_id, role, content, agent_id) VALUES (?, ?, ?, ?, ?)').run(`msg_${Date.now()}_u`, id, 'user', userMessage, null)
      }
      if (assistantMessage) {
        db.prepare('INSERT INTO messages (id, conversation_id, role, content, agent_id) VALUES (?, ?, ?, ?, ?)').run(`msg_${Date.now()}_a`, id, 'assistant', assistantMessage, agentId)
      }
    })
    tx()
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: true, message: err.message })
  }
})
