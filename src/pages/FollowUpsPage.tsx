import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FollowUpCard } from '../components/followups/FollowUpCard'
import { RescheduleSheet } from '../components/followups/RescheduleSheet'
import { WhatsAppSheet } from '../components/whatsapp/WhatsAppSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { followUpBucket } from '../lib/customers'
import { formatDate, todayISO } from '../lib/dates'
import { humanizeError } from '../lib/errors'
import type { Customer, FollowUp } from '../lib/types'

const tabs = ['today', 'upcoming', 'overdue', 'completed'] as const
type Tab = (typeof tabs)[number]

export function FollowUpsPage() {
  const { repo, workspace } = useApp()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = tabs.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'today'
  const [rows, setRows] = useState<Array<{ customer: Customer; followUp: FollowUp }>>([])
  const [loading, setLoading] = useState(true)
  const [whatsapp, setWhatsapp] = useState<Customer | null>(null)
  const [reschedule, setReschedule] = useState<Customer | null>(null)
  const today = todayISO()

  useEffect(() => {
    const snapshot = repo.snapshot()
    const customers = new Map((snapshot?.customers ?? []).map((customer) => [customer.id, customer]))
    setRows(
      (snapshot?.followUps ?? []).flatMap((followUp) => {
        const customer = customers.get(followUp.customerId)
        return customer ? [{ customer, followUp }] : []
      }),
    )
    setLoading(false)
  }, [repo, workspace])

  const visible = rows.filter(({ customer, followUp }) => {
    if (tab === 'completed') return followUp.status === 'COMPLETED'
    if (followUp.status !== 'SCHEDULED') return false
    const bucket = followUpBucket({ ...customer, followUpDate: followUp.scheduledDate, status: customer.status }, today)
    return bucket === tab
  })
  const empty = {
    today: 'No follow-ups today 🎉',
    upcoming: 'No upcoming follow-ups.',
    overdue: 'No overdue follow-ups.',
    completed: 'No completed follow-ups yet.',
  }[tab]

  return (
    <div>
      <h1 className="font-display text-4xl">Follow-ups</h1>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button key={item} type="button" className="chip capitalize" aria-pressed={tab === item} onClick={() => setParams({ tab: item })}>
            {item}
          </button>
        ))}
      </div>
      {loading ? <LoadingState label="Loading follow-ups…" /> : null}
      {!loading && visible.length === 0 ? <div className="mt-4"><EmptyState title={empty} /></div> : (
        <div className="mt-4 space-y-3">
          {visible.map(({ customer, followUp }) => (
            <div key={followUp.id}>
              {tab === 'completed' ? <p className="mb-1 text-sm text-muted">{formatDate(followUp.completedAt?.slice(0, 10) ?? followUp.scheduledDate, today)}</p> : null}
              <FollowUpCard
                customer={customer}
                followUp={followUp}
                today={today}
                onWhatsApp={setWhatsapp}
                onDone={(item) => {
                  void repo.completeFollowUp(item.id, followUp.id).then(() => toast.push('Follow-up marked done')).catch((caught: unknown) => toast.push(humanizeError(caught)))
                }}
                onReschedule={setReschedule}
              />
            </div>
          ))}
        </div>
      )}
      <WhatsAppSheet open={Boolean(whatsapp)} phone={whatsapp?.phoneNormalized ?? ''} businessName={workspace?.organization.name ?? ''} onClose={() => setWhatsapp(null)} />
      <RescheduleSheet
        customer={reschedule}
        onClose={() => setReschedule(null)}
        onSave={async (date, time) => {
          if (!reschedule) return
          try {
            await repo.scheduleFollowUp(reschedule.id, { date, time })
            toast.push('Follow-up rescheduled')
            setReschedule(null)
          } catch (caught) {
            toast.push(humanizeError(caught))
          }
        }}
      />
    </div>
  )
}
