'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type FulfillmentOrder } from '@/lib/api'
import { Truck, Plus, Search, ArrowRight, CheckCircle2, AlertCircle, Clock, Package } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  pending_review: 'warning',
  in_production: 'info',
  quality_check: 'accent',
  packing: 'neutral',
  shipped: 'success',
  delivered: 'success',
  returned: 'error',
}

const statusIcon: Record<string, typeof Truck> = {
  pending_review: Clock,
  in_production: Package,
  quality_check: AlertCircle,
  packing: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  returned: AlertCircle,
}

export default function FulfillmentPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<FulfillmentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.fulfillment.orders.list()
      setOrders(res.orders)
    } catch { setError('Failed to load fulfillment orders') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search ? orders.filter(o =>
    o.sku.toLowerCase().includes(search.toLowerCase()) ||
    o.order_id.toLowerCase().includes(search.toLowerCase())
  ) : orders

  if (error) return <div className="p-6 lg:p-8 max-w-7xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fulfillment</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.push('/fulfillment/vendors')}>
            <Truck size={14} />
            Vendors
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New Order
          </Button>
        </div>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by SKU or order ID…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4"
      />

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} height={56} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Truck size={24} />} title="No orders found"
          description={search ? 'Try a different search term' : 'Create a fulfillment order to start'}
          action={!search ? <Button onClick={() => setShowCreate(true)}><Plus size={14} /> New Order</Button> : undefined}
        />
      ) : (
        <Card padding="sm">
          {filtered.map(order => {
            const Icon = statusIcon[order.status] || Truck
            return (
              <button key={order.id} onClick={() => router.push(`/fulfillment/orders/${order.id}`)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left border-b border-[var(--border-light)] last:border-0"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  order.status === 'delivered' ? 'bg-[var(--success-bg)]' :
                  order.status === 'shipped' ? 'bg-[var(--info-bg)]' :
                  order.status === 'returned' ? 'bg-[var(--error-bg)]' : 'bg-[var(--bg-hover)]'
                }`}>
                  <Icon size={16} className={
                    order.status === 'delivered' ? 'text-[var(--success)]' :
                    order.status === 'returned' ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{order.sku}</span>
                    <Badge variant={statusBadge[order.status] || 'neutral'}>{order.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Order #{order.order_id} &middot; Qty {order.quantity}
                    {order.vendor_id && ` · Vendor ${order.vendor_id}`}
                  </p>
                </div>
                <ArrowRight size={14} className="text-[var(--text-tertiary)] shrink-0" />
              </button>
            )
          })}
        </Card>
      )}

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [orderId, setOrderId] = useState('')
  const [sku, setSku] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [vendorId, setVendorId] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!orderId || !sku) return
    setSaving(true)
    try {
      await api.fulfillment.orders.create({ orderId, sku, quantity, vendorId: vendorId || undefined })
      onCreated()
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-light)] shadow-elevated p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-sm mb-4">New Fulfillment Order</h2>
        <div className="space-y-4">
          <Input label="Order ID" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="e.g. ord-123" required />
          <Input label="SKU" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. MUG-001" required />
          <Input label="Quantity" type="number" value={String(quantity)} onChange={e => setQuantity(Number(e.target.value))} />
          <Input label="Vendor ID (optional)" value={vendorId} onChange={e => setVendorId(e.target.value)} placeholder="e.g. printful-1" />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!orderId || !sku} loading={saving}>Create</Button>
        </div>
      </div>
    </div>
  )
}
