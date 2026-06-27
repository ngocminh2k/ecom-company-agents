'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const classificationColor: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  scale: 'success',
  keep: 'info',
  optimize: 'warning',
  stop: 'error',
}

export default function PnLPage() {
  const router = useRouter()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/finance/pnl/${new Date().toISOString().slice(0, 7)}`)
      const data = await res.json()
      setReport(data.report)
    } catch { setError('Failed to load PnL') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/finance')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">PnL by SKU</h1>
          <p className="text-sm text-[var(--text-secondary)]">{report?.period || 'Loading…'}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} height={60} />)}</div>
      ) : !report || report.skus.length === 0 ? (
        <EmptyState icon={<TrendingUp size={24} />} title="No PnL data"
          description="Run PnL calculation for the current period" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card padding="lg">
              <div className="text-xs text-[var(--text-secondary)]">Revenue</div>
              <div className="text-xl font-semibold">${report.totalRevenue.toFixed(2)}</div>
            </Card>
            <Card padding="lg">
              <div className="text-xs text-[var(--text-secondary)]">Contribution</div>
              <div className={`text-xl font-semibold ${report.totalContribution < 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                ${report.totalContribution.toFixed(2)}
              </div>
            </Card>
            <Card padding="lg">
              <div className="text-xs text-[var(--text-secondary)]">Scale</div>
              <div className="text-xl font-semibold text-[var(--success)]">{report.classifications?.scale || 0}</div>
            </Card>
            <Card padding="lg">
              <div className="text-xs text-[var(--text-secondary)]">Stop</div>
              <div className="text-xl font-semibold text-[var(--error)]">{report.classifications?.stop || 0}</div>
            </Card>
          </div>

          <Card title="SKU Breakdown" padding="sm">
            {report.skus.map((sku: any) => (
              <div key={sku.sku} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-light)] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sku.sku}</span>
                    <Badge variant={classificationColor[sku.classification] || 'neutral'}>{sku.classification}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">{sku.unitsSold || 0} units</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${sku.contributionMargin < 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                    ${sku.contributionMargin?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">margin</div>
                </div>
                {sku.grossMargin != null && (
                  <div className="text-right w-16">
                    <div className="text-sm font-medium">{sku.grossMargin}%</div>
                    <div className="text-[10px] text-[var(--text-tertiary)]">gross</div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
