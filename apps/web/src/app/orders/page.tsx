'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, type Order } from '@/lib/api'
import { ShoppingCart } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { Table } from '@/components/Table'
import { Badge } from '@/components/Badge'
import { SearchInput } from '@/components/SearchInput'
import { Select } from '@/components/Select'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent'> = {
  pending: 'warning', processing: 'info', shipped: 'accent', delivered: 'success', cancelled: 'error',
}

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.orders.list()
      setOrders(res.orders)
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    const label = statusOptions.find(s => s.value === newStatus)?.label || newStatus
    toast('success', `Order ${orderId.slice(0, 8)}… updated to ${label}`)
  }

  const filtered = orders.filter(o =>
    !search || o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  )

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''}${search ? ' (filtered)' : ''}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by customer, email, or order ID…" className="w-72" />
      </div>

      {/* Table */}
      <Table
        data={filtered}
        columns={[
          {
            key: 'customer', header: 'Customer',
            render: (o: Order) => (
              <div>
                <div className="font-medium">{o.customer_name}</div>
                {o.customer_email && <div className="text-xs text-[var(--text-tertiary)]">{o.customer_email}</div>}
              </div>
            ),
          },
          { key: 'product', header: 'Product', render: (o: Order) => <span className="text-[var(--text-secondary)]">{o.product_id}</span> },
          { key: 'qty', header: 'Qty', render: (o: Order) => <>{o.quantity}</>, align: 'right' },
          { key: 'total', header: 'Total', render: (o: Order) => <span className="font-medium">${o.total.toFixed(2)}</span>, align: 'right' },
          {
            key: 'status', header: 'Status',
            render: (o: Order) => (
              <Select
                value={o.status}
                onChange={(e) => handleStatusChange(o.id, e.target.value)}
                options={statusOptions}
                className="w-32"
              />
            ),
          },
          { key: 'date', header: 'Date', render: (o: Order) => <span className="text-xs text-[var(--text-secondary)]">{new Date(o.created_at).toLocaleDateString()}</span> },
        ]}
        keyExtractor={(o: Order) => o.id}
        isLoading={loading}
        emptyState={
          <EmptyState
            icon={<ShoppingCart size={24} />}
            title={search ? 'No orders match your search' : 'No orders yet'}
            description={search ? 'Try a different search term.' : 'Orders will appear here once customers start buying.'}
          />
        }
      />
    </div>
  )
}
