'use client'

import { useState } from 'react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { AlertCircle, ArrowRight, Truck } from 'lucide-react'

export default function NdrDashboardPage() {
  const [ndrs] = useState([
    { id: 'ndr-1', orderId: 'ord-123', status: 'action_required', reason: 'Address not found', carrier: 'USPS', age: '2 days' },
    { id: 'ndr-2', orderId: 'ord-124', status: 'customer_contacted', reason: 'Customer not available', carrier: 'FedEx', age: '1 day' },
    { id: 'ndr-3', orderId: 'ord-125', status: 'resolved', reason: 'Refused by recipient', carrier: 'UPS', age: '3 days' },
  ])

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <a href="/fulfillment" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Back to Fulfillment</a>
        <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Non-Delivery Reports (NDR)</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage failed delivery attempts and exceptions.
        </p>
      </div>

      <Card padding="sm">
        {ndrs.map(ndr => (
          <div key={ndr.id} className="w-full flex items-center gap-4 px-4 py-3 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              ndr.status === 'resolved' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
              ndr.status === 'action_required' ? 'bg-[var(--error-bg)] text-[var(--error)]' : 'bg-[var(--warning-bg)] text-[var(--warning)]'
            }`}>
              {ndr.status === 'action_required' ? <AlertCircle size={16} /> : <Truck size={16} />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{ndr.orderId}</span>
                <Badge variant={ndr.status === 'action_required' ? 'error' : ndr.status === 'resolved' ? 'success' : 'warning'}>
                  {ndr.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {ndr.reason} &middot; {ndr.carrier} &middot; {ndr.age}
              </p>
            </div>
            
            <button className="text-xs text-[var(--accent)] hover:underline shrink-0">
              Review
            </button>
          </div>
        ))}
      </Card>
    </div>
  )
}
