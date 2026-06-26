'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type EtsyListing } from '@/lib/api'
import { ArrowLeft, Store, Plus, Search, ExternalLink, Eye, Star } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'success',
  optimizing: 'accent',
  paused: 'info',
  removed: 'error',
}

export default function EtsyListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<EtsyListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.listings.etsy.list()
      setListings(res.listings)
    } catch { setError('Failed to load Etsy listings') }
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
          <h1 className="text-xl font-semibold tracking-tight">Etsy Listings</h1>
          <p className="text-sm text-[var(--text-secondary)]">{loading ? '…' : `${listings.length} listings`}</p>
        </div>
        <Button onClick={() => router.push('/listings/etsy/new')}><Plus size={14} /> New Listing</Button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4" />

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} height={64} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Store size={24} />} title="No listings"
          description={search ? 'Try a different search' : 'Create your first Etsy listing'} />
      ) : (
        <Card padding="sm">
          {filtered.map(l => (
            <button key={l.id} onClick={() => router.push(`/listings/etsy/${l.id}`)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left border-b border-[var(--border-light)] last:border-0">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center shrink-0">
                <Store size={16} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{l.title}</span>
                  <Badge variant={statusBadge[l.status] || 'neutral'}>{l.status}</Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">${l.price.toFixed(2)} · Stock: {l.quantity}{l.views ? ` · ${l.views} views` : ''}</p>
              </div>
              {l.url && <ExternalLink size={14} className="text-[var(--text-tertiary)]" />}
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
