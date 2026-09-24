import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastValue {
  push: (message: string, action?: ToastItem['action']) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const push = useCallback((message: string, action?: ToastItem['action']) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, action }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), action ? 6000 : 3200)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-3 md:bottom-6">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto card flex w-full max-w-md items-center justify-between gap-3 px-4 py-3" role="status">
            <p>{toast.message}</p>
            {toast.action ? (
              <button type="button" className="font-semibold text-brand" onClick={toast.action.onClick}>
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('Toast missing')
  return value
}
