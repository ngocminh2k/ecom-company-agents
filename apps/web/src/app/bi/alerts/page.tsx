'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, DollarSign, Activity } from 'lucide-react'
import { api, type FinanceAlert, type SlaDashboard, type SlaBreach } from '@/lib/api'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Table } from '@/components/Table'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { AlertFeed } from '@/components/dashboard/AlertFeed'

const severityColor: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400',
}

export default function BiAlertsPage() {
  const [dashboard, setDashboard] = useState<SlaDashboard | null>(null)
  const [breaches, setBreaches] = useState<SlaBreach[]>([])
  const [alerts, setAlerts] = useState<FinanceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sla, bre, fin] = await Promise.all([
        api.bi.sla.dashboard(),
        api.bi.sla.breaches(),
        api.finance.alerts.list(),
      ])
      setDashboard(sla.slaDashboard)
      setBreaches(bre.breaches)
      setAlerts(fin.alerts)
    } catch {
      setError('Failed to load alert data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await api.finance.alerts.acknowledge(id)
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
    } catch {
      // retry on next load
    }
  }, [])

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  const slaCompliancePct = dashboard?.complianceRate ?? 0
  const slaComplianceColor = slaCompliancePct >= 95 ? 'text-[var(--success)]' : slaCompliancePct >= 80 ? 'text-[var(--warning)]' : 'text-[var(--error)]'
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">BI Alerts</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">SLA monitoring, breaches, and finance alerts</p>
      </div>

      {/* Section 1: SLA Dashboard Summary */}
      <h2 className="font-semibold text-sm mb-4">SLA Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card padding="sm">
          {loading ? (
            <div className="p-2 space-y-2"><Skeleton height={12} width="60%" /><Skeleton height={28} width="40%" /></div>
          ) : dashboard ? (
            <div className="p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-secondary)]">Compliance Rate</span>
                <Activity size={14} className="text-[var(--text-tertiary)]" />
              </div>
              <div className={`text-2xl font-semibold ${slaComplianceColor}`}>{slaCompliancePct}%</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">Last {dashboard.periodDays} days</div>
            </div>
          ) : null}
        </Card>
        <Card padding="sm">
          {loading ? (
            <div className="p-2 space-y-2"><Skeleton height={12} width="60%" /><Skeleton height={28} width="40%" /></div>
          ) : dashboard ? (
            <div className="p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-secondary)]">Total Breaches</span>
                <AlertTriangle size={14} className="text-[var(--text-tertiary)]" />
              </div>
              <div className="text-2xl font-semibold text-red-500">{dashboard.totalBreached}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">{dashboard.totalActive} active events</div>
            </div>
          ) : null}
        </Card>
        <Card padding="sm">
          {loading ? (
            <div className="p-2 space-y-2"><Skeleton height={12} width="60%" /><Skeleton height={28} width="40%" /></div>
          ) : dashboard ? (
            <div className="p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-secondary)]">Monitored Processes</span>
                <Activity size={14} className="text-[var(--text-tertiary)]" />
              </div>
              <div className="text-2xl font-semibold">{Object.keys(dashboard.byProcess).length}</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">Active SLA definitions</div>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Section 2: Active SLA Breaches */}
      <h2 className="font-semibold text-sm mb-4">Active SLA Breaches</h2>
      <div className="mb-8">
        {loading ? (
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-card overflow-hidden">
            <table className="w-full text-sm"><thead><tr className="border-b border-[var(--border-light)]">
              {['Process', 'Status', 'Severity', 'Date'].map((h) => (
                <th key={h} className="px-5 py-3 text-left font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead><tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-light)] last:border-0">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><Skeleton height={14} width={100} /></td>
                  ))}
                </tr>
              ))}
            </tbody></table>
          </div>
        ) : breaches.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={24} />}
            title="All clear"
            description="No active SLA breaches."
          />
        ) : (
          <Table
            data={breaches}
            columns={[
              { key: 'processName', header: 'Process', render: (b: SlaBreach) => <span className="font-medium">{b.processName}</span> },
              { key: 'status', header: 'Status', render: (b: SlaBreach) => <Badge variant={b.status === 'breached' ? 'error' : b.status === 'warning' ? 'warning' : 'info'}>{b.status}</Badge> },
              { key: 'severity', header: 'Severity', render: (b: SlaBreach) => (
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${severityColor[b.severity] || 'bg-gray-400'}`} />
                  <span className="capitalize">{b.severity}</span>
                </span>
              )},
              { key: 'createdAt', header: 'Date', render: (b: SlaBreach) => new Date(b.createdAt).toLocaleDateString(), align: 'right' },
            ]}
            keyExtractor={(b: SlaBreach) => b.id}
          />
        )}
      </div>

      {/* Section 3: Finance Alerts */}
      <h2 className="font-semibold text-sm mb-4">Finance Alerts</h2>
      {loading ? (
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-card overflow-hidden p-5">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton width={10} height={10} className="rounded-full !w-2.5 !h-2.5" />
                <div className="flex-1 space-y-1"><Skeleton height={12} width="70%" /><Skeleton height={10} width="40%" /></div>
              </div>
            ))}
          </div>
        </div>
      ) : unacknowledgedAlerts.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={24} />}
          title="All clear"
          description="No finance alerts right now."
        />
      ) : (
        <AlertFeed
          title="Finance Alerts"
          alerts={unacknowledgedAlerts}
          onAcknowledge={handleAcknowledge}
        />
      )}
    </div>
  )
}
