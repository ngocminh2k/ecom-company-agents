'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Select } from '@/components/Select'

const CHANNEL_OPTIONS = [
  { value: 'etsy', label: 'Etsy' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'tiktok', label: 'TikTok' },
]

export default function NewResearchPage() {
  const router = useRouter()
  const [productName, setProductName] = useState('')
  const [channel, setChannel] = useState('etsy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleResearch = async () => {
    if (!productName.trim()) return
    setLoading(true)
    setError(null)
    try {
      // Create sheet first
      const res = await api.productResearch.sheets.create({
        productName: productName.trim(),
        firstTestChannel: channel,
      })
      // AI will auto-research, score, and populate fields via daemon
      router.push(`/research/${res.sheet.id}`)
    } catch {
      setError('Research failed. Check daemon status.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/research')} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Product Research</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Enter a product idea — AI researches competitors, pricing, IP, and scores it</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[var(--error)]/20 bg-[var(--error-bg)] p-4 text-sm text-[var(--error)]">{error}</div>
      )}

      <Card padding="lg">
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center shrink-0 mt-1">
              <Sparkles size={20} className="text-[var(--accent)]" />
            </div>
            <div className="flex-1">
              <Input
                label="What product do you want to research?"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Eco-friendly bamboo yoga mat"
                className="text-base"
              />
            </div>
          </div>

          <div className="flex items-end gap-3 ml-13">
            <div className="w-44">
              <Select
                label="Test channel"
                value={channel}
                onChange={e => setChannel(e.target.value)}
                options={CHANNEL_OPTIONS}
              />
            </div>
            <Button onClick={handleResearch} disabled={loading || !productName.trim()} size="lg" loading={loading}>
              {loading ? 'AI is researching…' : 'Research'}
            </Button>
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] ml-13 mt-2">
              <Loader2 size={14} className="animate-spin" />
              Analyzing competitors, pricing, IP risks, and market fit…
            </div>
          )}
        </div>
      </Card>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { label: 'Competitors', desc: 'AI identifies top competitors and their pricing' },
          { label: 'Margin Analysis', desc: 'COGS, shipping, fees, and profit estimates' },
          { label: 'IP Check', desc: 'Trademark, copyright, and risk assessment' },
        ].map(item => (
          <Card key={item.label} padding="sm">
            <div className="text-sm font-medium mb-1">{item.label}</div>
            <div className="text-xs text-[var(--text-secondary)]">{item.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
