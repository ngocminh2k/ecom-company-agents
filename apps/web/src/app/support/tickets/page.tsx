'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, type SupportTicket } from '@/lib/api'
import { MessageSquare, Plus, ArrowRight, Clock, AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Input } from '@/components/Input'

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'> = {
  open: 'warning',
  waiting_customer: 'info',
  escalated: 'error',
  resolved: 'success',
  closed: 'neutral',
}

const statusIcon: Record<string, typeof MessageSquare> = {
  open: AlertTriangle,
  waiting_customer: Clock,
  escalated: AlertTriangle,
  resolved: CheckCircle2,
  closed: CheckCircle2,
}

export default function SupportTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await api.support.tickets.list()
      setTickets(res.tickets)
    } catch { setError('Failed to load tickets') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? tickets.filter(t => t.customer_email?.toLowerCase().includes(search.toLowerCase()) || t.ticket_type.toLowerCase().includes(search.toLowerCase()))
    : tickets

  if (error) return <div className="p-6 lg:p-8 max-w-7xl mx-auto"><ErrorState message={error} onRetry={load} /></div>

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'waiting_customer' || t.status === 'escalated').length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {loading ? 'Loading…' : `${tickets.length} tickets · ${openCount} open`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/support/refunds')}>Refunds</Button>
          <Button onClick={() => router.push('/support/tickets/new')}><Plus size={14} /> New Ticket</Button>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by email or type…"
        className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] mb-4" />

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} height={56} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<MessageSquare size={24} />} title="No tickets found"
          description={search ? 'Try a different search' : 'No support tickets yet'} />
      ) : (
        <Card padding="sm">
          {filtered.map(ticket => {
            const Icon = statusIcon[ticket.status] || MessageSquare
            const isOverdue = ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date()
            return (
              <button key={ticket.id} onClick={() => router.push(`/support/tickets/${ticket.id}`)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left border-b border-[var(--border-light)] last:border-0"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  ticket.status === 'escalated' ? 'bg-[var(--error-bg)]' :
                  ticket.status === 'resolved' ? 'bg-[var(--success-bg)]' : 'bg-[var(--bg-hover)]'
                }`}>
                  <Icon size={16} className={
                    ticket.status === 'escalated' ? 'text-[var(--error)]' :
                    ticket.status === 'resolved' ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{ticket.content.slice(0, 60)}…</span>
                    <Badge variant={statusBadge[ticket.status] || 'neutral'}>{ticket.status.replace(/_/g, ' ')}</Badge>
                    {isOverdue && <Badge variant="error">SLA</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {ticket.customer_email || 'Unknown'} &middot; {ticket.ticket_type}
                    {ticket.assigned_to && ` · ${ticket.assigned_to}`}
                  </p>
                </div>
                <ArrowRight size={14} className="text-[var(--text-tertiary)] shrink-0" />
              </button>
            )
          })}
        </Card>
      )}
    </div>
  )
}
