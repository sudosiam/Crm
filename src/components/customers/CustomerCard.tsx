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
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <Link to={`/customers/${customer.id}`} className="min-w-0 truncate text-sm font-semibold tracking-tight">
            {customer.name}
          </Link>
          <StatusBadge status={customer.status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {formatPhone(customer.phoneNormalized)}
          {' · '}
          {[customer.model, customer.batteryConfiguration].filter(Boolean).join(' · ') || 'Model not set'}
        </p>
        <p className={`mt-0.5 text-xs font-semibold ${overdue ? 'text-warning' : 'text-ink'}`}>
          {overdue ? 'Overdue · ' : ''}
          {formatWhen(customer.followUpDate, customer.followUpTime, today)}
          {assignee ? ` · ${assignee}` : ''}
        </p>
      </div>
      {showActions ? (
        <div className="grid grid-cols-2 border-t border-line">
          {call ? (
            <a className="btn btn-secondary rounded-none border-r border-line text-xs" href={call}>
              <Phone className="size-4" aria-hidden="true" /> Call
            </a>
          ) : (
            <span className="btn rounded-none border-r border-line text-xs text-muted">No phone</span>
          )}
          <button type="button" className="btn btn-secondary rounded-none text-xs" onClick={() => onWhatsApp?.(customer)}>
            <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
          </button>
          <button type="button" className="btn btn-primary rounded-none border-t border-r border-line text-xs" onClick={() => onDone?.(customer)} disabled={!customer.followUpDate}>
            Done
          </button>
          <button type="button" className="btn rounded-none border-t border-line bg-surface text-xs" onClick={() => onReschedule?.(customer)}>
            Reschedule
          </button>
        </div>
      ) : null}
    </article>
  )
}
