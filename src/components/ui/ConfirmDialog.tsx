export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 md:items-center" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="card w-full max-w-md p-5">
        <h2 id="confirm-title" className="font-display text-2xl">{title}</h2>
        <p className="mt-2 text-muted">{body}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>{cancelLabel}</button>
          <button type="button" className="btn btn-primary flex-1" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
