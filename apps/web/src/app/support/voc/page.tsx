'use client'

import { useState } from 'react'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { MessageSquare, ThumbsDown, AlertTriangle } from 'lucide-react'

export default function VocDashboardPage() {
  const [insights] = useState([
    { id: 1, type: 'quality', severity: 'high', title: 'Mug Handle Breakage', count: 14, text: 'Multiple customers reporting handle breaks during shipping.' },
    { id: 2, type: 'shipping', severity: 'medium', title: 'Delayed EU Delivery', count: 8, text: 'Shipments to Germany taking > 14 days recently.' },
    { id: 3, type: 'product', severity: 'low', title: 'Color mismatch', count: 3, text: 'T-shirt print colors appear darker than product photos.' }
  ])

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <a href="/support/tickets" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">&larr; Back to Support</a>
          <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2">Voice of Customer (VoC)</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            AI-generated insights from support tickets and reviews.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--info-bg)] flex items-center justify-center text-[var(--info)]">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="text-2xl font-bold">1,248</div>
            <div className="text-xs text-[var(--text-secondary)]">Interactions Analyzed</div>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--warning-bg)] flex items-center justify-center text-[var(--warning)]">
            <ThumbsDown size={18} />
          </div>
          <div>
            <div className="text-2xl font-bold">8.4%</div>
            <div className="text-xs text-[var(--text-secondary)]">Negative Sentiment</div>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--error-bg)] flex items-center justify-center text-[var(--error)]">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="text-2xl font-bold">3</div>
            <div className="text-xs text-[var(--text-secondary)]">Active Product Alerts</div>
          </div>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Actionable Insights</h2>
      <div className="space-y-4">
        {insights.map(insight => (
          <Card key={insight.id} padding="lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{insight.title}</h3>
                  <Badge variant={insight.severity === 'high' ? 'error' : insight.severity === 'medium' ? 'warning' : 'neutral'}>
                    {insight.severity}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{insight.text}</p>
                <div className="mt-3 text-xs text-[var(--text-tertiary)] flex items-center gap-2">
                  <span className="font-medium bg-[var(--bg-hover)] px-2 py-1 rounded">{insight.count} mentions</span>
                  <span>Category: {insight.type}</span>
                </div>
              </div>
              <button className="text-xs text-[var(--accent)] hover:underline">Investigate</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
