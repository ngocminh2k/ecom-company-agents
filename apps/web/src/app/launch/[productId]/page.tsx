'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type LaunchOrchestration, type Product } from '@/lib/api'
import { ArrowLeft, ChevronRight, Shield, ClipboardList, AlertTriangle, CheckCircle2, XCircle, SkipForward, PauseCircle } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

const STAGE_ORDER = ['research', 'creative', 'launch', 'data', 'scale'] as const
type Stage = (typeof STAGE_ORDER)[number]

const stageMeta: Record<Stage, { label: string; color: string }> = {
  research: { label: 'Research', color: 'var(--info)' },
  creative: { label: 'Creative', color: 'var(--accent)' },
  launch: { label: 'Launch', color: 'var(--success)' },
  data: { label: 'Data', color: 'var(--warning)' },
  scale: { label: 'Scale', color: 'var(--error)' },
}

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  active: 'success',
  blocked: 'error',
  completed: 'info',
  draft: 'neutral',
}

function StageBar({ currentStage }: { currentStage: string }) {
  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.map((stage, i) => {
        const idx = STAGE_ORDER.indexOf(currentStage as Stage)
        const isCompleted = i < idx
        const isCurrent = i === idx
        const meta = stageMeta[stage]
        return (
          <div key={stage} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center w-full">
              <div
                className={`h-2 flex-1 rounded-l-full transition-colors ${
                  isCompleted ? 'opacity-100' : isCurrent ? 'opacity-100' : 'opacity-20'
                }`}
                style={{ backgroundColor: isCompleted || isCurrent ? meta.color : 'var(--border-medium)' }}
              />
              <div
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  isCompleted ? 'border-transparent' : isCurrent ? '' : 'border-[var(--border-medium)]'
                }`}
                style={{
                  backgroundColor: isCompleted ? meta.color : isCurrent ? meta.color : 'var(--bg-panel)',
                  borderColor: isCurrent ? meta.color : undefined,
                }}
              >
                {isCompleted && <CheckCircle2 size={10} className="text-white" />}
              </div>
              <div
                className={`h-2 flex-1 rounded-r-full transition-colors ${
                  isCompleted ? 'opacity-100' : 'opacity-20'
                }`}
                style={{ backgroundColor: isCompleted ? meta.color : 'var(--border-medium)' }}
              />
            </div>
            <span
              className={`text-[10px] font-medium ${isCurrent ? 'opacity-100' : 'opacity-50'}`}
              style={{ color: isCompleted || isCurrent ? meta.color : 'var(--text-tertiary)' }}
            >
              {meta.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ReadinessScore({ ready, checks }: { ready: boolean; checks: { item: string; passed: boolean }[] }) {
  const passed = checks.filter(c => c.passed).length
  const total = checks.length
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ready ? 'bg-[var(--success-bg)]' : 'bg-[var(--warning-bg)]'}`}>
          {ready ? <CheckCircle2 size={20} className="text-[var(--success)]" /> : <AlertTriangle size={20} className="text-[var(--warning)]" />}
        </div>
        <div>
          <div className={`text-lg font-semibold ${ready ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
            {ready ? 'Ready' : 'Not Ready'}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">{passed}/{total} checks passed</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-20 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: ready ? 'var(--success)' : 'var(--warning)' }} />
          </div>
          <span className="text-xs font-medium tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="space-y-1">
        {checks.map(c => (
          <div key={c.item} className="flex items-center gap-2 text-xs">
            {c.passed ? (
              <CheckCircle2 size={12} className="text-[var(--success)] shrink-0" />
            ) : (
              <XCircle size={12} className="text-[var(--error)] shrink-0" />
            )}
            <span className="text-[var(--text-secondary)]">{c.item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LaunchDetailPage() {
  const params = useParams<{ productId: string }>()
  const id = params?.productId ?? ''
  const router = useRouter()
  const [orch, setOrch] = useState<LaunchOrchestration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<{ ready: boolean; checks: { item: string; passed: boolean }[] } | null>(null)
  const [blockReason, setBlockReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.orchestration.get(id)
      setOrch(res.orchestration)
    } catch {
      setError('Failed to load launch')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadReadiness = useCallback(async () => {
    try {
      const res = await api.orchestration.readiness(id)
      setReadiness(res)
    } catch {
      // silently fail
    }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (orch) loadReadiness() }, [orch, loadReadiness])

  const doAction = async (action: string, fn: () => Promise<unknown>) => {
    setActionLoading(action)
    try {
      const res = await fn() as { orchestration: LaunchOrchestration }
      setOrch(res.orchestration)
    } catch {
      // silently fail
    } finally {
      setActionLoading(null)
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
        <div className="mt-6 space-y-4">
          <Skeleton height={60} />
          <Skeleton height={120} />
          <Skeleton height={80} />
        </div>
      </div>
    )
  }

  if (!orch) return null

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => router.push('/launch')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Launch Pipeline</h1>
            <Badge variant={statusBadge[orch.status] || 'neutral'}>{orch.status}</Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Product {orch.product_id} &middot; {orch.channel}
          </p>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center gap-4 mb-6 mt-4 border-b border-[var(--border-light)] pb-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] border-b-2 border-[var(--accent)] pb-3 -mb-[13px]">
          <ChevronRight size={14} />
          Pipeline
        </span>
        <button onClick={() => router.push(`/launch/${id}/checklist`)} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ClipboardList size={14} />
          Checklist
          <ArrowLeft size={12} className="rotate-180" />
        </button>
        <button onClick={() => router.push(`/launch/${id}/checkpoints`)} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Shield size={14} />
          Checkpoints
          <ArrowLeft size={12} className="rotate-180" />
        </button>
      </div>

      {/* Stage Bar */}
      <Card padding="lg" className="mb-6">
        <StageBar currentStage={orch.stage} />
      </Card>

      {/* Readiness Score */}
      <Card title="Readiness Score" padding="lg" className="mb-6">
        {readiness ? (
          <ReadinessScore ready={readiness.ready} checks={readiness.checks} />
        ) : (
          <div className="space-y-2">
            <Skeleton height={40} />
            <Skeleton height={12} count={3} />
          </div>
        )}
      </Card>

      {/* Actions */}
      <Card title="Actions" padding="lg" className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => doAction('advance', () => api.orchestration.advance(id))}
            loading={actionLoading === 'advance'}
            disabled={orch.status === 'completed' || actionLoading !== null}
          >
            <SkipForward size={14} />
            Advance Stage
          </Button>
          <Button
            variant="secondary"
            onClick={() => doAction('complete', () => api.orchestration.complete(id))}
            loading={actionLoading === 'complete'}
            disabled={orch.status === 'completed' || actionLoading !== null}
          >
            <CheckCircle2 size={14} />
            Complete Stage
          </Button>
          <div className="flex items-center gap-2">
            <input
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Block reason…"
              className="h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] w-48"
            />
            <Button
              variant="danger"
              onClick={() => {
                if (!blockReason.trim()) return
                doAction('block', () => api.orchestration.block(id, blockReason.trim()))
                setBlockReason('')
              }}
              loading={actionLoading === 'block'}
              disabled={!blockReason.trim() || actionLoading !== null}
            >
              <PauseCircle size={14} />
              Block
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
