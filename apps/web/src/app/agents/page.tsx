'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Bot, Cpu, Layers, Search } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

const DIVISION_COLORS: Record<string, string> = {
  engineering: 'var(--info)',
  design: 'var(--accent)',
  marketing: 'var(--success)',
  sales: 'var(--warning)',
  support: 'var(--error)',
  finance: 'var(--success)',
  product: 'var(--accent)',
  security: 'var(--error)',
  strategy: 'var(--info)',
  academic: 'var(--text-secondary)',
}

export default function AgentsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.agents.list()
      setData(res)
    } catch { setError('Failed to load agents') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6 lg:p-8 max-w-7xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  const divisions = data?.personalities?.byDivision || []
  const filtered = search
    ? divisions.map((d: any) => ({
        ...d,
        agents: d.agents.filter((a: any) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.description?.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((d: any) => d.agents.length > 0)
    : divisions

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${data?.personalities?.total || 0} personalities across ${data?.personalities?.divisions || 0} divisions`}
            {data?.adapters && ` · ${data.adapters.filter((a: any) => a.detected).length} adapters`}
          </p>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search agents by name or description…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-6" />

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}><Skeleton height={20} width={120} className="mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, j) => <Skeleton key={j} height={80} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((div: any) => {
            const color = DIVISION_COLORS[div.division] || 'var(--accent)'
            return (
              <div key={div.division}>
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} style={{ color }} />
                  <h2 className="font-semibold text-sm capitalize" style={{ color }}>{div.division}</h2>
                  <span className="text-xs text-[var(--text-tertiary)]">{div.count} agents</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {div.agents.map((agent: any) => (
                    <Card key={agent.id} padding="sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot size={14} style={{ color }} />
                        <span className="font-medium text-sm truncate">{agent.name}</span>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{agent.description || '—'}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Adapters */}
      {data?.adapters?.length > 0 && (
        <Card title="Adapters" padding="sm" className="mt-6">
          <div className="space-y-1">
            {data.adapters.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Cpu size={14} className="text-[var(--text-secondary)]" />
                <span className="font-medium">{a.name}</span>
                <Badge variant={a.detected ? 'success' : 'error'}>{a.detected ? 'Detected' : 'Not found'}</Badge>
                {a.version && <span className="text-xs text-[var(--text-tertiary)]">v{a.version}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
