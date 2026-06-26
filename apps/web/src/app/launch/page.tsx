'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type LaunchOrchestration, type Product } from '@/lib/api'
import { Rocket, Play, ArrowRight, CheckCircle2, ChevronRight, AlertCircle, BarChart3, Sparkles, Database, Target } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const STAGE_ORDER = ['research', 'creative', 'launch', 'data', 'scale'] as const
type Stage = (typeof STAGE_ORDER)[number]

const stageMeta: Record<Stage, { label: string; icon: typeof Rocket; color: string }> = {
  research: { label: 'Research', icon: Sparkles, color: 'var(--info)' },
  creative: { label: 'Creative', icon: Target, color: 'var(--accent)' },
  launch: { label: 'Launch', icon: Rocket, color: 'var(--success)' },
  data: { label: 'Data', icon: Database, color: 'var(--warning)' },
  scale: { label: 'Scale', icon: BarChart3, color: 'var(--error)' },
}

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  active: 'success',
  blocked: 'error',
  completed: 'info',
  draft: 'neutral',
}

function stageProgress(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage as Stage)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100)
}

type OrchestrationWithProduct = LaunchOrchestration & { productName?: string }

export default function LaunchPage() {
  const router = useRouter()
  const [orchestrations, setOrchestrations] = useState<OrchestrationWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('shopify')
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orchRes, prodRes] = await Promise.all([
        api.orchestration.list(),
        api.products.list(),
      ])
      const prodMap = new Map(prodRes.products.map((p: Product) => [p.id, p.name]))
      setOrchestrations(
        orchRes.orchestrations.map((o: LaunchOrchestration) => ({
          ...o,
          productName: prodMap.get(o.product_id) ?? o.product_id,
        }))
      )
      setProducts(prodRes.products)
    } catch {
      setError('Failed to load launch pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStart = async () => {
    if (!selectedProduct) return
    setStarting(true)
    try {
      const res = await api.orchestration.start({ product_id: selectedProduct, channel: selectedChannel })
      setOrchestrations(prev => [...prev, {
        ...res.orchestration,
        productName: products.find((p: Product) => p.id === selectedProduct)?.name ?? selectedProduct,
      }])
      setStartOpen(false)
      setSelectedProduct('')
    } catch {
      // silently fail
    } finally {
      setStarting(false)
    }
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  const grouped = STAGE_ORDER.map(stage => ({
    stage,
    ...stageMeta[stage],
    items: orchestrations.filter(o => o.stage === stage),
  }))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Launch Pipeline</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${orchestrations.length} product${orchestrations.length !== 1 ? 's' : ''} in pipeline`}
          </p>
        </div>
        <Button onClick={() => setStartOpen(true)} disabled={products.length === 0}>
          <Play size={16} />
          Start Launch
        </Button>
      </div>

      {/* Start Launch Modal */}
      {startOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setStartOpen(false)}>
          <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-light)] shadow-elevated p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-sm mb-4">Start New Launch</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] font-medium">Product</label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                >
                  <option value="">Select a product…</option>
                  {products.map((p: Product) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] font-medium">Channel</label>
                <select
                  value={selectedChannel}
                  onChange={e => setSelectedChannel(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                >
                  <option value="shopify">Shopify</option>
                  <option value="amazon">Amazon</option>
                  <option value="etsy">Etsy</option>
                  <option value="walmart">Walmart</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setStartOpen(false)}>Cancel</Button>
              <Button onClick={handleStart} disabled={!selectedProduct} loading={starting}>
                Start Launch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton height={20} width={140} className="mb-3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton height={120} />
                <Skeleton height={120} />
              </div>
            </div>
          ))}
        </div>
      ) : orchestrations.length === 0 ? (
        <EmptyState
          icon={<Rocket size={24} />}
          title="No launches yet"
          description="Start a launch for a product to begin the pipeline."
          action={
            <Button onClick={() => setStartOpen(true)} disabled={products.length === 0}>
              <Play size={16} />
              Start Launch
            </Button>
          }
        />
      ) : (
        /* Pipeline stages */
        <div className="space-y-8">
          {grouped.map(({ stage, label, icon: Icon, color, items }) => (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} style={{ color }} />
                <h2 className="font-semibold text-sm" style={{ color }}>{label}</h2>
                <span className="text-xs text-[var(--text-tertiary)]">{items.length} product{items.length !== 1 ? 's' : ''}</span>
              </div>
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-light)] p-6 text-center">
                  <p className="text-xs text-[var(--text-tertiary)]">No products in {label.toLowerCase()} stage</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(o => (
                    <button
                      key={o.id}
                      onClick={() => router.push(`/launch/${o.id}`)}
                      className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 text-left shadow-card hover:shadow-elevated hover:border-[var(--accent)]/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm truncate">{o.productName}</span>
                        <ChevronRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={statusBadge[o.status] || 'neutral'}>{o.status}</Badge>
                        <span className="text-xs text-[var(--text-tertiary)]">{o.channel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${stageProgress(o.stage)}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums" style={{ color }}>{stageProgress(o.stage)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
