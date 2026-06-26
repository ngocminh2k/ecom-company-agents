'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type FulfillmentOrder, type QcLog } from '@/lib/api'
import { ArrowLeft, Truck, CheckCircle2, AlertCircle, Clock, Package, Send, Camera, RotateCcw } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

const statusFlow = [
  'pending_review', 'in_production', 'quality_check', 'packing', 'shipped', 'delivered',
]

const statusColors: Record<string, string> = {
  pending_review: 'var(--warning)',
  in_production: 'var(--info)',
  quality_check: 'var(--accent)',
  packing: 'var(--text-secondary)',
  shipped: 'var(--success)',
  delivered: 'var(--success)',
  returned: 'var(--error)',
}

export default function FulfillmentOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const [orders, setOrders] = useState<FulfillmentOrder[]>([])
  const [order, setOrder] = useState<FulfillmentOrder | null>(null)
  const [qcLogs, setQcLogs] = useState<QcLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.fulfillment.orders.list()
      setOrders(res.orders)
      const found = res.orders.find(o => o.id === id)
      setOrder(found ?? null)
      if (found) {
        const qcRes = await api.fulfillment.qcLogs.list(found.order_id)
        setQcLogs(qcRes.qcLogs)
      }
    } catch {
      setError('Failed to load fulfillment order')
    }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const doAction = async (action: string, fn: () => Promise<unknown>) => {
    setActionLoading(action)
    try {
      await fn()
      await load()
    } catch { /* silent */ }
    finally { setActionLoading(null) }
  }

  const currentIdx = order ? statusFlow.indexOf(order.status) : -1

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>
  if (loading) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><Skeleton height={24} width={200} /><div className="mt-4 space-y-3"><Skeleton height={60} /><Skeleton height={120} /></div></div>
  if (!order) return null

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/fulfillment')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{order.sku}</h1>
          <p className="text-sm text-[var(--text-secondary)]">Order #{order.order_id} &middot; Qty {order.quantity}</p>
        </div>
        <Badge variant="info">{order.status.replace(/_/g, ' ')}</Badge>
      </div>

      {/* Status Pipeline */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-1">
          {statusFlow.map((s, i) => {
            const isDone = i < currentIdx
            const isCurrent = i === currentIdx
            const color = statusColors[s]
            return (
              <div key={s} className="flex-1 flex items-center gap-1">
                <div className={`h-1.5 flex-1 rounded ${i === 0 ? '' : ''} ${isDone ? 'opacity-100' : isCurrent ? 'opacity-100' : 'opacity-20'}`} style={{ backgroundColor: isDone || isCurrent ? color : 'var(--border-medium)' }} />
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isDone ? 'border-transparent' : ''}`} style={{ backgroundColor: isDone ? color : isCurrent ? color : 'var(--bg-panel)', borderColor: isCurrent ? color : undefined }}>
                  {isDone && <CheckCircle2 size={10} className="text-white" />}
                  {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className={`h-1.5 flex-1 rounded ${isDone ? 'opacity-100' : 'opacity-20'}`} style={{ backgroundColor: isDone ? color : 'var(--border-medium)' }} />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[var(--text-tertiary)]">
          {statusFlow.map((s, i) => (
            <span key={s} className={i === currentIdx ? 'font-medium text-[var(--accent)]' : i < currentIdx ? 'text-[var(--text-secondary)]' : ''}>
              {s.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <Card title="Actions" padding="lg" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending_review' && (
            <Button onClick={() => doAction('prod', () => api.fulfillment.orders.startProduction(order!.id))} loading={actionLoading === 'prod'}>
              <Package size={14} /> Start Production
            </Button>
          )}
          {order.status === 'in_production' && (
            <>
              <Button onClick={async () => {
                const url = prompt('Production file URL:')
                if (url) doAction('prod-done', () => api.fulfillment.orders.completeProduction(order!.id, url))
              }} loading={actionLoading === 'prod-done'}>
                <CheckCircle2 size={14} /> Complete Production
              </Button>
            </>
          )}
          {order.status === 'quality_check' && (
            <>
              <Button onClick={async () => {
                if (confirm('Mark QC as PASS?'))
                  doAction('qc-pass', () => api.fulfillment.orders.qualityCheck(order!.id, 'pass'))
              }} loading={actionLoading === 'qc-pass'} variant="secondary">
                <CheckCircle2 size={14} /> Pass QC
              </Button>
              <Button onClick={async () => {
                if (confirm('Mark QC as FAIL?'))
                  doAction('qc-fail', () => api.fulfillment.orders.qualityCheck(order!.id, 'fail', 'Failed QC'))
              }} loading={actionLoading === 'qc-fail'} variant="danger">
                <AlertCircle size={14} /> Fail QC
              </Button>
            </>
          )}
          {order.status === 'packing' && (
            <Button onClick={async () => {
              const tracking = prompt('Tracking number:')
              const carrier = prompt('Carrier (e.g. USPS):')
              if (tracking && carrier) doAction('ship', () => api.fulfillment.orders.ship(order!.id, tracking, carrier))
            }} loading={actionLoading === 'ship'}>
              <Send size={14} /> Mark Shipped
            </Button>
          )}
          {order.status === 'shipped' && (
            <Button onClick={() => doAction('deliver', () => api.fulfillment.orders.deliver(order!.id))} loading={actionLoading === 'deliver'}>
              <CheckCircle2 size={14} /> Mark Delivered
            </Button>
          )}
          {(order.status === 'shipped' || order.status === 'delivered') && (
            <Button onClick={async () => {
              const reason = prompt('Return reason:') || 'Customer return'
              doAction('return', () => api.fulfillment.orders.return(order!.id, reason))
            }} loading={actionLoading === 'return'} variant="danger">
              <RotateCcw size={14} /> Return
            </Button>
          )}
        </div>
      </Card>

      {/* Details */}
      <Card title="Details" padding="lg" className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-[var(--text-secondary)]">Order ID</span><p className="font-medium">{order.order_id}</p></div>
          <div><span className="text-[var(--text-secondary)]">SKU</span><p className="font-medium">{order.sku}</p></div>
          <div><span className="text-[var(--text-secondary)]">Quantity</span><p className="font-medium">{order.quantity}</p></div>
          <div><span className="text-[var(--text-secondary)]">Vendor</span><p className="font-medium">{order.vendor_id || '—'}</p></div>
          <div><span className="text-[var(--text-secondary)]">Tracking</span><p className="font-medium">{order.tracking_number || '—'}</p></div>
          <div><span className="text-[var(--text-secondary)]">Carrier</span><p className="font-medium">{order.carrier || '—'}</p></div>
        </div>
      </Card>

      {/* QC Logs */}
      <Card title="QC Logs" padding="lg">
        {qcLogs.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No QC logs yet</p>
        ) : (
          <div className="space-y-2">
            {qcLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-[var(--bg-hover)]">
                <Camera size={14} className="text-[var(--text-secondary)]" />
                <Badge variant={log.result === 'pass' ? 'success' : 'error'}>{log.result}</Badge>
                <span className="text-[var(--text-secondary)]">{log.checked_by || '—'}</span>
                {log.notes && <span className="text-[var(--text-tertiary)]">{log.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
