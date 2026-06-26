/**
 * Amazon Account Health Routes
 */
import { Router, type Router as RouterType } from 'express'
import { createAccountHealthStorage } from './health-storage.js'
import { AmazonAccountHealthService } from '@ngocminh2k/ecommerce-core'

export const healthRouter: RouterType = Router()

const storage = createAccountHealthStorage()
const service = new AmazonAccountHealthService(storage)

healthRouter.post('/health/check', (req: any, res) => {
  const { odr, cancellationRate, lateShipmentRate, validTrackingRate } = req.body
  const metrics = service.checkAccountHealth({ odr: odr ?? 0, cancellationRate: cancellationRate ?? 0, lateShipmentRate: lateShipmentRate ?? 0, validTrackingRate: validTrackingRate ?? 1, overallHealth: 'good' })
  res.json({ metrics })
})

healthRouter.get('/health/score', (_req, res) => {
  res.json({ health: service.getHealthScore() })
})

healthRouter.get('/health/action-plan', (_req, res) => {
  res.json({ actions: service.getActionPlan() })
})

healthRouter.post('/health/incidents', (req: any, res) => {
  const { type, severity, description, category } = req.body
  if (!type || !severity || !description) return res.status(400).json({ error: true, message: 'type, severity, and description are required' })
  res.status(201).json({ incident: service.logIncident({ type, severity, description, category, reportedAt: new Date().toISOString(), status: 'open' }) })
})

healthRouter.get('/health/incidents', (req: any, res) => {
  const status = req.query.status as string | undefined
  res.json({ incidents: status ? service.getIncidentsByStatus(status as any) : service.getIncidents() })
})
