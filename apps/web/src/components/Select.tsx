'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

type Option = { value: string; label: string }

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, className = '', ...props }, ref) => (
    <div>
      {label && <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={`w-full h-9 px-3 rounded-lg border text-sm bg-[var(--bg-page)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] appearance-none cursor-pointer disabled:opacity-50 ${error ? 'border-[var(--error)]' : 'border-[var(--border-light)]'} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--error)]">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'
