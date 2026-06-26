'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { DollarSign, TrendingUp, AlertTriangle, BarChart3, ArrowRight } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

export default function FinancePage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<{ severity: string; message: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.finance.alerts.list()
      setAlerts(res.alerts)
    } catch { setError('Failed to load finance data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length

  if (error) return <div className="p-6 lg:p-8 max-w-7xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Reconciliation · PnL · Alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button onClick={() => router.push('/finance/reconciliation')} className="text-left">
          <Card padding="lg" className="hover:border-[var(--accent)]/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--info-bg)] flex items-center justify-center"><DollarSign size={18} className="text-[var(--info)]" /></div>
              <div><div className="font-medium">Reconciliation</div><div className="text-xs text-[var(--text-secondary)]">Daily finance records</div></div>
              <ArrowRight size={14} className="text-[var(--text-tertiary)] ml-auto" />
            </div>
          </Card>
        </button>
        <button onClick={() => router.push('/finance/pnl')} className="text-left">
          <Card padding="lg" className="hover:border-[var(--accent)]/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center"><TrendingUp size={18} className="text-[var(--success)]" /></div>
              <div><div className="font-medium">PnL by SKU</div><div className="text-xs text-[var(--text-secondary)]">Profit & loss per product</div></div>
              <ArrowRight size={14} className="text-[var(--text-tertiary)] ml-auto" />
            </div>
          </Card>
        </button>
        <button onClick={() => router.push('/bi/alerts')} className="text-left">
          <Card padding="lg" className="hover:border-[var(--accent)]/30 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center"><AlertTriangle size={18} className="text-[var(--warning)]" /></div>
              <div><div className="font-medium">Alerts</div><div className="text-xs text-[var(--text-secondary)]">{criticalAlerts > 0 ? `${criticalAlerts} critical` : 'No critical alerts'}</div></div>
              <ArrowRight size={14} className="text-[var(--text-tertiary)] ml-auto" />
            </div>
          </Card>
        </button>
      </div>

      {loading ? <Skeleton height={120} /> : alerts.length > 0 && (
        <Card title="Recent Alerts" padding="lg">
          <div className="space-y-2">
            {alerts.slice(0, 5).map(a => (
              <div key={a.message} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  a.severity === 'critical' ? 'bg-[var(--error)]' :
                  a.severity === 'high' ? 'bg-[var(--warning)]' : 'bg-[var(--info)]'
                }`} />
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
