import { Router, type Router as RouterType } from 'express'

export const artifactsRouter: RouterType = Router()

artifactsRouter.get('/', (_req, res) => {
  res.json({
    artifacts: [],
    message: 'Artifact system coming in Phase 2',
  })
})
