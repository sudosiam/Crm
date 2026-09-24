import type { Customer, FollowUp } from '../../lib/types'
import { CustomerCard } from '../customers/CustomerCard'

export function FollowUpCard({
  customer,
  followUp,
  assignee,
  today,
  onWhatsApp,
  onDone,
  onReschedule,
}: {
  customer: Customer
  followUp?: FollowUp
  assignee?: string
  today: string
  onWhatsApp: (customer: Customer) => void
  onDone: (customer: Customer) => void
  onReschedule: (customer: Customer) => void
}) {
  const view = followUp
    ? { ...customer, followUpDate: followUp.scheduledDate, followUpTime: followUp.scheduledTime }
    : customer
  return (
    <CustomerCard
      customer={view}
      assignee={assignee}
      today={today}
      showActions={followUp ? followUp.status === 'SCHEDULED' : Boolean(customer.followUpDate)}
      onWhatsApp={onWhatsApp}
      onDone={onDone}
      onReschedule={onReschedule}
    />
  )
}
