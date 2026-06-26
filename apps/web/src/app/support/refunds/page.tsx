'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type RefundRequest } from '@/lib/api'
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, AlertTriangle, DollarSign } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  pending_approval: 'warning',
  approved: 'info',
  processed: 'success',
  disputed: 'error',
  closed: 'neutral',
}

export default function RefundsPage() {
  const router = useRouter()
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.support.refunds.list()
      setRefunds(res.refunds)
    } catch { setError('Failed to load refunds') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalPending = refunds.filter(r => r.status === 'pending_approval').length
  const totalAmount = refunds.reduce((s, r) => s + r.amount, 0)

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/support/tickets')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Refunds</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${refunds.length} requests · $${totalAmount.toFixed(2)} total · ${totalPending} pending`}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
              <AlertTriangle size={18} className="text-[var(--warning)]" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{totalPending}</div>
              <div className="text-xs text-[var(--text-secondary)]">Pending Approval</div>
            </div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--info-bg)] flex items-center justify-center">
              <DollarSign size={18} className="text-[var(--info)]" />
            </div>
            <div>
              <div className="text-2xl font-semibold">${totalAmount.toFixed(2)}</div>
              <div className="text-xs text-[var(--text-secondary)]">Total Amount</div>
            </div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
              <CheckCircle2 size={18} className="text-[var(--success)]" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{refunds.filter(r => r.status === 'processed').length}</div>
              <div className="text-xs text-[var(--text-secondary)]">Processed</div>
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} height={56} />)}</div>
      ) : refunds.length === 0 ? (
        <EmptyState icon={<RotateCcw size={24} />} title="No refund requests" description="Refund requests appear here when created from tickets" />
      ) : (
        <Card padding="sm">
          {refunds.map(refund => (
            <div key={refund.id} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-light)] last:border-0">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
                <RotateCcw size={16} className="text-[var(--text-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Order #{refund.order_id}</span>
                  <Badge variant={statusBadge[refund.status] || 'neutral'}>{refund.status.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  ${refund.amount.toFixed(2)} &middot; {refund.reason} &middot; {refund.channel}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
