import { Router, type Router as RouterType } from 'express'

export const healthRouter: RouterType = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})
