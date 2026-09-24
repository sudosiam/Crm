import { useState } from 'react'
import { SelectField } from '../ui/SelectField'
import { STATUS_META } from '../../lib/business'
import { LEAD_SOURCES, LOST_REASONS } from '../../lib/types'
import { addDays, todayISO } from '../../lib/dates'
import type { Customer, CustomerStatus, Member, Product } from '../../lib/types'

export interface CustomerFormValue {
  name: string
  phone: string
  model: string
  battery: string
  status: CustomerStatus
  enquiryDate: string
  budget: string
  source: string
  sourceOther: string
  notes: string
  followUpDate: string
  followUpTime: string
  assignedTo: string
  saleAmount: string
  deliveryDate: string
  lostReason: string
  lostNote: string
  testRideDate: string
  testRideTime: string
  allowDuplicate: boolean
}

export function emptyCustomerForm(userId: string): CustomerFormValue {
  return {
    name: '',
    phone: '',
    model: '',
    battery: '',
    status: 'NEW',
    enquiryDate: todayISO(),
    budget: '',
    source: '',
    sourceOther: '',
    notes: '',
    followUpDate: '',
    followUpTime: '11:00',
    assignedTo: userId,
    saleAmount: '',
    deliveryDate: todayISO(),
    lostReason: '',
    lostNote: '',
    testRideDate: todayISO(),
    testRideTime: '15:00',
    allowDuplicate: false,
  }
}

export function customerToForm(customer: Customer): CustomerFormValue {
  const knownSource = LEAD_SOURCES.includes(customer.source as (typeof LEAD_SOURCES)[number])
  return {
    ...emptyCustomerForm(customer.assignedTo ?? ''),
    name: customer.name,
    phone: customer.phoneNormalized,
    model: customer.model ?? '',
    battery: customer.batteryConfiguration ?? '',
    status: customer.status,
    enquiryDate: customer.enquiryDate,
    budget: customer.budget ?? '',
    source: customer.source ? (knownSource ? customer.source : 'Other') : '',
    sourceOther: customer.source && !knownSource ? customer.source : '',
    notes: customer.notes ?? '',
    followUpDate: customer.followUpDate ?? '',
    followUpTime: customer.followUpTime ?? '11:00',
    assignedTo: customer.assignedTo ?? '',
    saleAmount: customer.saleAmount === null ? '' : String(customer.saleAmount),
    deliveryDate: customer.deliveryDate ?? todayISO(),
    lostReason: customer.lostReason ?? '',
    testRideDate: customer.testRideDate ?? todayISO(),
    testRideTime: customer.testRideTime ?? '15:00',
  }
}

export function CustomerForm({
  value,
  products,
  members,
  submitting,
  submitLabel,
  onChange,
  onSubmit,
}: {
  value: CustomerFormValue
  products: Product[]
  members: Member[]
  submitting: boolean
  submitLabel: string
  onChange: (value: CustomerFormValue) => void
  onSubmit: () => void
}) {
  const [more, setMore] = useState(false)
  const today = todayISO()
  const models = products.filter((product) => product.kind === 'model' && product.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const batteries = products.filter((product) => product.kind === 'battery' && product.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const dates = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'In 3 days', value: addDays(today, 3) },
    { label: 'Next week', value: addDays(today, 7) },
  ]
  const set = (patch: Partial<CustomerFormValue>) => onChange({ ...value, ...patch })
  const showFollowUp = value.status === 'NEW' || value.status === 'FOLLOW_UP'
  const showRide = value.status === 'TEST_RIDE'
  const showSale = value.status === 'SOLD'
  const showLost = value.status === 'LOST'

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Name</span>
        <input className="field" value={value.name} onChange={(event) => set({ name: event.target.value })} autoComplete="name" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Phone</span>
        <input className="field" value={value.phone} onChange={(event) => set({ phone: event.target.value })} inputMode="tel" autoComplete="tel" required />
      </label>
      <SelectField
        label="Model"
        value={value.model}
        emptyLabel="Not set"
        options={models.map((product) => ({ value: product.name, label: product.name }))}
        onChange={(model) => set({ model })}
      />
      <SelectField
        label="Battery"
        value={value.battery}
        emptyLabel="Not set"
        options={batteries.map((product) => ({ value: product.name, label: product.name }))}
        onChange={(battery) => set({ battery })}
      />
      <SelectField
        label="Status"
        value={value.status}
        options={(Object.keys(STATUS_META) as CustomerStatus[]).map((status) => ({
          value: status,
          label: `${STATUS_META[status].emoji} ${STATUS_META[status].label}`,
        }))}
        onChange={(status) => {
          const next = status as CustomerStatus
          set({ status: next === 'NEW' && value.followUpDate ? 'FOLLOW_UP' : next })
        }}
      />
      {showFollowUp ? (
        <DateBlock
          label="Follow-up"
          date={value.followUpDate}
          time={value.followUpTime}
          dates={dates}
          onDate={(followUpDate) => set({ followUpDate, status: followUpDate && value.status === 'NEW' ? 'FOLLOW_UP' : value.status })}
          onTime={(followUpTime) => set({ followUpTime })}
        />
      ) : null}
      {showRide ? (
        <DateBlock
          label="Test ride"
          date={value.testRideDate}
          time={value.testRideTime}
          dates={dates}
          onDate={(testRideDate) => set({ testRideDate })}
          onTime={(testRideTime) => set({ testRideTime })}
        />
      ) : null}
      {showSale ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Sale amount (optional)</span>
            <input className="field" inputMode="decimal" value={value.saleAmount} onChange={(event) => set({ saleAmount: event.target.value })} placeholder="Leave blank if not noted" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Delivery date (optional)</span>
            <input className="field" type="date" value={value.deliveryDate} onChange={(event) => set({ deliveryDate: event.target.value })} />
          </label>
        </div>
      ) : null}
      {showLost ? (
        <div className="space-y-3">
          <SelectField
            label="Lost reason"
            value={value.lostReason}
            emptyLabel="Choose a reason"
            options={LOST_REASONS.map((reason) => ({ value: reason, label: reason }))}
            onChange={(lostReason) => set({ lostReason })}
          />
          {value.lostReason === 'Other' ? (
            <input className="field" value={value.lostNote} onChange={(event) => set({ lostNote: event.target.value })} placeholder="Short reason" aria-label="Other lost reason" />
          ) : null}
        </div>
      ) : null}
      <button type="button" className="text-sm font-semibold text-brand" onClick={() => setMore((open) => !open)} aria-expanded={more}>
        {more ? 'Hide extra details' : 'Source, budget, notes'}
      </button>
      {more ? (
        <div className="space-y-4">
          <SelectField
            label="Source"
            value={value.source}
            emptyLabel="Not set"
            options={LEAD_SOURCES.map((source) => ({ value: source, label: source }))}
            onChange={(source) => set({ source })}
          />
          {value.source === 'Other' ? (
            <input className="field" value={value.sourceOther} onChange={(event) => set({ sourceOther: event.target.value })} placeholder="Where did they hear about BPH?" />
          ) : null}
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Budget (optional)</span>
            <input className="field" value={value.budget} onChange={(event) => set({ budget: event.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Notes</span>
            <textarea className="field min-h-24" value={value.notes} onChange={(event) => set({ notes: event.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Enquiry date</span>
            <input className="field" type="date" value={value.enquiryDate} onChange={(event) => set({ enquiryDate: event.target.value })} />
          </label>
          <SelectField
            label="Assigned salesperson"
            value={value.assignedTo}
            emptyLabel="Unassigned"
            options={members.map((member) => ({ value: member.userId, label: member.fullName }))}
            onChange={(assignedTo) => set({ assignedTo })}
          />
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary sticky bottom-3 z-10 w-full" disabled={submitting}>
        {submitting ? 'Saving customer…' : submitLabel}
      </button>
    </form>
  )
}

function DateBlock({
  label,
  date,
  time,
  dates,
  onDate,
  onTime,
}: {
  label: string
  date: string
  time: string
  dates: Array<{ label: string; value: string }>
  onDate: (value: string) => void
  onTime: (value: string) => void
}) {
  const preset = dates.find((item) => item.value === date)?.value ?? (date ? 'custom' : '')
  return (
    <div className="space-y-3">
      <SelectField
        label={label}
        value={preset}
        emptyLabel="No date"
        options={[...dates.map((item) => ({ value: item.value, label: item.label })), { value: 'custom', label: 'Choose a date' }]}
        onChange={(next) => {
          if (next === 'custom') return
          onDate(next)
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <input className="field" type="date" value={date} onChange={(event) => onDate(event.target.value)} aria-label={`${label} date`} />
        <input className="field" type="time" value={time} onChange={(event) => onTime(event.target.value)} aria-label={`${label} time`} />
      </div>
    </div>
  )
}
