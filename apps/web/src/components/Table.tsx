import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'

type Column<T> = {
  key: string
  header: string
  render: (item: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}

type Props<T> = {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  emptyState?: ReactNode
  isLoading?: boolean
  skeletonRows?: number
  keyExtractor: (item: T) => string
}

export function Table<T>({ data, columns, onRowClick, emptyState, isLoading, skeletonRows = 5, keyExtractor }: Props<T>) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                {columns.map((col) => (
                  <th key={col.key} className={`px-5 py-3 text-${col.align || 'left'} font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-light)] last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                      <Skeleton height={14} width={col.key === 'name' || col.key === 'customer' ? 140 : 80} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-light)]">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3 text-${col.align || 'left'} font-medium text-[var(--text-secondary)] text-xs uppercase tracking-wider ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-[var(--border-light)] last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-hover)]' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
