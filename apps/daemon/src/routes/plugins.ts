import { Router } from 'express'

export const pluginsRouter = Router()

pluginsRouter.get('/', (_req, res) => {
  res.json({
    plugins: [],
    message: 'Plugin system coming in Phase 2',
  })
})
