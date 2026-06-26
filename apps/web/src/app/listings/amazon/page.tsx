'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type AmazonListing } from '@/lib/api'
import { ArrowLeft, Globe, Plus, Search, AlertTriangle, Shield } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  draft: 'neutral',
  active: 'success',
  blocked: 'error',
  removed: 'error',
}

export default function AmazonListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<AmazonListing[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [listRes, healthRes] = await Promise.all([
        api.listings.amazon.list(),
        api.listings.amazon.healthScore().catch(() => null),
      ])
      setListings(listRes.listings)
      if (healthRes) setHealth(healthRes)
    } catch { setError('Failed to load Amazon data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? listings.filter(l => l.title.toLowerCase().includes(search.toLowerCase()))
    : listings

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/listings')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Amazon Listings</h1>
          <p className="text-sm text-[var(--text-secondary)]">{loading ? '…' : `${listings.length} listings`}</p>
        </div>
        <Button onClick={() => router.push('/listings/amazon/new')}><Plus size={14} /> New Listing</Button>
      </div>

      {health && (
        <Card padding="sm" className="mb-4">
          <div className="flex items-center gap-3 px-3 py-2">
            <Shield size={16} className={health.overallHealth === 'good' ? 'text-[var(--success)]' : 'text-[var(--warning)]'} />
            <span className="text-sm font-medium">Account Health: {(health as any).overallHealth || 'Unknown'}</span>
            <span className="text-xs text-[var(--text-tertiary)]">ODR: {health.odr ?? '—'}</span>
          </div>
        </Card>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4" />

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} height={64} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Globe size={24} />} title="No listings"
          description={search ? 'Try a different search' : 'Create your first Amazon listing'} />
      ) : (
        <Card padding="sm">
          {filtered.map(l => (
            <div key={l.id} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-light)] last:border-0">
              <div className="w-9 h-9 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center shrink-0">
                <Globe size={16} className="text-[var(--warning)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{l.title}</span>
                  <Badge variant={statusBadge[l.status] || 'neutral'}>{l.status}</Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">{l.asin ? `ASIN: ${l.asin}` : l.sku || '—'} · {l.price ? `$${l.price.toFixed(2)}` : '—'}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
