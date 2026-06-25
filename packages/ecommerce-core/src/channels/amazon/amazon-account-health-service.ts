/**
 * Amazon Account Health Service — monitor and manage account health metrics.
 *
 * ADR-020: ODR < 1%, cancellation < 2.5%, late shipment < 4%
 * Pure business logic. No agent calls.
 * Uses AccountHealthStorage interface for persistence (SQLite in production).
 */

export interface AccountHealthMetrics {
  odr: number           // Order Defect Rate (0-1)
  cancellationRate: number
  lateShipmentRate: number
  validTrackingRate: number
  overallHealth: 'good' | 'at_risk' | 'critical'
}

export interface AccountIncident {
  id: string
  type: 'policy_violation' | 'customer_complaint' | 'intellectual_property' | 'safety_concern' | 'performance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  category: string
  reportedAt: string
  status: 'open' | 'investigating' | 'resolved'
  resolution?: string
}

export interface HealthScoreResult {
  score: number
  odr: number
  cancellationRate: number
  lateShipmentRate: number
  validTrackingRate: number
  breakdown: Array<{
    metric: string
    value: number
    weight: number
    contribution: number
    status: 'pass' | 'warn' | 'fail'
  }>
}

export interface ActionPlanItem {
  priority: 'critical' | 'high' | 'medium' | 'low'
  action: string
  reason: string
  target: string
}

import { ODR_THRESHOLD, CANCELLATION_RATE_THRESHOLD, LATE_SHIPMENT_RATE_THRESHOLD, VALID_TRACKING_RATE_THRESHOLD } from './amazon-entity.js'

/**
 * Storage interface for account health.
 */
export interface AccountHealthStorage {
  getMetrics(): AccountHealthMetrics
  setMetrics(metrics: AccountHealthMetrics): void
  getIncidents(): AccountIncident[]
  getIncidentsByStatus(status: AccountIncident['status']): AccountIncident[]
  logIncident(incident: AccountIncident): AccountIncident
}

export class AmazonAccountHealthService {
  constructor(private storage: AccountHealthStorage) {}

  /**
   * Update account health metrics.
   */
  checkAccountHealth(metrics: AccountHealthMetrics): AccountHealthMetrics {
    this.storage.setMetrics(metrics)

    // Determine overall health
    const issues: string[] = []
    if (metrics.odr >= ODR_THRESHOLD) issues.push('odr')
    if (metrics.cancellationRate >= CANCELLATION_RATE_THRESHOLD) issues.push('cancellation')
    if (metrics.lateShipmentRate >= LATE_SHIPMENT_RATE_THRESHOLD) issues.push('late_shipment')
    if (metrics.validTrackingRate < VALID_TRACKING_RATE_THRESHOLD) issues.push('valid_tracking')

    const overallHealth: 'good' | 'at_risk' | 'critical' =
      issues.length === 0 ? 'good'
      : issues.length <= 2 && !issues.includes('odr') ? 'at_risk'
      : 'critical'

    this.storage.setMetrics({ ...metrics, overallHealth })
    return { ...metrics, overallHealth }
  }

  /**
   * Log an account health incident.
   */
  logIncident(incident: Omit<AccountIncident, 'id'>): AccountIncident {
    const newIncident: AccountIncident = {
      ...incident,
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    return this.storage.logIncident(newIncident)
  }

  /**
   * Get all logged incidents.
   */
  getIncidents(): AccountIncident[] {
    return this.storage.getIncidents()
  }

  /**
   * Get incidents filtered by status.
   */
  getIncidentsByStatus(status: AccountIncident['status']): AccountIncident[] {
    return this.storage.getIncidentsByStatus(status)
  }

  /**
   * Calculate health score 0-100.
   */
  getHealthScore(): HealthScoreResult {
    const metrics = this.storage.getMetrics()
    const weights = {
      odr: 35,
      cancellationRate: 25,
      lateShipmentRate: 25,
      validTrackingRate: 15,
    }

    const odrScore = Math.max(0, 100 - (metrics.odr / ODR_THRESHOLD) * 100)
    const cancellationScore = Math.max(0, 100 - (metrics.cancellationRate / CANCELLATION_RATE_THRESHOLD) * 100)
    const lateShipmentScore = Math.max(0, 100 - (metrics.lateShipmentRate / LATE_SHIPMENT_RATE_THRESHOLD) * 100)
    const validTrackingScore = Math.min(100, (metrics.validTrackingRate / VALID_TRACKING_RATE_THRESHOLD) * 100)

    const breakdown = [
      { metric: 'Order Defect Rate (ODR)', value: metrics.odr, weight: weights.odr, contribution: (odrScore * weights.odr) / 100, status: metrics.odr < ODR_THRESHOLD ? 'pass' as const : metrics.odr < ODR_THRESHOLD * 1.5 ? 'warn' as const : 'fail' as const },
      { metric: 'Cancellation Rate', value: metrics.cancellationRate, weight: weights.cancellationRate, contribution: (cancellationScore * weights.cancellationRate) / 100, status: metrics.cancellationRate < CANCELLATION_RATE_THRESHOLD ? 'pass' as const : metrics.cancellationRate < CANCELLATION_RATE_THRESHOLD * 1.5 ? 'warn' as const : 'fail' as const },
      { metric: 'Late Shipment Rate', value: metrics.lateShipmentRate, weight: weights.lateShipmentRate, contribution: (lateShipmentScore * weights.lateShipmentRate) / 100, status: metrics.lateShipmentRate < LATE_SHIPMENT_RATE_THRESHOLD ? 'pass' as const : metrics.lateShipmentRate < LATE_SHIPMENT_RATE_THRESHOLD * 1.5 ? 'warn' as const : 'fail' as const },
      { metric: 'Valid Tracking Rate', value: metrics.validTrackingRate, weight: weights.validTrackingRate, contribution: (validTrackingScore * weights.validTrackingRate) / 100, status: metrics.validTrackingRate >= VALID_TRACKING_RATE_THRESHOLD ? 'pass' as const : metrics.validTrackingRate >= VALID_TRACKING_RATE_THRESHOLD * 0.9 ? 'warn' as const : 'fail' as const },
    ]

    const totalScore = Math.round(breakdown.reduce((sum, b) => sum + b.contribution, 0))

    return {
      score: totalScore,
      odr: metrics.odr,
      cancellationRate: metrics.cancellationRate,
      lateShipmentRate: metrics.lateShipmentRate,
      validTrackingRate: metrics.validTrackingRate,
      breakdown,
    }
  }

  /**
   * Get recommended actions based on account health.
   */
  getActionPlan(): ActionPlanItem[] {
    const metrics = this.storage.getMetrics()
    const incidents = this.storage.getIncidents()
    const plan: ActionPlanItem[] = []

    if (metrics.odr >= ODR_THRESHOLD) {
      plan.push({
        priority: 'critical',
        action: 'Investigate and resolve Order Defect Rate issues',
        reason: `ODR is ${(metrics.odr * 100).toFixed(2)}%, exceeding the 1% threshold`,
        target: `Reduce ODR to below ${(ODR_THRESHOLD * 100).toFixed(0)}%`,
      })
    }

    if (metrics.cancellationRate >= CANCELLATION_RATE_THRESHOLD) {
      plan.push({
        priority: 'high',
        action: 'Reduce cancellation rate by improving inventory accuracy',
        reason: `Cancellation rate is ${(metrics.cancellationRate * 100).toFixed(2)}%, exceeding ${(CANCELLATION_RATE_THRESHOLD * 100).toFixed(1)}% threshold`,
        target: `Reduce cancellations to below ${(CANCELLATION_RATE_THRESHOLD * 100).toFixed(1)}%`,
      })
    }

    if (metrics.lateShipmentRate >= LATE_SHIPMENT_RATE_THRESHOLD) {
      plan.push({
        priority: 'high',
        action: 'Improve shipping speed and accuracy',
        reason: `Late shipment rate is ${(metrics.lateShipmentRate * 100).toFixed(2)}%, exceeding ${(LATE_SHIPMENT_RATE_THRESHOLD * 100).toFixed(0)}% threshold`,
        target: `Reduce late shipments to below ${(LATE_SHIPMENT_RATE_THRESHOLD * 100).toFixed(0)}%`,
      })
    }

    if (metrics.validTrackingRate < VALID_TRACKING_RATE_THRESHOLD) {
      plan.push({
        priority: 'medium',
        action: 'Ensure valid tracking information for all shipments',
        reason: `Valid tracking rate is ${(metrics.validTrackingRate * 100).toFixed(1)}%, below ${(VALID_TRACKING_RATE_THRESHOLD * 100).toFixed(0)}% threshold`,
        target: `Achieve ${(VALID_TRACKING_RATE_THRESHOLD * 100).toFixed(0)}%+ valid tracking rate`,
      })
    }

    // Open incidents
    const openIncidents = incidents.filter((i) => i.status === 'open')
    if (openIncidents.length > 0) {
      openIncidents.forEach((incident) => {
        plan.push({
          priority: incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'high' : 'medium',
          action: `Respond to ${incident.type} incident: ${incident.description.slice(0, 100)}`,
          reason: `Open ${incident.severity} severity incident reported on ${incident.reportedAt}`,
          target: 'Resolve and close the incident within SLA',
        })
      })
    }

    if (plan.length === 0) {
      plan.push({
        priority: 'low',
        action: 'Maintain current account health practices',
        reason: 'All metrics are within acceptable thresholds',
        target: 'Keep ODR < 1%, cancellation < 2.5%, late shipment < 4%',
      })
    }

    return plan
  }
}
