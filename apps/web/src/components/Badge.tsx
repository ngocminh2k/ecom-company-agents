import type { ReactNode } from 'react'

const variants = {
  success: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20',
  error: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error)]/20',
  info: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/20',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/20',
  neutral: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-light)]',
} as const

type Props = {
  variant?: keyof typeof variants
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
