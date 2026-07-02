'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

export default function InventoryAllocationPage() {
  const params = useParams()
  const productId = params?.id as string
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [allocations, setAllocations] = useState([
    { location: 'US East (Main)', quantity: 50 },
    { location: 'US West (Backup)', quantity: 20 },
    { location: 'EU Central', quantity: 0 }
  ])

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }, 800)
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <a href="/products" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Back to Products</a>
        <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Inventory Allocation</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Manage stock distribution for product {productId}
        </p>
      </div>

      <Card padding="lg">
        <div className="space-y-4">
          {allocations.map((alloc, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border border-[var(--border-light)] rounded-lg bg-[var(--bg-hover)]">
              <span className="font-medium text-sm">{alloc.location}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">Qty:</span>
                <input
                  type="number"
                  value={alloc.quantity}
                  onChange={(e) => {
                    const newAllocs = [...allocations]
                    newAllocs[idx].quantity = parseInt(e.target.value) || 0
                    setAllocations(newAllocs)
                  }}
                  className="w-20 h-8 rounded border border-[var(--border-medium)] bg-[var(--bg-panel)] px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                />
              </div>
            </div>
          ))}
          
          <div className="pt-4 flex items-center gap-4">
            <Button onClick={handleSave} loading={loading}>Save Allocations</Button>
            {success && <span className="text-sm text-[var(--success)]">Allocations updated successfully.</span>}
          </div>
        </div>
      </Card>
    </div>
  )
}
