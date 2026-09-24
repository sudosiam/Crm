import { useEffect, type ReactNode } from 'react'

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-center md:p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:rounded-xl md:p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="sheet-title" className="text-lg font-semibold tracking-tight">{title}</h2>
          <button type="button" className="btn btn-ghost min-h-10 px-3" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}
