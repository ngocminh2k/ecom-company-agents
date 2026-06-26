'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type IpCheckResult } from '@/lib/api'
import { ArrowLeft, FileText, ClipboardList, Shield, Play } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'

function RiskBadge({ label, risk }: { label: string; risk: string }) {
  const variant: Record<string, 'success' | 'warning' | 'error' | 'accent' | 'neutral'> = {
    none: 'success',
    low: 'accent',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <Badge variant={variant[risk] || 'neutral'}>{risk}</Badge>
    </div>
  )
}

export default function IpCheckPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const [checks, setChecks] = useState<IpCheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.productResearch.ipCheck.history(id)
      setChecks(res.ipChecks)
    } catch {
      setError('Failed to load IP check history')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRunCheck = async () => {
    setRunning(true)
    try {
      const res = await api.productResearch.ipCheck.run({ productId: id, checker: '' })
      setChecks(prev => [res.ipCheck, ...prev])
    } catch {
      setError('IP check failed. Please try again.')
    } finally {
      setRunning(false)
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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push(`/research/${id}`)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">IP Check</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Intellectual property risk assessment</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/research/${id}`)}>
            <FileText size={14} />
            Overview
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/research/${id}/competitors`)}>
            <ClipboardList size={14} />
            Competitors
          </Button>
          <Button size="sm" onClick={handleRunCheck} loading={running} disabled={running}>
            <Play size={14} />
            Run IP Check
          </Button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={160} />
          <Skeleton height={160} />
        </div>
      ) : checks.length === 0 ? (
        <EmptyState
          icon={<Shield size={24} />}
          title="No IP checks yet"
          description="Run an IP check to assess trademark, copyright, and character risks for this product."
          action={
            <Button onClick={handleRunCheck} loading={running} disabled={running}>
              <Play size={16} />
              Run IP Check
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {checks.map((check) => (
            <Card key={check.id} padding="lg" className="relative">
              {/* Check header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-[var(--accent)]" />
                  <span className="font-medium text-sm">Check {check.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {check.checker && <span className="text-xs text-[var(--text-tertiary)]">by {check.checker}</span>}
                </div>
              </div>

              {/* Risk breakdown */}
              <div className="space-y-0 mb-4">
                <RiskBadge label="Trademark Risk" risk={check.trademarkRisk} />
                <RiskBadge label="Copyright Risk" risk={check.copyrightRisk} />
                <RiskBadge label="Character Risk" risk={check.characterRisk} />
              </div>

              {/* Conclusion */}
              {check.conclusion && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--bg-hover)]">
                  <p className="text-xs text-[var(--text-tertiary)] font-medium mb-1">Conclusion</p>
                  <p className="text-sm">{check.conclusion}</p>
                </div>
              )}

              {/* Details row */}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--text-tertiary)]">
                {check.assetSource && <span>Source: {check.assetSource}</span>}
                {check.license && <span>License: {check.license}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
