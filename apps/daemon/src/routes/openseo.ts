import { Router } from 'express'
export const openSeoRouter = Router()

openSeoRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', integration: 'open-seo' })
})
