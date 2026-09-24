import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CustomerCard } from '../components/customers/CustomerCard'
import { MetricCard, SectionTitle } from '../components/dashboard/MetricCard'
import { RescheduleSheet } from '../components/followups/RescheduleSheet'
import { WhatsAppSheet } from '../components/whatsapp/WhatsAppSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { formatWhen, greeting, todayISO } from '../lib/dates'
import { humanizeError } from '../lib/errors'
import { maybeNotify } from '../lib/notifications'
import type { Customer, DashboardData } from '../lib/types'

export function DashboardPage() {
  const { repo, workspace, actor, user } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [whatsapp, setWhatsapp] = useState<Customer | null>(null)
  const [reschedule, setReschedule] = useState<Customer | null>(null)
  const today = todayISO()

  async function load() {
    setLoading(true)
    setError('')
    try {
      const next = await repo.dashboard()
      setData(next)
      const me = workspace?.members.find((member) => member.userId === actor?.userId)
      void maybeNotify(next.counts.overdue, next.counts.followUpsToday, me?.notifyFollowups !== false)
    } catch (caught) {
      setError(humanizeError(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace])

  async function done(customer: Customer) {
    const previous = { date: customer.followUpDate, time: customer.followUpTime }
    try {
      await repo.completeFollowUp(customer.id)
      toast.push('Follow-up marked done', {
        label: 'Undo',
        onClick: () => {
          if (previous.date) void repo.scheduleFollowUp(customer.id, { date: previous.date, time: previous.time })
        },
      })
      await load()
    } catch (caught) {
      toast.push(humanizeError(caught))
    }
  }

  const name = actor?.fullName || user?.fullName || ''
  return (
    <div>
      <p className="text-sm font-semibold text-brand">{greeting()}</p>
      <h1 className="font-display text-4xl">{name ? name.split(' ')[0] : 'Today'}</h1>
      <p className="mt-1 text-muted">What needs a call or a visit.</p>
      {loading && !data ? <LoadingState label="Loading today's work…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {data ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard label="Follow-ups today" value={data.counts.followUpsToday} onClick={() => navigate('/follow-ups?tab=today')} />
            <MetricCard label="Overdue" value={data.counts.overdue} tone="warning" onClick={() => navigate('/follow-ups?tab=overdue')} />
            <MetricCard label="Test rides today" value={data.counts.testRidesToday} onClick={() => navigate('/test-rides')} />
            <MetricCard label="New leads this month" value={data.counts.newLeadsMonth} onClick={() => navigate('/customers')} />
            <MetricCard label="Sold this month" value={data.counts.soldMonth} onClick={() => navigate('/sales')} />
            <MetricCard label="Lost this month" value={data.counts.lostMonth} onClick={() => navigate('/sales?tab=lost')} />
          </div>
          <div className="mt-8">
            <SectionTitle>Overdue</SectionTitle>
            {data.overdue.length === 0 ? <EmptyState title="No overdue follow-ups." /> : (
              <div className="space-y-3">
                {data.overdue.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} today={today} showActions onWhatsApp={setWhatsapp} onDone={(item) => void done(item)} onReschedule={setReschedule} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-8">
            <SectionTitle>Follow up today</SectionTitle>
            {data.followUpsToday.length === 0 ? <EmptyState title="No follow-ups today 🎉" /> : (
              <div className="space-y-3">
                {data.followUpsToday.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} today={today} showActions onWhatsApp={setWhatsapp} onDone={(item) => void done(item)} onReschedule={setReschedule} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-8">
            <SectionTitle>Test rides today</SectionTitle>
            {data.testRidesToday.length === 0 ? <EmptyState title="No test rides scheduled." /> : (
              <div className="space-y-3">
                {data.testRidesToday.map((ride) => {
                  const person = workspace?.customers.find((item) => item.id === ride.customerId)
                  return (
                    <Link key={ride.id} to={`/customers/${ride.customerId}`} className="card block p-4">
                      <p className="text-lg font-semibold">{person?.name ?? 'Customer'}</p>
                      <p className="text-muted">{ride.model || person?.model || 'Model not set'}</p>
                      <p className="mt-1 font-semibold">{formatWhen(ride.scheduledDate, ride.scheduledTime, today)}</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
      <WhatsAppSheet
        open={Boolean(whatsapp)}
        phone={whatsapp?.phoneNormalized ?? ''}
        businessName={workspace?.organization.name ?? ''}
        onClose={() => setWhatsapp(null)}
      />
      <RescheduleSheet
        customer={reschedule}
        onClose={() => setReschedule(null)}
        onSave={async (date, time) => {
          if (!reschedule) return
          try {
            await repo.scheduleFollowUp(reschedule.id, { date, time })
            toast.push('Follow-up rescheduled')
            setReschedule(null)
            await load()
          } catch (caught) {
            toast.push(humanizeError(caught))
          }
        }}
      />
    </div>
  )
}
