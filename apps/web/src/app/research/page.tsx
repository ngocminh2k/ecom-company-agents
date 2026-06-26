'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type ResearchSheet } from '@/lib/api'
import { FileText, Plus } from 'lucide-react'
import { Table } from '@/components/Table'
import { Badge } from '@/components/Badge'
import { SearchInput } from '@/components/SearchInput'
import { Select } from '@/components/Select'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  draft: 'neutral',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'error',
}

function ScoreBar({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) return <span className="text-[var(--text-tertiary)] text-xs">--</span>
  const color = score < 50 ? 'var(--error)' : score < 70 ? 'var(--warning)' : 'var(--success)'
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color }}>{score}</span>
    </div>
  )
}

function ResearchPageInner() {
  const [sheets, setSheets] = useState<ResearchSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const sp = searchParams ?? new URLSearchParams()
  const search = sp.get('search') || ''
  const statusFilter = sp.get('status') || ''

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(sp)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    router.push(`/research?${p.toString()}`)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.productResearch.sheets.list()
      setSheets(res.sheets)
    } catch {
      setError('Failed to load research sheets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = sheets.filter(s => {
    if (search && !s.productName.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && s.status !== statusFilter) return false
    return true
  })

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
          <h1 className="text-2xl font-semibold tracking-tight">Product Research</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${filtered.length} sheet${filtered.length !== 1 ? 's' : ''}${search || statusFilter ? ' (filtered)' : ''}`}
          </p>
        </div>
        <Button onClick={() => router.push('/research/new')}>
          <Plus size={16} />
          New Sheet
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => setParam('search', v)}
          placeholder="Search by product name…"
          className="w-60"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setParam('status', e.target.value)}
          className="w-40"
        />
      </div>

      {/* Table */}
      <Table
        data={filtered}
        columns={[
          {
            key: 'productName', header: 'Product Name',
            render: (s: ResearchSheet) => (
              <div>
                <div className="font-medium">{s.productName}</div>
                {s.niche && <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.niche}</div>}
              </div>
            ),
          },
          { key: 'niche', header: 'Niche', render: (s: ResearchSheet) => <span className="text-[var(--text-secondary)]">{s.niche || '--'}</span> },
          {
            key: 'score', header: 'Score', align: 'right',
            render: (s: ResearchSheet) => <ScoreBar score={s.score} />,
          },
          {
            key: 'status', header: 'Status',
            render: (s: ResearchSheet) => <Badge variant={statusBadge[s.status] || 'neutral'}>{s.status.replace(/_/g, ' ')}</Badge>,
          },
          { key: 'proposer', header: 'Proposer', render: (s: ResearchSheet) => <span className="text-[var(--text-secondary)]">{s.proposer || '--'}</span> },
          {
            key: 'created_at', header: 'Date',
            render: (s: ResearchSheet) => <span className="text-xs text-[var(--text-secondary)]">{new Date(s.created_at).toLocaleDateString()}</span>,
          },
        ]}
        keyExtractor={(s: ResearchSheet) => s.id}
        onRowClick={(s: ResearchSheet) => router.push(`/research/${s.id}`)}
        isLoading={loading}
        emptyState={
          <EmptyState
            icon={<FileText size={24} />}
            title={search || statusFilter ? 'No sheets match your filters' : 'No research sheets yet'}
            description={search || statusFilter ? 'Try adjusting your search or filters.' : 'Create your first product research sheet to get started.'}
            action={!search && !statusFilter ? (
              <Button onClick={() => router.push('/research/new')}>
                <Plus size={16} />
                New Sheet
              </Button>
            ) : undefined}
          />
        }
      />
    </div>
  )
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8 max-w-7xl mx-auto"><Skeleton height={20} width={120} /><div className="mt-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} height={60} width="100%" />)}</div></div>}>
      <ResearchPageInner />
    </Suspense>
  )
}
