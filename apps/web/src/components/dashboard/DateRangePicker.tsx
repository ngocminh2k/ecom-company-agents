'use client'

import { Button } from '@/components/Button'

type Props = {
  start: string
  end: string
  onChange: (range: { start: string; end: string }) => void
}

const presets = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export function DateRangePicker({ start, end, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      {presets.map((p) => {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(endDate.getDate() - p.days)
        const s = startDate.toISOString().slice(0, 10)
        const e = endDate.toISOString().slice(0, 10)
        const isActive = start === s && end === e
        return (
          <Button
            key={p.label}
            size="sm"
            variant={isActive ? 'primary' : 'secondary'}
            onClick={() => onChange({ start: s, end: e })}
          >
            {p.label}
          </Button>
        )
      })}
      <span className="text-xs text-[var(--text-tertiary)] mx-1">|</span>
      <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        <span>From</span>
        <input
          type="date"
          value={start}
          onChange={(e) => onChange({ start: e.target.value, end })}
          className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        <span>To</span>
        <input
          type="date"
          value={end}
          onChange={(e) => onChange({ start, end: e.target.value })}
          className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
        />
      </label>
    </div>
  )
}
