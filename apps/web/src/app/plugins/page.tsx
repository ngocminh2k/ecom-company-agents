'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Puzzle, Plus, Play, ArrowRight, Zap, Shield, ShieldOff, Settings } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Input } from '@/components/Input'

const TRUST_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  official: 'success',
  trusted: 'info',
  restricted: 'warning',
  blocked: 'error',
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [installPath, setInstallPath] = useState('')
  const [installing, setInstalling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('http://127.0.0.1:7456/api/plugins')
      const data = await res.json()
      setPlugins(data.plugins || [])
    } catch { setError('Failed to load plugins') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleInstall = async () => {
    if (!installPath.trim()) return
    setInstalling(true)
    try {
      await fetch('http://127.0.0.1:7456/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: installPath }),
      })
      setInstallPath('')
      await load()
    } catch { alert('Install failed') }
    finally { setInstalling(false) }
  }

  const handleExecute = async (id: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:7456/api/plugins/${id}/execute`, { method: 'POST' })
      const data = await res.json()
      alert(`Pipeline started: ${data.run?.id}`)
    } catch { alert('Execution failed') }
  }

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plugins</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${plugins.length} plugin${plugins.length !== 1 ? 's' : ''} installed`}
          </p>
        </div>
      </div>

      {/* Install */}
      <Card padding="lg" className="mb-6">
        <h2 className="font-semibold text-sm mb-3">Install Plugin</h2>
        <div className="flex gap-2">
          <input value={installPath} onChange={e => setInstallPath(e.target.value)}
            placeholder="Local path or GitHub URL…"
            className="flex-1 h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]" />
          <Button onClick={handleInstall} loading={installing} disabled={!installPath.trim()}>
            <Plus size={14} /> Install
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} height={80} />)}</div>
      ) : plugins.length === 0 ? (
        <EmptyState icon={<Puzzle size={24} />} title="No plugins installed"
          description="Install a plugin to extend functionality" />
      ) : (
        <div className="space-y-3">
          {plugins.map((p: any) => (
            <Card key={p.id} padding="lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0 mt-0.5">
                    <Puzzle size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{p.manifest?.name || p.id}</span>
                      {p.manifest?.version && <span className="text-xs text-[var(--text-tertiary)]">v{p.manifest.version}</span>}
                      <Badge variant={TRUST_COLORS[p.manifest?.trustLevel] || 'neutral'}>
                        {p.manifest?.trustLevel || 'unknown'}
                      </Badge>
                    </div>
                    {p.manifest?.description && (
                      <p className="text-xs text-[var(--text-tertiary)]">{p.manifest.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {p.manifest?.pipeline && (
                        <Button size="sm" variant="secondary" onClick={() => handleExecute(p.id)}>
                          <Play size={12} /> Run Pipeline
                        </Button>
                      )}
                      <span className="text-xs text-[var(--text-tertiary)] self-center">
                        {p.manifest?.stages?.length || 0} stages
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
