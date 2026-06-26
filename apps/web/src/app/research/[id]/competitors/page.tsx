'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type CompetitorEntry } from '@/lib/api'
import { ArrowLeft, ArrowUpRight, Plus, X, FileText, Shield } from 'lucide-react'
import { Table } from '@/components/Table'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

export default function CompetitorsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ competitorName: '', price: '', reviews: '', keyMessage: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.productResearch.competitors.list(id)
      setCompetitors(res.competitors)
    } catch {
      setError('Failed to load competitors')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.competitorName.trim()) return
    setCreating(true)
    try {
      const res = await api.productResearch.competitors.create({
        productId: id,
        competitorName: form.competitorName,
        price: form.price ? Number(form.price) : undefined,
        reviews: form.reviews ? Number(form.reviews) : undefined,
        keyMessage: form.keyMessage || undefined,
      })
      setCompetitors(prev => [res.competitor, ...prev])
      setForm({ competitorName: '', price: '', reviews: '', keyMessage: '' })
      setShowForm(false)
    } catch {
      setError('Failed to add competitor')
    } finally {
      setCreating(false)
    }
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push(`/research/${id}`)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Competitors</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Competitor analysis for this product</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/research/${id}`)}>
            <FileText size={14} />
            Overview
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/research/${id}/ip-check`)}>
            <Shield size={14} />
            IP Check
          </Button>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">New Competitor</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X size={16} />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Input label="Competitor Name" value={form.competitorName} onChange={e => setForm(f => ({ ...f, competitorName: e.target.value }))} placeholder="Brand name" required />
            <Input label="Price ($)" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            <Input label="Reviews (count)" type="number" min="0" value={form.reviews} onChange={e => setForm(f => ({ ...f, reviews: e.target.value }))} placeholder="e.g. 1200" />
            <Input label="Key Message" value={form.keyMessage} onChange={e => setForm(f => ({ ...f, keyMessage: e.target.value }))} placeholder="Their key differentiator" />
          </div>
          <Button type="submit" disabled={creating || !form.competitorName.trim()} loading={creating}>
            {creating ? 'Adding…' : 'Add Competitor'}
          </Button>
        </form>
      )}

      {/* Table */}
      <Table
        data={competitors}
        columns={[
          {
            key: 'competitorName', header: 'Name',
            render: (c: CompetitorEntry) => <span className="font-medium">{c.competitorName}</span>,
          },
          { key: 'price', header: 'Price', align: 'right', render: (c: CompetitorEntry) => <>{c.price != null ? `$${c.price.toFixed(2)}` : '--'}</> },
          { key: 'reviews', header: 'Reviews', align: 'right', render: (c: CompetitorEntry) => <>{c.reviews != null ? c.reviews.toLocaleString() : '--'}</> },
          { key: 'keyMessage', header: 'Key Features', render: (c: CompetitorEntry) => <span className="text-[var(--text-secondary)]">{c.keyMessage || '--'}</span> },
        ]}
        keyExtractor={(c: CompetitorEntry) => c.id}
        isLoading={loading}
        emptyState={
          <EmptyState
            icon={<ClipboardListIcon size={24} />}
            title="No competitors recorded"
            description="Add your first competitor to analyze the competitive landscape."
            action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Competitor</Button>}
          />
        }
      />
    </div>
  )
}

function ClipboardListIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  )
}
