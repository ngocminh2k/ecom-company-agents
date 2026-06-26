'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type FinanceAlert } from '@/lib/api'
import { ArrowLeft, DollarSign, RefreshCw, AlertTriangle, TrendingDown } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

export default function ReconciliationPage() {
  const router = useRouter()
  const [recon, setRecon] = useState<{ summary?: { date: string; totalRevenue: number; totalFees: number; totalAdSpend: number; netRevenue: number; byChannel: Record<string, unknown> } }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/finance/reconciliation/${today}`)
      const data = await res.json()
      setRecon(data)
    } catch { setError('Failed to load reconciliation') }
    finally { setLoading(false) }
  }, [today])

  useEffect(() => { load() }, [load])

  const s = recon.summary

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/finance')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Reconciliation</h1>
          <p className="text-sm text-[var(--text-secondary)]">{today}</p>
        </div>
        <Button onClick={load} variant="secondary"><RefreshCw size={14} /> Refresh</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} height={80} />)}
        </div>
      ) : !s ? (
        <EmptyState icon={<DollarSign size={24} />} title="No data for today"
          description="Run a reconciliation to see daily finance data" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card padding="lg"><div className="text-xs text-[var(--text-secondary)]">Revenue</div><div className="text-xl font-semibold">${s.totalRevenue.toFixed(2)}</div></Card>
            <Card padding="lg"><div className="text-xs text-[var(--text-secondary)]">Fees</div><div className="text-xl font-semibold">${s.totalFees.toFixed(2)}</div></Card>
            <Card padding="lg"><div className="text-xs text-[var(--text-secondary)]">Ad Spend</div><div className="text-xl font-semibold">${s.totalAdSpend.toFixed(2)}</div></Card>
            <Card padding="lg"><div className="text-xs text-[var(--text-secondary)]">Net</div><div className={`text-xl font-semibold ${s.netRevenue < 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
              ${s.netRevenue.toFixed(2)}
            </div></Card>
          </div>

          <Card title="By Channel" padding="lg">
            {Object.keys(s.byChannel).length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No channel data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(s.byChannel).map(([ch, data]: [string, any]) => (
                  <div key={ch} className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0">
                    <span className="font-medium text-sm">{ch}</span>
                    <span className="text-sm">${(data.revenue || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
