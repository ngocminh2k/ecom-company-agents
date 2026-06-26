import type { ReactNode } from 'react'

type Props = {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] p-12 text-center shadow-card ${className}`}>
      {icon && <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-4">{icon}</div>}
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text-secondary)] mb-4">{description}</p>}
      {action}
    </div>
  )
}
