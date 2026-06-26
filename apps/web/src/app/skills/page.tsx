'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { BookOpen, Sparkles, Code, Search, ArrowRight } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const MODE_COLORS: Record<string, 'success' | 'info' | 'warning' | 'accent' | 'neutral'> = {
  autonomous: 'success',
  chat: 'info',
  plan: 'warning',
  agent: 'accent',
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {loading ? 'Loading…' : `${skills.length} installed skills`}
        </p>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={80} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={24} />} title="No skills found"
          description={search ? 'Try a different search' : 'No skills installed'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(s => (
            <Card key={s.id} padding="lg" className="hover:border-[var(--accent)]/30 transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{s.name}</span>
                    {s.mode && <Badge variant={MODE_COLORS[s.mode] || 'neutral'}>{s.mode}</Badge>}
                  </div>
                  {s.description && <p className="text-xs text-[var(--text-tertiary)]">{s.description}</p>}
                </div>
                <ArrowRight size={14} className="text-[var(--text-tertiary)] shrink-0 mt-1.5" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
