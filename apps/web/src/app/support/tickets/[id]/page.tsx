'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type SupportTicket, type TicketResponse, type Macro } from '@/lib/api'
import { ArrowLeft, MessageSquare, Send, AlertTriangle, CheckCircle2, BookOpen } from 'lucide-react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Skeleton } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [responses, setResponses] = useState<TicketResponse[]>([])
  const [macros, setMacros] = useState<Macro[]>([])
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [ticketRes, macroRes] = await Promise.all([
        api.support.tickets.get(id),
        api.support.macros.list(),
      ])
      setTicket(ticketRes.ticket)
      setMacros(macroRes.macros)
    } catch { setError('Failed to load ticket') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleReply = async () => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await api.support.tickets.respond(id, replyText)
      setReplyText('')
      await load()
    } catch { /* silent */ }
    finally { setSending(false) }
  }

  const handleEscalate = async () => {
    try {
      await api.support.tickets.escalate(id)
      await load()
    } catch { /* silent */ }
  }

  const handleResolve = async () => {
    try {
      await api.support.tickets.resolve(id)
      await load()
    } catch { /* silent */ }
  }

  const applyMacro = (macro: Macro) => {
    setReplyText(macro.body)
  }

  if (error) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><ErrorState message={error} onRetry={load} /></div>
  if (loading) return <div className="p-6 lg:p-8 max-w-4xl mx-auto"><Skeleton height={24} width={200} /><div className="mt-4 space-y-3"><Skeleton height={80} /><Skeleton height={120} /></div></div>
  if (!ticket) return null

  const isSlaBreached = ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date()

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/support/tickets')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft size={18} /></button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{ticket.ticket_type}</h1>
            <Badge variant={ticket.status === 'open' ? 'warning' : ticket.status === 'escalated' ? 'error' : 'success'}>
              {ticket.status.replace(/_/g, ' ')}
            </Badge>
            {isSlaBreached && <Badge variant="error">SLA Breached</Badge>}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{ticket.customer_email || ticket.channel}</p>
        </div>
      </div>

      {/* Ticket Content */}
      <Card padding="lg" className="mb-6">
        <p className="text-sm whitespace-pre-wrap">{ticket.content}</p>
        <div className="mt-3 text-xs text-[var(--text-tertiary)]">
          Channel: {ticket.channel} · Created: {new Date(ticket.created_at).toLocaleString()}
          {ticket.sla_deadline && ` · SLA: ${new Date(ticket.sla_deadline).toLocaleString()}`}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        {(ticket.status === 'open' || ticket.status === 'waiting_customer') && (
          <>
            <Button onClick={handleEscalate} variant="danger">
              <AlertTriangle size={14} /> Escalate
            </Button>
            <Button onClick={handleResolve} variant="secondary">
              <CheckCircle2 size={14} /> Resolve
            </Button>
          </>
        )}
      </div>

      {/* Macros */}
      {macros.length > 0 && (
        <Card title="Quick Replies" padding="sm" className="mb-6">
          <div className="space-y-1">
            {macros.map(m => (
              <button key={m.key} onClick={() => applyMacro(m)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--bg-hover)] rounded-lg transition-colors text-left"
              >
                <BookOpen size={14} className="text-[var(--text-secondary)] shrink-0" />
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-[var(--text-tertiary)] truncate">{m.subject}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Reply */}
      <Card title="Reply" padding="lg">
        <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
          placeholder="Type your reply…"
          className="w-full min-h-[100px] rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] resize-y" />
        <div className="flex justify-end mt-3">
          <Button onClick={handleReply} disabled={!replyText.trim()} loading={sending}>
            <Send size={14} /> Send Reply
          </Button>
        </div>
      </Card>
    </div>
  )
}
