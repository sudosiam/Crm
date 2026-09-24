import { useEffect, useState } from 'react'
import { addDays, todayISO } from '../../lib/dates'
import type { Customer } from '../../lib/types'
import { SelectField } from '../ui/SelectField'
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
      <div className="mb-3">
        <SelectField
          label="When"
          value={dates.some((item) => item.value === date) ? date : 'custom'}
          options={[
            ...dates.map((item) => ({ value: item.value, label: item.label })),
            ...(dates.some((item) => item.value === date) ? [] : [{ value: 'custom', label: 'Custom date' }]),
          ]}
          onChange={(next) => {
            if (next !== 'custom') setDate(next)
          }}
        />
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
