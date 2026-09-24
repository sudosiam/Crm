import { useEffect, useState } from 'react'
import { addDays, todayISO } from '../../lib/dates'
import type { Customer } from '../../lib/types'
import { Sheet } from '../ui/Sheet'

export function RescheduleSheet({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null
  onClose: () => void
  onSave: (date: string, time: string) => Promise<void>
}) {
  const today = todayISO()
  const [date, setDate] = useState(customer?.followUpDate || addDays(today, 1))
  const [time, setTime] = useState(customer?.followUpTime || '11:00')
  useEffect(() => {
    if (!customer) return
    setDate(customer.followUpDate || addDays(todayISO(), 1))
    setTime(customer.followUpTime || '11:00')
  }, [customer])
  const [busy, setBusy] = useState(false)
  const dates = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'In 3 days', value: addDays(today, 3) },
  ]
  return (
    <Sheet open={Boolean(customer)} title="Reschedule" onClose={onClose}>
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {dates.map((item) => (
          <button key={item.label} type="button" className="chip" aria-pressed={date === item.value} onClick={() => setDate(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Follow-up date" />
        <input className="field" type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Follow-up time" />
      </div>
      <button
        type="button"
        className="btn btn-primary mt-4 w-full"
        disabled={busy || !date}
        onClick={() => {
          setBusy(true)
          void onSave(date, time).finally(() => setBusy(false))
        }}
      >
        {busy ? 'Saving…' : 'Save follow-up'}
      </button>
    </Sheet>
  )
}
