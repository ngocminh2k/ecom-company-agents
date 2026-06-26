/**
 * Amazon Account Health Storage (SQLite) — extracted from amazon.ts
 */
import { getDb } from '../../db.js'
import type { AccountHealthStorage, AccountHealthMetrics, AccountIncident } from '@ngocminh2k/ecommerce-core'

export function createAccountHealthStorage(): AccountHealthStorage {
  return {
    getMetrics(): AccountHealthMetrics {
      const db = getDb()
      const row = db.prepare('SELECT * FROM amazon_account_health ORDER BY updated_at DESC LIMIT 1').get() as any
      if (row) {
        return {
          odr: row.odr, cancellationRate: row.cancellation_rate,
          lateShipmentRate: row.late_shipment_rate, validTrackingRate: row.valid_tracking_rate,
          overallHealth: row.overall_health,
        }
      }
      return { odr: 0, cancellationRate: 0, lateShipmentRate: 0, validTrackingRate: 1, overallHealth: 'good' }
    },
    setMetrics(metrics: AccountHealthMetrics): void {
      const db = getDb()
      const existing = db.prepare('SELECT id FROM amazon_account_health ORDER BY updated_at DESC LIMIT 1').get() as any
      const now = new Date().toISOString()
      if (existing) {
        db.prepare(`UPDATE amazon_account_health SET odr = ?, cancellation_rate = ?, late_shipment_rate = ?, valid_tracking_rate = ?, overall_health = ?, updated_at = ? WHERE id = ?`).run(
          metrics.odr, metrics.cancellationRate, metrics.lateShipmentRate, metrics.validTrackingRate, metrics.overallHealth, now, existing.id)
      } else {
        db.prepare(`INSERT INTO amazon_account_health (id, odr, cancellation_rate, late_shipment_rate, valid_tracking_rate, overall_health, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
          'health-1', metrics.odr, metrics.cancellationRate, metrics.lateShipmentRate, metrics.validTrackingRate, metrics.overallHealth, now, now)
      }
    },
    getIncidents(): AccountIncident[] {
      const db = getDb()
      return db.prepare('SELECT * FROM amazon_account_incidents ORDER BY reported_at DESC').all() as AccountIncident[]
    },
    getIncidentsByStatus(status: AccountIncident['status']): AccountIncident[] {
      const db = getDb()
      return db.prepare('SELECT * FROM amazon_account_incidents WHERE status = ? ORDER BY reported_at DESC').all(status) as AccountIncident[]
    },
    logIncident(incident: AccountIncident): AccountIncident {
      const db = getDb()
      db.prepare(`INSERT INTO amazon_account_incidents (id, type, severity, description, category, reported_at, status, resolution) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        incident.id, incident.type, incident.severity, incident.description, incident.category ?? null, incident.reportedAt, incident.status, incident.resolution ?? null)
      return incident
    },
  }
}
