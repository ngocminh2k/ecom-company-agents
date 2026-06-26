'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounce?: number
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Search…', debounce = 300, className = '' }: Props) {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, debounce)
    return () => clearTimeout(timer)
    // ponytail: add AbortController if onChange is async
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounce])

  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-light)] text-sm bg-[var(--bg-page)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] placeholder:text-[var(--text-tertiary)]"
      />
    </div>
  )
}
