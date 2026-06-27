'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, type Product } from '@/lib/api'
import { Package } from 'lucide-react'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('pod')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [creating, setCreating] = useState(false)
  const [nameError, setNameError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.products.list()
      setProducts(res.products)
    } catch {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setNameError('')
    if (!name.trim()) {
      setNameError('Product name is required')
      return
    }
    setCreating(true)
    try {
      await api.products.create({ name, type, description: description || undefined, price: price ? parseFloat(price) : undefined })
      setName('')
      setType('pod')
      setDescription('')
      setPrice('')
      await load()
    } catch {
      setError('Failed to create product')
    } finally {
      setCreating(false)
    }
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <a href="/" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Home</a>
      <h1 className="text-2xl font-semibold tracking-tight mt-4 mb-8">Products</h1>

      {/* New Product Form */}
      <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-6 mb-8 shadow-card">
        <h2 className="font-semibold mb-4 text-sm">New Product</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input value={name} onChange={e => { setName(e.target.value); setNameError('') }}
              placeholder="Product name"
              className={`w-full h-9 rounded-lg border ${nameError ? 'border-[var(--error)]' : 'border-[var(--border-medium)]'} bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]`} />
            {nameError && <p className="text-xs text-[var(--error)] mt-1">{nameError}</p>}
          </div>
          <select value={type} onChange={e => setType(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]">
            <option value="pod">POD</option>
            <option value="dropshipping">Dropshipping</option>
          </select>
          <Button onClick={handleCreate} loading={creating}>Create</Button>
        </div>
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="mt-2 w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]" />
      </div>

      {/* Product List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={64} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="No products yet"
          description="Create your first product using the form above."
        />
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-4 flex items-center justify-between shadow-card">
              <div>
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{p.type} &middot; {p.price ? `$${p.price.toFixed(2)}` : '—'}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                p.status === 'active' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                p.status === 'draft' ? 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]' :
                'bg-[var(--warning-bg)] text-[var(--warning)]'
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
