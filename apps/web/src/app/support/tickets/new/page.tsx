'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

export default function NewTicketPage() {
  const router = useRouter()
  const [customerEmail, setCustomerEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [type, setType] = useState('order_issue')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerEmail || !subject || !message) return

    setSending(true); setError(null)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          customerEmail,
          ticketType: type,
          content: `Subject: ${subject}\n\n${message}`,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create ticket')
      }
      router.push('/support/tickets')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/support/tickets')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">New Support Ticket</h1>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-[var(--error)] bg-[var(--error-bg)] rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Customer Email</label>
            <input
              value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
              type="email" required
              className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              required
              className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type} onChange={e => setType(e.target.value)}
              className="w-full h-9 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
            >
              <option value="order_issue">Order Issue</option>
              <option value="refund">Refund</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              required
              rows={6}
              className="w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-panel)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => router.push('/support/tickets')} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!customerEmail || !subject || !message} loading={sending}>
              <Send size={14} /> Create Ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
