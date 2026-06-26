'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'
type ToastItem = { id: string; variant: ToastVariant; message: string }

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const colors = { success: 'border-l-[var(--success)]', error: 'border-l-[var(--error)]', info: 'border-l-[var(--info)]' }

type ToastCtx = { toast: (variant: ToastVariant, message: string) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((variant: ToastVariant, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setItems((prev) => [...prev, { id, variant, message }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id))

  return (
    <Ctx value={{ toast }}>
      {children}
      {items.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {items.map((t) => {
            const Icon = icons[t.variant]
            return (
              <div key={t.id} className={`flex items-start gap-3 rounded-lg border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-dialog px-4 py-3 border-l-4 ${colors[t.variant]} animate-in slide-in-from-right`}>
                <Icon size={16} className={t.variant === 'success' ? 'text-[var(--success)]' : t.variant === 'error' ? 'text-[var(--error)]' : 'text-[var(--info)] shrink-0 mt-0.5'} />
                <p className="text-sm text-[var(--text-primary)] flex-1">{t.message}</p>
                <button onClick={() => remove(t.id)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0">
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Ctx>
  )
}
