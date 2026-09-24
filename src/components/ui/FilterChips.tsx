import type { CustomerListFilter } from '../../lib/types'

const FILTERS: Array<{ id: CustomerListFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'FOLLOW_UP', label: 'Follow-up' },
  { id: 'TEST_RIDE', label: 'Test Ride' },
  { id: 'SOLD', label: 'Sold' },
  { id: 'LOST', label: 'Lost' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'mine', label: 'My leads' },
  { id: 'unassigned', label: 'Unassigned' },
]

export function FilterChips({ value, onChange }: { value: CustomerListFilter; onChange: (value: CustomerListFilter) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="toolbar" aria-label="Filter customers">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className="chip"
          aria-pressed={value === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
