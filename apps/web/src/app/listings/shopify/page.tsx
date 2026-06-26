'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ShopifyProduct } from '@/lib/api'
import { ArrowLeft, ShoppingBag, Plus, Search, DollarSign } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  draft: 'neutral',
  active: 'success',
  archived: 'warning',
}

export default function ShopifyListingsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.listings.shopify.list()
      setProducts(res.products)
    } catch { setError('Failed to load Shopify products') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : products

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/listings')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Shopify Products</h1>
          <p className="text-sm text-[var(--text-secondary)]">{loading ? '…' : `${products.length} products`}</p>
        </div>
        <Button onClick={() => router.push('/listings/shopify/new')}><Plus size={14} /> New Product</Button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4" />

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} height={64} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag size={24} />} title="No products"
          description={search ? 'Try a different search' : 'Create your first Shopify product'} />
      ) : (
        <Card padding="sm">
          {filtered.map(p => (
            <button key={p.id} onClick={() => router.push(`/listings/shopify/${p.id}`)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left border-b border-[var(--border-light)] last:border-0">
              <div className="w-9 h-9 rounded-lg bg-[var(--success-bg)] flex items-center justify-center shrink-0">
                <ShoppingBag size={16} className="text-[var(--success)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{p.title}</span>
                  <Badge variant={statusBadge[p.status] || 'neutral'}>{p.status}</Badge>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">{p.sku || '—'} · {p.price ? `$${p.price.toFixed(2)}` : '—'}</p>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
