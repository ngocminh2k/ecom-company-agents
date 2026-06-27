'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, type Summary } from '@/lib/api'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.summary()
      setSummary(res.summary)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const cards = summary ? [
    { label: 'Revenue', value: `$${summary.revenue?.toLocaleString()}`, color: 'var(--success)' },
    { label: 'Orders', value: String(summary.orders), color: 'var(--info)' },
    { label: 'AOV', value: `$${summary.aov}`, color: 'var(--accent)' },
    { label: 'Conversion', value: `${summary.conversionRate}%`, color: 'var(--warning)' },
    { label: 'Ad ROAS', value: `${summary.roas}x`, color: 'var(--error)' },
    { label: 'Customers', value: String(summary.customers), color: 'var(--text-primary)' },
  ] : []

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <a href="/" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Home</a>
      <h1 className="text-2xl font-semibold tracking-tight mt-4 mb-8">Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height={96} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <div key={i} className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-6 shadow-card">
              <div className="text-sm text-[var(--text-secondary)] mb-1">{card.label}</div>
              <div className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-8 p-6 rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-card">
          <h2 className="font-semibold mb-4 text-sm">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="/products" className="p-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-sm font-medium text-center hover:opacity-80 transition-opacity">
              Manage Products
            </a>
            <a href="/workspace" className="p-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-sm font-medium text-center hover:opacity-80 transition-opacity">
              Chat with Agents
            </a>
            <a href="/agents" className="p-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-sm font-medium text-center hover:opacity-80 transition-opacity">
              Browse Agents
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
