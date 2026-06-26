/**
 * Amazon Routes — aggregates all sub-routers under a single mount
 */
import { Router, type Router as RouterType } from 'express'
import { listingsRouter } from './listings.js'
import { healthRouter } from './health.js'
import { adsRouter } from './ads.js'

export const amazonRouter: RouterType = Router()
amazonRouter.use(listingsRouter)
amazonRouter.use(healthRouter)
amazonRouter.use(adsRouter)
