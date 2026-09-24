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
  return (
    <article className={`card p-4 ${bucket === 'overdue' ? 'border-l-4 border-l-warning' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/customers/${customer.id}`} className="text-lg font-semibold">
            {customer.name}
          </Link>
          <p className="mt-0.5 tabular-nums tracking-wide">{formatPhone(customer.phoneNormalized)}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>
      <p className="mt-2 text-muted">
        {[customer.model, customer.batteryConfiguration].filter(Boolean).join(' · ') || 'Model not set'}
      </p>
      <p className={`mt-1 text-sm font-semibold ${bucket === 'overdue' ? 'text-warning' : 'text-ink'}`}>
        {bucket === 'overdue' ? 'Overdue · ' : ''}
        {formatWhen(customer.followUpDate, customer.followUpTime, today)}
      </p>
      {assignee ? <p className="mt-1 text-sm text-muted">Assigned to {assignee}</p> : null}
      {showActions ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {call ? (
            <a className="btn btn-secondary" href={call}>
              <Phone className="size-4" aria-hidden="true" /> Call
            </a>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={() => onWhatsApp?.(customer)}>
            <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onDone?.(customer)} disabled={!customer.followUpDate}>
            Done
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onReschedule?.(customer)}>
            Reschedule
          </button>
        </div>
      ) : null}
    </article>
  )
}
