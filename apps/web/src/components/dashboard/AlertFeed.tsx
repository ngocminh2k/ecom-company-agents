'use client'

import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { Bell } from 'lucide-react'

export type AlertItem = {
  id: string
  message: string
  severity: string
  createdAt: string
}

type Props = {
  alerts: AlertItem[]
  onAcknowledge: (id: string) => void
  loading?: boolean
  title?: string
}

const severityColor: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-400',
}

const severityBadge: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  critical: 'error',
  high: 'warning',
  medium: 'warning',
  low: 'info',
}

export function AlertFeed({ alerts, onAcknowledge, loading = false, title = 'Active Alerts' }: Props) {
  return (
    <Card title={title} padding="sm">
      {loading ? (
        <div className="space-y-3 p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={10} height={10} className="rounded-full !w-2.5 !h-2.5" />
              <div className="flex-1 space-y-1">
                <Skeleton height={12} width="70%" />
                <Skeleton height={10} width="40%" />
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Bell size={24} />}
          title="All clear"
          description="No active alerts right now."
          className="!p-8"
        />
      ) : (
        <ul className="divide-y divide-[var(--border-light)]">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-3 py-3 px-2">
              <span
                className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${severityColor[alert.severity] || 'bg-gray-400'}`}
                title={alert.severity}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] break-words">{alert.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={severityBadge[alert.severity] || 'neutral'}>{alert.severity}</Badge>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAcknowledge(alert.id)}
                className="shrink-0"
              >
                Acknowledge
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
