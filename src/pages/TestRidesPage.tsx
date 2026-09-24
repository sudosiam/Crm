import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { formatWhen, todayISO } from '../lib/dates'
import { humanizeError } from '../lib/errors'
import type { Customer, TestRide } from '../lib/types'

export function TestRidesPage() {
  const { repo, workspace } = useApp()
  const toast = useToast()
  const [rides, setRides] = useState<TestRide[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const today = todayISO()

  useEffect(() => {
    const snapshot = repo.snapshot()
    setRides(snapshot?.testRides ?? [])
    setCustomers(snapshot?.customers ?? [])
    setLoading(false)
  }, [repo, workspace?.customers.length, workspace?.organization.updatedAt])

  const name = (id: string) => customers.find((customer) => customer.id === id)?.name ?? 'Customer'
  const todayRides = rides.filter((ride) => ride.status === 'SCHEDULED' && ride.scheduledDate === today)
  const upcoming = rides.filter((ride) => ride.status === 'SCHEDULED' && ride.scheduledDate > today)
  const past = rides.filter((ride) => ride.status !== 'SCHEDULED' || ride.scheduledDate < today)

  async function update(id: string, status: 'COMPLETED' | 'CANCELLED') {
    try {
      await repo.setTestRideStatus(id, status)
      toast.push(status === 'COMPLETED' ? 'Test ride completed' : 'Test ride cancelled')
      setRides(repo.snapshot()?.testRides ?? [])
    } catch (caught) {
      toast.push(humanizeError(caught))
    }
  }

  if (loading) return <LoadingState label="Loading test rides…" />
  return (
    <div>
      <h1 className="page-title">Test rides</h1>
      <Section title="Today" empty="No test rides scheduled." rides={todayRides} name={name} today={today} onUpdate={update} />
      <Section title="Upcoming" empty="No upcoming test rides." rides={upcoming} name={name} today={today} onUpdate={update} />
      <Section title="Earlier" empty="No earlier test rides." rides={past} name={name} today={today} />
    </div>
  )
}

function Section({
  title,
  empty,
  rides,
  name,
  today,
  onUpdate,
}: {
  title: string
  empty: string
  rides: TestRide[]
  name: (id: string) => string
  today: string
  onUpdate?: (id: string, status: 'COMPLETED' | 'CANCELLED') => void
}) {
  return (
    <section className="mt-6">
      <h2 className="section-title">{title}</h2>
      {rides.length === 0 ? <div className="mt-3"><EmptyState title={empty} /></div> : (
        <div className="mt-3 space-y-3">
          {rides.map((ride) => (
            <article key={ride.id} className="card p-3.5">
              <Link to={`/customers/${ride.customerId}`} className="font-semibold">{name(ride.customerId)}</Link>
              <p className="text-muted">{ride.model || 'Model not set'}</p>
              <p className="mt-1 font-semibold">{formatWhen(ride.scheduledDate, ride.scheduledTime, today)} · {ride.status === 'SCHEDULED' ? 'Scheduled' : ride.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}</p>
              {ride.notes ? <p className="mt-1 text-sm">{ride.notes}</p> : null}
              {onUpdate && ride.status === 'SCHEDULED' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => onUpdate(ride.id, 'COMPLETED')}>Completed</button>
                  <button type="button" className="btn btn-ghost" onClick={() => onUpdate(ride.id, 'CANCELLED')}>Cancel</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
