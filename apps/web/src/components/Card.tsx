import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  title?: string
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({ children, title, className = '', hover = false, padding = 'md' }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-card ${hover ? 'hover:shadow-elevated transition-shadow' : ''} ${paddings[padding]} ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}
