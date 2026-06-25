import { Router, type Router as RouterType } from 'express'

export const pluginsRouter: RouterType = Router()

pluginsRouter.get('/', (_req, res) => {
  res.json({
    plugins: [],
    message: 'Plugin system coming in Phase 2',
  })
})
