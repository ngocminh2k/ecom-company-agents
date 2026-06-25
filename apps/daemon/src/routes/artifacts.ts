import { Router } from 'express'

export const artifactsRouter = Router()

artifactsRouter.get('/', (_req, res) => {
  res.json({
    artifacts: [],
    message: 'Artifact system coming in Phase 2',
  })
})
