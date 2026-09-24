import type { CustomerListFilter } from '../../lib/types'
import { SelectField } from './SelectField'

const FILTERS: Array<{ value: CustomerListFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'NEW', label: 'New' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'TEST_RIDE', label: 'Test ride' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'LOST', label: 'Lost' },
  { value: 'today', label: 'Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'mine', label: 'My leads' },
  { value: 'unassigned', label: 'Unassigned' },
]

export function FilterChips({ value, onChange }: { value: CustomerListFilter; onChange: (value: CustomerListFilter) => void }) {
  return (
    <SelectField
      label="Show"
      value={value}
      options={FILTERS}
      onChange={(next) => onChange(next as CustomerListFilter)}
    />
  )
}
