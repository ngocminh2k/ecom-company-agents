'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, type VendorScorecard } from '@/lib/api'
import { ArrowLeft, Truck, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

export default function VendorsPage() {
  const router = useRouter()
  const [comparison, setComparison] = useState<VendorScorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.fulfillment.vendorScorecards.comparison()
      setComparison(res.comparison)
    } catch { setError('Failed to load vendor data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  const scoreColor = (score: number) =>
    score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)'

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/fulfillment')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Scorecards</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Comparison & performance tracking</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} height={80} />)}</div>
      ) : comparison.length === 0 ? (
        <EmptyState icon={<Truck size={24} />} title="No vendor data"
          description="Create vendor scorecards from the fulfillment dashboard" />
      ) : (
        <div className="space-y-4">
          {comparison.map(c => (
            <Card key={c.id} padding="lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award size={16} style={{ color: scoreColor(c.overall_score) }} />
                  <span className="font-medium">{c.vendor_id}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{c.period}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${c.overall_score}%`, backgroundColor: scoreColor(c.overall_score) }} />
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: scoreColor(c.overall_score) }}>{c.overall_score}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
                <div>On-time: {c.on_time_delivery ?? '—'}%</div>
                <div>Defect rate: {c.defect_rate ?? '—'}%</div>
                <div>Response: {c.response_time_hours ?? '—'}h</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
