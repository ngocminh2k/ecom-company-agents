'use client'

import { useState } from 'react'
import { useDaemon } from '@/contexts/DaemonContext'
import { RefreshCw, WifiOff } from 'lucide-react'

export function DaemonBanner() {
  const { status, checkNow } = useDaemon()
  const [dismissed, setDismissed] = useState(false)

  if (status !== 'offline' || dismissed) return null

  return (
    <div className="flex items-center gap-3 px-6 py-2.5 bg-[var(--warning-bg)] border-b border-[var(--warning)]/20">
      <WifiOff size={14} className="text-[var(--warning)] shrink-0" />
      <p className="text-xs text-[var(--warning)] flex-1">
        Daemon offline — showing cached/mock data
      </p>
      <button
        onClick={checkNow}
        className="flex items-center gap-1 text-xs font-medium text-[var(--warning)] hover:opacity-80 transition-opacity"
      >
        <RefreshCw size={12} />
        Retry
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-xs text-[var(--warning)]/60 hover:text-[var(--warning)] transition-colors"
      >
        Dismiss
      </button>
    </div>
  )
}
