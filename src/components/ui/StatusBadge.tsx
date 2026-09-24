import { STATUS_META } from '../../lib/business'
import type { CustomerStatus } from '../../lib/types'

export function StatusBadge({ status }: { status: CustomerStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${meta.tone}`}>
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  )
}
