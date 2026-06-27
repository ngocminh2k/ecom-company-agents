'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function DisputesPage() {
  const [success, setSuccess] = useState(false)
  const [activeDispute, setActiveDispute] = useState<string | null>(null)
  const [disputes, setDisputes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDisputes() {
      try {
        const res = await api.finance.disputes.list()
        setDisputes(res.data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load disputes')
      } finally {
        setIsLoading(false)
      }
    }
    loadDisputes()
  }, [])

  const handleStartDispute = (id: string) => {
    setActiveDispute(id)
    setSuccess(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeDispute) return

    setIsSubmitting(true)
    setError('')

    try {
      await api.finance.disputes.submitEvidence({
        disputeId: activeDispute,
        customerName,
        trackingNumber,
        carrier
      })

      setSuccess(true)
      setActiveDispute(null)

      // Update local state to reflect submission
      setDisputes(prev => prev.map(d =>
        d.id === activeDispute ? { ...d, status: 'under_review' } : d
      ))
    } catch (err: any) {
      setError(err.message || 'Failed to submit evidence')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Disputes</h1>
        <p className="text-[var(--text-secondary)]">Manage chargebacks and submit evidence to Stripe</p>
      </div>

      {/* List of disputes */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded-xl overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead className="bg-[var(--bg-base)] border-b border-[var(--border-light)] text-sm text-[var(--text-secondary)]">
            <tr>
              <th className="px-6 py-3 font-medium">Dispute ID</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Reason</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-light)]">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  Loading disputes...
                </td>
              </tr>
            ) : disputes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  No disputes found.
                </td>
              </tr>
            ) : (
              disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-[var(--bg-base)] transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{dispute.id}</td>
                  <td className="px-6 py-4">${(dispute.amount / 100).toFixed(2)}</td>
                  <td className="px-6 py-4">{dispute.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      dispute.status === 'needs_response'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {dispute.status === 'needs_response' && (
                      <button
                        onClick={() => handleStartDispute(dispute.id)}
                        className="bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Submit Evidence
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-lg mb-8">
          Evidence submitted successfully
        </div>
      )}

      {/* Evidence Form */}
      {activeDispute && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded-xl p-6">
          <h2 className="text-lg font-medium mb-4">Submit Evidence for {activeDispute}</h2>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Customer Name
              </label>
              <input
                id="customerName"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
                className="w-full border border-[var(--border-medium)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label htmlFor="trackingNumber" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Tracking Number
              </label>
              <input
                id="trackingNumber"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                required
                className="w-full border border-[var(--border-medium)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label htmlFor="carrier" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Carrier
              </label>
              <input
                id="carrier"
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                required
                className="w-full border border-[var(--border-medium)] rounded-lg px-3 py-2 bg-[var(--bg-base)] text-[var(--text-primary)]"
              />
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setActiveDispute(null)}
                className="px-4 py-2 border border-[var(--border-medium)] rounded-lg hover:bg-[var(--bg-base)] text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[var(--accent)] text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit to Stripe'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}