'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type ResearchSheet } from '@/lib/api'
import { ArrowLeft, ArrowUpRight, Calculator, ClipboardList, Shield } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  draft: 'neutral',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'error',
}

function ScoreVisual({ score }: { score: number | undefined }) {
  if (score === undefined || score === null) {
    return <p className="text-sm text-[var(--text-tertiary)]">Not scored yet</p>
  }
  const color = score < 50 ? 'var(--error)' : score < 70 ? 'var(--warning)' : 'var(--success)'
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-sm" style={{ color }}>
          {score < 50 ? 'Low viability' : score < 70 ? 'Moderate viability' : 'High viability'}
        </span>
      </div>
      <div className="w-full h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div>
      <dt className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm">{typeof value === 'number' ? (label.toLowerCase().includes('$') || label.toLowerCase().includes('cpa') || label.toLowerCase().includes('price') || label.toLowerCase().includes('cogs') || label.toLowerCase().includes('shipping') || label.toLowerCase().includes('fees') ? `$${value.toFixed(2)}` : label.toLowerCase().includes('margin') ? `${value}%` : value) : value}</dd>
    </div>
  )
}

export default function ResearchSheetPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const [sheet, setSheet] = useState<ResearchSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scoring, setScoring] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.productResearch.sheets.get(id)
      setSheet(res.sheet)
    } catch {
      setError('Failed to load research sheet')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleScore = async () => {
    setScoring(true)
    try {
      const res = await api.productResearch.sheets.score(id)
      setSheet(prev => prev ? { ...prev, score: res.score } : prev)
    } catch {
      // silently fail
    } finally {
      setScoring(false)
    }
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Skeleton height={24} width={200} />
        <div className="mt-6 space-y-4">
          <Skeleton height={120} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      </div>
    )
  }

  if (!sheet) return null

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => router.push('/research')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{sheet.productName}</h1>
            <Badge variant={statusBadge[sheet.status] || 'neutral'}>{sheet.status.replace(/_/g, ' ')}</Badge>
          </div>
          {sheet.niche && <p className="text-sm text-[var(--text-secondary)] mt-1">{sheet.niche}</p>}
        </div>
        <Button onClick={handleScore} loading={scoring} disabled={scoring}>
          <Calculator size={16} />
          Calculate Score
        </Button>
      </div>

      {/* Tab links */}
      <div className="flex items-center gap-4 mb-6 mt-4 border-b border-[var(--border-light)] pb-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] border-b-2 border-[var(--accent)] pb-3 -mb-[13px]">
          <FileTextIcon size={14} />
          Overview
        </span>
        <button onClick={() => router.push(`/research/${id}/competitors`)} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ClipboardList size={14} />
          Competitors
          <ArrowUpRight size={12} />
        </button>
        <button onClick={() => router.push(`/research/${id}/ip-check`)} className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Shield size={14} />
          IP Check
          <ArrowUpRight size={12} />
        </button>
      </div>

      {/* Score */}
      <Card title="Viability Score" padding="lg" className="mb-6">
        <ScoreVisual score={sheet.score} />
      </Card>

      {/* Market Overview */}
      <Card title="Market Overview" padding="lg" className="mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Target Customer" value={sheet.targetCustomer} />
          <Field label="Occasion" value={sheet.occasion} />
          <Field label="First Test Channel" value={sheet.firstTestChannel} />
          <Field label="Proposer" value={sheet.proposer} />
        </dl>
      </Card>

      {/* Competitive Landscape */}
      <Card title="Competitive Landscape" padding="lg" className="mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Main Competitors" value={sheet.mainCompetitors?.join(', ')} />
          <Field label="Keywords" value={sheet.keywords?.join(', ')} />
        </dl>
      </Card>

      {/* Financials */}
      <Card title="Financial Estimates" padding="lg" className="mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Proposed Price ($)" value={sheet.priceProposed} />
          <Field label="COGS ($)" value={sheet.cogsEstimated} />
          <Field label="Shipping ($)" value={sheet.shippingEstimated} />
          <Field label="Platform Fees ($)" value={sheet.platformFeesEstimated} />
          <Field label="CPA Target ($)" value={sheet.cpaTarget} />
          <Field label="Margin Target" value={sheet.marginTarget} />
        </dl>
      </Card>

      {/* Risks & Strategy */}
      <Card title="Risks & Strategy" padding="lg" className="mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="IP Risks" value={sheet.ipRisks} />
          <Field label="Fulfillment Risks" value={sheet.fulfillmentRisks} />
          <Field label="Content Angles" value={sheet.contentAngles?.join(', ')} />
        </dl>
      </Card>

      {/* Conclusion */}
      {sheet.conclusion && (
        <Card title="Conclusion" padding="lg" className="mb-6">
          <p className="text-sm whitespace-pre-wrap">{sheet.conclusion}</p>
        </Card>
      )}
    </div>
  )
}

function FileTextIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  )
}
