import { MessageCircle, Phone, Star, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RescheduleSheet } from '../components/followups/RescheduleSheet'
import { WhatsAppSheet } from '../components/whatsapp/WhatsAppSheet'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { SelectField } from '../components/ui/SelectField'
import { Sheet } from '../components/ui/Sheet'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { messageTemplates } from '../lib/business'
import { LOST_REASONS } from '../lib/types'
import { formatDate, formatWhen, todayISO } from '../lib/dates'
import { humanizeError } from '../lib/errors'
import { formatPhone, telUrl, whatsAppUrl } from '../lib/phone'
import type { CustomerBundle, CustomerStatus } from '../lib/types'

export function CustomerDetailPage() {
  const { id = '' } = useParams()
  const { repo, workspace, actor } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<CustomerBundle | null>(null)
  const [error, setError] = useState('')
  const [whatsapp, setWhatsapp] = useState<string | null>(null)
  const [sheet, setSheet] = useState<'status' | 'lost' | 'sale' | 'ride' | null>(null)
  const [reschedule, setReschedule] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lostReason, setLostReason] = useState('Price')
  const [saleAmount, setSaleAmount] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(todayISO())
  const [rideDate, setRideDate] = useState(todayISO())
  const [rideTime, setRideTime] = useState('15:00')
  const today = todayISO()

  async function load() {
    try {
      setBundle(await repo.getCustomer(id))
      setError('')
    } catch (caught) {
      setError(humanizeError(caught))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, workspace?.organization.updatedAt, workspace?.customers.length])

  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  if (!bundle || !workspace) return <LoadingState label="Loading customer…" />
  const { customer } = bundle
  const assignee = workspace.members.find((member) => member.userId === customer.assignedTo)?.fullName ?? 'Unassigned'
  const call = telUrl(customer.phone)
  const reviewUrl = workspace.organization.googleReviewUrl
  const reviewMessage = messageTemplates(workspace.organization.name).find((item) => item.id === 'review')?.body ?? ''
  const referral = whatsAppUrl(customer.phone, messageTemplates(workspace.organization.name).find((item) => item.id === 'referral')?.body ?? '')

  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
      toast.push(repo.isOffline() || repo.pendingCount() > 0 ? 'Saved on this phone. It will sync when you are back online.' : message)
      setSheet(null)
      await load()
    } catch (caught) {
      toast.push(humanizeError(caught))
    }
  }

  return (
    <div>
      <Link to="/customers" className="text-sm font-semibold text-brand">All customers</Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title break-words">{customer.name}</h1>
          <p className="mt-1 tabular-nums">{formatPhone(customer.phoneNormalized)}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>
      <p className="mt-2 text-muted">{[customer.model, customer.batteryConfiguration].filter(Boolean).join(' · ') || 'Model not set'}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {call ? <a className="btn btn-primary" href={call}><Phone className="size-4" aria-hidden="true" /> Call</a> : null}
        <button type="button" className="btn btn-secondary" onClick={() => setWhatsapp('follow-up')}><MessageCircle className="size-4" aria-hidden="true" /> WhatsApp</button>
      </div>
      <section className="card mt-3 p-3">
        <h2 className="font-semibold">Follow-up</h2>
        <p className="mt-1">{formatWhen(customer.followUpDate, customer.followUpTime, today)}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={!customer.followUpDate} onClick={() => void run(() => repo.completeFollowUp(customer.id), 'Follow-up marked done')}>Done</button>
          <button type="button" className="btn btn-ghost flex-1" onClick={() => setReschedule(true)}>Set follow-up</button>
        </div>
      </section>
      <section className="card mt-2 space-y-1.5 p-3 text-sm">
        <Row label="Source" value={customer.source} />
        <Row label="Budget" value={customer.budget} />
        <Row label="Enquiry" value={formatDate(customer.enquiryDate, today)} />
        <Row label="Assigned" value={assignee} />
        <Row label="Test ride" value={customer.testRideDate ? formatWhen(customer.testRideDate, customer.testRideTime, today) : null} />
        <Row label="Sale amount" value={customer.saleAmount === null ? null : String(customer.saleAmount)} />
        <Row label="Delivery" value={customer.deliveryDate ? formatDate(customer.deliveryDate, today) : null} />
        <Row label="Lost reason" value={customer.lostReason} />
        <div>
          <p className="text-muted">Notes</p>
          <p className="whitespace-pre-wrap">{customer.notes || 'No notes'}</p>
        </div>
      </section>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link className="btn btn-ghost" to={`/customers/${customer.id}/edit`}>Edit</Link>
        <button type="button" className="btn btn-ghost" onClick={() => setSheet('status')}>Change status</button>
        <button type="button" className="btn btn-secondary" onClick={() => setSheet('ride')}>Test ride</button>
        <button type="button" className="btn btn-secondary" onClick={() => setSheet('sale')}>Mark sold</button>
      </div>
      {customer.status === 'SOLD' ? (
        <div className="mt-4 space-y-2">
          {reviewUrl ? (
            <a className="btn btn-primary w-full" href={reviewUrl} target="_blank" rel="noopener noreferrer">
              <Star className="size-4" aria-hidden="true" /> Ask for review
            </a>
          ) : (
            <Link className="btn btn-ghost w-full" to="/settings">Add the Google review link in Settings</Link>
          )}
          <button type="button" className="btn btn-secondary w-full" onClick={() => setWhatsapp('review')}>WhatsApp review message</button>
          {referral ? (
            <a className="btn btn-secondary w-full" href={referral} target="_blank" rel="noopener noreferrer">
              <Users className="size-4" aria-hidden="true" /> Ask for referral
            </a>
          ) : null}
          <p className="text-xs text-muted">The review request asks for an honest review. It is not sent until you send it in WhatsApp.</p>
          <p className="sr-only">{reviewMessage}</p>
        </div>
      ) : (
        <button type="button" className="btn btn-danger mt-4 w-full" onClick={() => setSheet('lost')}>Mark lost</button>
      )}
      {actor?.role === 'OWNER' ? (
        <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => setConfirmDelete(true)}>Delete customer</button>
      ) : null}
      <section className="mt-6">
        <h2 className="section-title">History</h2>
        {bundle.activities.length === 0 ? <p className="mt-2 text-muted">No history yet.</p> : (
          <ol className="mt-3 space-y-3">
            {bundle.activities.map((activity) => (
              <li key={activity.id} className="border-l-2 border-line pl-3">
                <p className="text-sm text-muted">{formatDate(activity.createdAt.slice(0, 10), today)}</p>
                <p>{activity.description}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <WhatsAppSheet
        open={Boolean(whatsapp)}
        phone={customer.phoneNormalized}
        businessName={workspace.organization.name}
        initialTemplate={whatsapp ?? 'follow-up'}
        reviewUrl={reviewUrl}
        onClose={() => setWhatsapp(null)}
      />
      <RescheduleSheet
        customer={reschedule ? customer : null}
        onClose={() => setReschedule(false)}
        onSave={async (date, time) => {
          await run(() => repo.scheduleFollowUp(customer.id, { date, time }), 'Follow-up scheduled')
          setReschedule(false)
        }}
      />
      <Sheet open={sheet === 'status'} title="Change status" onClose={() => setSheet(null)}>
        <SelectField
          label="Status"
          value={customer.status}
          options={[
            { value: 'NEW', label: 'New' },
            { value: 'FOLLOW_UP', label: 'Follow-up' },
            { value: 'TEST_RIDE', label: 'Test ride' },
            ...(customer.status === 'SOLD' ? [{ value: 'SOLD', label: 'Sold / Delivered' }] : []),
            ...(customer.status === 'LOST' ? [{ value: 'LOST', label: 'Lost' }] : []),
          ]}
          onChange={(status) => {
            if (status === customer.status || status === 'SOLD' || status === 'LOST') return
            void run(() => repo.updateCustomer(customer.id, { status: status as CustomerStatus }).then(() => undefined), 'Status updated')
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'lost'} title="Mark lost" onClose={() => setSheet(null)}>
        <SelectField
          label="Reason"
          value={lostReason}
          options={LOST_REASONS.map((reason) => ({ value: reason, label: reason }))}
          onChange={setLostReason}
        />
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => void run(() => repo.markLost(customer.id, lostReason), 'Marked lost')}>Save</button>
      </Sheet>
      <Sheet open={sheet === 'sale'} title="Mark sold" onClose={() => setSheet(null)}>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Sale amount (optional)</span>
          <input className="field" inputMode="decimal" value={saleAmount} onChange={(event) => setSaleAmount(event.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-semibold">Delivery date (optional)</span>
          <input className="field" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          onClick={() => void run(() => repo.recordSale(customer.id, {
            model: customer.model,
            batteryConfiguration: customer.batteryConfiguration,
            saleAmount: saleAmount.trim() ? Number(saleAmount) : null,
            deliveryDate: deliveryDate || null,
          }), 'Marked sold')}
        >
          Save sale
        </button>
      </Sheet>
      <Sheet open={sheet === 'ride'} title="Test ride" onClose={() => setSheet(null)}>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="date" value={rideDate} onChange={(event) => setRideDate(event.target.value)} aria-label="Test ride date" />
          <input className="field" type="time" value={rideTime} onChange={(event) => setRideTime(event.target.value)} aria-label="Test ride time" />
        </div>
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => void run(() => repo.scheduleTestRide(customer.id, { date: rideDate, time: rideTime, model: customer.model }), 'Test ride scheduled')}>
          Schedule test ride
        </button>
      </Sheet>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this customer?"
        body="This removes the customer and their follow-ups from BPH."
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmDelete(false)
          void repo.deleteCustomer(customer.id).then(() => navigate('/customers')).catch((caught: unknown) => toast.push(humanizeError(caught)))
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
