'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { ArrowLeft, Shield, Save } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const CHECKPOINTS = [
  { stage: 'day_3', label: 'Day 3 Review', desc: 'Early traction check', decisions: ['scale', 'continue', 'optimize', 'pause', 'stop'] as const },
  { stage: 'day_7', label: 'Day 7 Review', desc: 'First week performance', decisions: ['scale', 'continue', 'optimize', 'pause', 'stop'] as const },
  { stage: 'day_14', label: 'Day 14 Review', desc: 'Two-week milestone', decisions: ['scale', 'continue', 'optimize', 'pause', 'stop'] as const },
  { stage: 'day_30', label: 'Day 30 Review', desc: 'One-month assessment', decisions: ['scale', 'continue', 'optimize', 'pause', 'stop'] as const },
]

const decisionMeta: Record<string, { label: string; color: string; badge: 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral' }> = {
  scale: { label: 'Scale', color: 'var(--success)', badge: 'success' },
  continue: { label: 'Continue', color: 'var(--accent)', badge: 'accent' },
  optimize: { label: 'Optimize', color: 'var(--info)', badge: 'info' },
  pause: { label: 'Pause', color: 'var(--warning)', badge: 'warning' },
  stop: { label: 'Stop', color: 'var(--error)', badge: 'error' },
}

type CheckpointRecord = {
  stage: string
  status: string
  notes?: string
  created_at?: string
}

export default function LaunchCheckpointsPage() {
  const params = useParams<{ productId: string }>()
  const id = params?.productId ?? ''
  const router = useRouter()
  const [checkpoints, setCheckpoints] = useState<CheckpointRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [recording, setRecording] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.orchestration.checkpoints.get(id)
      const cps = (res.checkpoints ?? []) as CheckpointRecord[]
      setCheckpoints(cps)
      const initNotes: Record<string, string> = {}
      cps.forEach(cp => { initNotes[cp.stage] = cp.notes ?? '' })
      setNotes(prev => ({ ...prev, ...initNotes }))
    } catch {
      setError('Failed to load checkpoints')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRecord = async (stage: string, status: string) => {
    setRecording(stage)
    try {
      const res = await api.orchestration.checkpoints.record(id, { stage, status, notes: notes[stage] })
      const cp = res.checkpoint as CheckpointRecord
      setCheckpoints(prev => {
        const filtered = prev.filter(p => p.stage !== stage)
        return [...filtered, { ...cp, stage, status, notes: notes[stage] }]
      })
    } catch {
      // silently fail
    } finally {
      setRecording(null)
    }
  }

  const existingFor = (stage: string): CheckpointRecord | undefined =>
    checkpoints.find(cp => cp.stage === stage)

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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={160} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push(`/launch/${id}`)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Launch Checkpoints</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      {checkpoints.length === 0 && (
        <Card padding="lg" className="mb-6">
          <EmptyState
            icon={<Shield size={24} />}
            title="No checkpoints yet"
            description="Record decisions at each milestone to track launch health."
          />
        </Card>
      )}

      <div className="space-y-4">
        {CHECKPOINTS.map(cp => {
          const existing = existingFor(cp.stage)
          const isRecording = recording === cp.stage
          return (
            <Card key={cp.stage} title={cp.label} padding="lg">
              <p className="text-xs text-[var(--text-secondary)] mb-4">{cp.desc}</p>

              {existing && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Decision:</span>
                  <Badge variant={decisionMeta[existing.status]?.badge ?? 'neutral'}>
                    {decisionMeta[existing.status]?.label ?? existing.status}
                  </Badge>
                  {existing.created_at && (
                    <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">
                      {new Date(existing.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mb-4">
                {cp.decisions.map(d => {
                  const meta = decisionMeta[d]
                  const isActive = existing?.status === d
                  return (
                    <button
                      key={d}
                      onClick={() => !isRecording && handleRecord(cp.stage, d)}
                      disabled={isRecording}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isActive
                          ? 'text-white'
                          : 'border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]'
                      } ${isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={isActive ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
                    >
                      {meta.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-start gap-2">
                <textarea
                  value={notes[cp.stage] ?? ''}
                  onChange={e => setNotes(prev => ({ ...prev, [cp.stage]: e.target.value }))}
                  placeholder="Add notes for this checkpoint…"
                  rows={2}
                  className="flex-1 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] resize-none"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => existing && handleRecord(cp.stage, existing.status)}
                  loading={isRecording}
                  disabled={isRecording}
                >
                  <Save size={14} />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
