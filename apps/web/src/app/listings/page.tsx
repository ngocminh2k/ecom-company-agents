'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type EtsyListing, type ShopifyProduct, type AmazonListing } from '@/lib/api'
import { Store, ShoppingBag, Globe, ArrowRight, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

export default function ListingsHubPage() {
  const router = useRouter()
  const [etsyCount, setEtsyCount] = useState(0)
  const [shopifyCount, setShopifyCount] = useState(0)
  const [amazonCount, setAmazonCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [etsy, shopify, amazon] = await Promise.all([
        api.listings.etsy.list(), api.listings.shopify.list(), api.listings.amazon.list(),
      ])
      setEtsyCount(etsy.listings.length)
      setShopifyCount(shopify.products.length)
      setAmazonCount(amazon.listings.length)
    } catch { setError('Failed to load listings') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) return <div className="p-6 lg:p-8 max-w-7xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  const channels = [
    { key: 'etsy', label: 'Etsy', icon: Store, count: etsyCount, color: 'var(--accent)', href: '/listings/etsy', desc: 'SEO-optimized listings, tags, optimization' },
    { key: 'shopify', label: 'Shopify', icon: ShoppingBag, count: shopifyCount, color: 'var(--success)', href: '/listings/shopify', desc: 'Product pages, pre-ads audit, CRO' },
    { key: 'amazon', label: 'Amazon', icon: Globe, count: amazonCount, color: 'var(--warning)', href: '/listings/amazon', desc: 'Listings, account health, ads campaigns' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Channel Listings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage products across all sales channels</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={140} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {channels.map(ch => (
            <button key={ch.key} onClick={() => router.push(ch.href)}
              className="text-left group cursor-pointer">
              <Card padding="lg" className="h-full hover:border-[var(--accent)]/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ch.color}20` }}>
                    <ch.icon size={18} style={{ color: ch.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{ch.label}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{ch.count} listing{ch.count !== 1 ? 's' : ''}</div>
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">{ch.desc}</p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
