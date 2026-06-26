'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  total: number
  perPage: number
  onChange: (page: number) => void
}

export function Pagination({ page, total, perPage, onChange }: Props) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null

  const range: (number | '...')[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) range.push(i)
    else if (range[range.length - 1] !== '...') range.push('...')
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-[var(--text-tertiary)]">
        Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {range.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="h-8 w-8 flex items-center justify-center text-xs text-[var(--text-tertiary)]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
