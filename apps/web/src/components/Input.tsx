'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  icon?: LucideIcon
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, icon: Icon, className = '', ...props }, ref) => (
    <div>
      {label && <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            <Icon size={14} />
          </div>
        )}
        <input
          ref={ref}
          className={`w-full h-9 rounded-lg border text-sm bg-[var(--bg-page)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] placeholder:text-[var(--text-tertiary)] disabled:opacity-50 ${Icon ? 'pl-9' : 'px-3'} ${error ? 'border-[var(--error)]' : 'border-[var(--border-light)]'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-[var(--error)]">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
