'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { BookOpen, Sparkles, Search, Play, Terminal, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'

const MODE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'accent' | 'neutral'> = {
  autonomous: 'success',
  chat: 'info',
  plan: 'warning',
  agent: 'accent',
  production: 'success',
  prototype: 'accent',
  template: 'neutral',
  execute: 'info',
}

interface SkillRunResult {
  output: string
  agentId: string
  durationMs: number
  warning?: string
}

export default function SkillsPage() {
  const router = useRouter()
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SkillRunResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.skills.list()
      setSkills(res.skills)
    } catch { setError('Failed to load skills') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    : skills

  const handleRun = async () => {
    if (!selectedSkill) return
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch(`/api/skills/${selectedSkill.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      })
      const data = await res.json()
      setResult(data.result || data)
    } catch (e: any) {
      setResult({ output: `Error: ${e.message}`, agentId: 'error', durationMs: 0 })
    }
    finally { setRunning(false) }
  }

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {loading ? 'Loading…' : `${skills.length} installed skills — click to run`}
        </p>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={100} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={24} />} title="No skills found"
          description={search ? 'Try a different search' : 'No skills installed'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(s => (
            <div key={s.id} onClick={() => { setSelectedSkill(s); setInputs({}); setShowResult(false) }}
              className="cursor-pointer group">
              <Card padding="lg" className="h-full hover:border-[var(--accent)]/30 transition-all relative">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{s.name}</span>
                      {s.mode && <Badge variant={MODE_COLORS[s.mode] || 'neutral'}>{s.mode}</Badge>}
                    </div>
                    {s.description && <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{s.description}</p>}
                    {s.triggers && s.triggers.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {s.triggers.slice(0, 4).map((t: string) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)]">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Play size={16} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0 mt-1" />
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Run Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 overflow-y-auto" onClick={() => setSelectedSkill(null)}>
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-light)] shadow-elevated w-full max-w-2xl mx-4 mb-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
              <div>
                <h2 className="font-semibold">{selectedSkill.name}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedSkill.description?.slice(0, 100)}</p>
              </div>
              <button onClick={() => setSelectedSkill(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            {/* Inputs */}
            <div className="px-6 py-4 space-y-4 max-h-[40vh] overflow-y-auto">
              <Input label="Product Name" value={inputs.productName || ''} onChange={e => setInputs(p => ({ ...p, productName: e.target.value }))} placeholder="e.g. Custom Dog Portrait Mug" />
              <Input label="Niche / Category" value={inputs.niche || ''} onChange={e => setInputs(p => ({ ...p, niche: e.target.value }))} placeholder="e.g. Pet Gifts" />
              <Input label="Features / Description" value={inputs.features || inputs.description || ''} onChange={e => setInputs(p => ({ ...p, features: e.target.value }))} placeholder="Key product features…" />
            </div>

            {/* Action */}
            <div className="px-6 py-4 border-t border-[var(--border-light)] flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedSkill(null)}>Cancel</Button>
              <Button onClick={handleRun} loading={running} disabled={!inputs.productName && !inputs.niche}>
                <Play size={14} /> Run Skill
              </Button>
            </div>

            {/* Result */}
            {running && (
              <div className="px-6 py-4 border-t border-[var(--border-light)]">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Terminal size={14} className="animate-pulse" />
                  Running on {result?.agentId || 'Claude Code'}…
                </div>
              </div>
            )}

            {result && (
              <div className="px-6 py-4 border-t border-[var(--border-light)] max-h-[50vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  {result.agentId === 'error' ? (
                    <AlertCircle size={14} className="text-[var(--error)]" />
                  ) : result.warning ? (
                    <AlertCircle size={14} className="text-[var(--warning)]" />
                  ) : (
                    <CheckCircle2 size={14} className="text-[var(--success)]" />
                  )}
                  <span className="text-sm font-medium">
                    {result.agentId === 'error' ? 'Failed' : result.warning ? 'Completed with warnings' : 'Completed'}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                    <Clock size={12} className="inline mr-1" />{(result.durationMs / 1000).toFixed(1)}s · {result.agentId}
                  </span>
                </div>
                <pre className="text-xs whitespace-pre-wrap bg-[var(--bg-hover)] rounded-lg p-4 max-h-96 overflow-y-auto">{result.output}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
