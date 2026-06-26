'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type LaunchChecklistItem } from '@/lib/api'
import { ArrowLeft, ClipboardList, CheckCircle2, Circle } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const CHECKLIST_ITEMS = [
  'Product page created',
  'Product images uploaded',
  'Product description written',
  'Pricing configured',
  'Inventory synced',
  'Shipping settings configured',
  'Tax settings configured',
  'Payment gateway connected',
  'Email notification configured',
  'Analytics tracking set up',
  'Ad creative prepared',
  'Ad targeting configured',
  'Budget allocated',
  'Campaign scheduled',
  'Landing page reviewed',
  'Order fulfillment configured',
  'Customer support setup',
]

export default function LaunchChecklistPage() {
  const params = useParams<{ productId: string }>()
  const id = params?.productId ?? ''
  const router = useRouter()
  const [items, setItems] = useState<LaunchChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initLoading, setInitLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.orchestration.checklist.get(id)
      setItems(res.items)
    } catch {
      setError('Failed to load checklist')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleInit = async () => {
    setInitLoading(true)
    try {
      const res = await api.orchestration.checklist.init(id)
      setItems(res.items)
    } catch {
      // silently fail
    } finally {
      setInitLoading(false)
    }
  }

  const handleToggle = async (item: LaunchChecklistItem) => {
    if (item.completed) return
    setToggling(item.id)
    try {
      const res = await api.orchestration.checklist.completeItem(id, item.id)
      setItems(prev => prev.map(i => (i.id === item.id ? res.item : i)))
    } catch {
      // silently fail
    } finally {
      setToggling(null)
    }
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Skeleton height={24} width={200} />
        <div className="mt-6 space-y-3">
          <Skeleton height={60} />
          <Skeleton height={40} count={5} />
        </div>
      </div>
    )
  }

  const completed = items.filter(i => i.completed).length
  const total = items.length || 17
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push(`/launch/${id}`)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Launch Checklist</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {items.length > 0 ? `${completed} of ${total} items completed` : 'Not yet initialized'}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title="Checklist not initialized"
          description="Initialize the checklist to track launch readiness."
          action={
            <Button onClick={handleInit} loading={initLoading}>
              Initialize Checklist
            </Button>
          }
        />
      ) : (
        <>
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct === 100 ? 'var(--success)' : 'var(--accent)',
                }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {completed}/{total}
            </span>
          </div>

          {/* Checklist Items */}
          <Card padding="sm">
            {items.map(item => {
              const isLoading = toggling === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => !item.completed && handleToggle(item)}
                  disabled={item.completed || isLoading}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    item.completed
                      ? 'opacity-50 cursor-default'
                      : 'hover:bg-[var(--bg-hover)] cursor-pointer'
                  } ${isLoading ? 'opacity-60' : ''}`}
                >
                  {item.completed ? (
                    <CheckCircle2 size={18} className="text-[var(--success)] shrink-0" />
                  ) : (
                    <Circle size={18} className="text-[var(--text-tertiary)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${item.completed ? 'line-through' : ''}`}>{item.item}</span>
                    {item.blocked_by && (
                      <span className="ml-2 text-xs text-[var(--warning)]">Blocked by {item.blocked_by}</span>
                    )}
                  </div>
                  {item.completed && item.completed_at && (
                    <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                      {new Date(item.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </button>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
