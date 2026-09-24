import { useState } from 'react'
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

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" className="chip" aria-pressed={value === ''} onClick={() => onChange('')}>None</button>
        {options.map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={value === option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  )
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
      <ChipRow label="Model" options={models.map((product) => product.name)} value={value.model} onChange={(model) => set({ model })} />
      <ChipRow label="Battery" options={batteries.map((product) => product.name)} value={value.battery} onChange={(battery) => set({ battery })} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Status</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_META) as CustomerStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className="chip"
              aria-pressed={value.status === status}
              onClick={() => set({ status: status === 'NEW' && value.followUpDate ? 'FOLLOW_UP' : status })}
            >
              {STATUS_META[status].emoji} {STATUS_META[status].label}
            </button>
          ))}
        </div>
      </fieldset>
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
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Lost reason</legend>
          <div className="flex flex-wrap gap-2">
            {LOST_REASONS.map((reason) => (
              <button key={reason} type="button" className="chip" aria-pressed={value.lostReason === reason} onClick={() => set({ lostReason: reason })}>
                {reason}
              </button>
            ))}
          </div>
          {value.lostReason === 'Other' ? (
            <input className="field mt-3" value={value.lostNote} onChange={(event) => set({ lostNote: event.target.value })} placeholder="Short reason" />
          ) : null}
        </fieldset>
      ) : null}
      <button type="button" className="text-sm font-semibold text-brand" onClick={() => setMore((open) => !open)} aria-expanded={more}>
        {more ? 'Hide extra details' : 'Source, budget, notes'}
      </button>
      {more ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Source</span>
            <select className="field" value={value.source} onChange={(event) => set({ source: event.target.value })}>
              <option value="">Not set</option>
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </label>
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
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Assigned salesperson</span>
            <select className="field" value={value.assignedTo} onChange={(event) => set({ assignedTo: event.target.value })}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>{member.fullName}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
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
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="mb-2 flex gap-2 overflow-x-auto">
        <button type="button" className="chip" aria-pressed={date === ''} onClick={() => onDate('')}>No date</button>
        {dates.map((item) => (
          <button key={item.label} type="button" className="chip" aria-pressed={date === item.value} onClick={() => onDate(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="field" type="date" value={date} onChange={(event) => onDate(event.target.value)} aria-label={`${label} date`} />
        <input className="field" type="time" value={time} onChange={(event) => onTime(event.target.value)} aria-label={`${label} time`} />
      </div>
    </fieldset>
  )
}
