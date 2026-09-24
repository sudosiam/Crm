import { MessageCircle, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatWhen } from '../../lib/dates'
import { formatPhone, telUrl } from '../../lib/phone'
import { followUpBucket } from '../../lib/customers'
import type { Customer } from '../../lib/types'
import { StatusBadge } from '../ui/StatusBadge'

export function CustomerCard({
  customer,
  assignee,
  today,
  onWhatsApp,
  onDone,
  onReschedule,
  showActions = false,
}: {
  customer: Customer
  assignee?: string
  today: string
  onWhatsApp?: (customer: Customer) => void
  onDone?: (customer: Customer) => void
  onReschedule?: (customer: Customer) => void
  showActions?: boolean
}) {
  const bucket = followUpBucket(customer, today)
  const call = telUrl(customer.phoneNormalized)
  const overdue = bucket === 'overdue'
  return (
    <article className={`card overflow-hidden ${overdue ? 'border-warning' : ''}`}>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/customers/${customer.id}`} className="block truncate text-base font-semibold tracking-tight">
              {customer.name}
            </Link>
            <p className="mt-0.5 text-sm tabular-nums tracking-wide text-muted">{formatPhone(customer.phoneNormalized)}</p>
          </div>
          <StatusBadge status={customer.status} />
        </div>
        <p className="mt-2 truncate text-sm text-muted">
          {[customer.model, customer.batteryConfiguration].filter(Boolean).join(' · ') || 'Model not set'}
        </p>
        <p className={`mt-1 text-sm font-semibold ${overdue ? 'text-warning' : 'text-ink'}`}>
          {overdue ? 'Overdue · ' : ''}
          {formatWhen(customer.followUpDate, customer.followUpTime, today)}
        </p>
        {assignee ? <p className="mt-1 text-xs text-muted">Assigned to {assignee}</p> : null}
      </div>
      {showActions ? (
        <div className="grid grid-cols-2 border-t border-line">
          {call ? (
            <a className="btn btn-secondary rounded-none border-r border-line" href={call}>
              <Phone className="size-4" aria-hidden="true" /> Call
            </a>
          ) : (
            <span className="btn rounded-none border-r border-line text-muted">No phone</span>
          )}
          <button type="button" className="btn btn-secondary rounded-none" onClick={() => onWhatsApp?.(customer)}>
            <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
          </button>
          <button type="button" className="btn btn-primary rounded-none border-t border-r border-line" onClick={() => onDone?.(customer)} disabled={!customer.followUpDate}>
            Done
          </button>
          <button type="button" className="btn rounded-none border-t border-line bg-surface" onClick={() => onReschedule?.(customer)}>
            Reschedule
          </button>
        </div>
      ) : null}
    </article>
  )
}
