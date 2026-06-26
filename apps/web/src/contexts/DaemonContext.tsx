'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'

type DaemonStatus = 'connecting' | 'online' | 'offline'

type DaemonCtx = {
  status: DaemonStatus
  version?: string
  lastChecked: Date | null
  checkNow: () => Promise<void>
}

const Ctx = createContext<DaemonCtx>({
  status: 'connecting',
  lastChecked: null,
  checkNow: async () => {},
})
export const useDaemon = () => useContext(Ctx)

export function DaemonProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DaemonStatus>('connecting')
  const [version, setVersion] = useState<string>()
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkNow = useCallback(async () => {
    try {
      const data = await api.health()
      if (data.status === 'ok') {
        setStatus('online')
        setVersion(data.version)
      } else {
        setStatus('offline')
      }
    } catch {
      setStatus('offline')
    }
    setLastChecked(new Date())
  }, [])

  useEffect(() => {
    checkNow()
    const interval = setInterval(checkNow, 15_000)
    return () => clearInterval(interval)
  }, [checkNow])

  return (
    <Ctx value={{ status, version, lastChecked, checkNow }}>
      {children}
    </Ctx>
  )
}
