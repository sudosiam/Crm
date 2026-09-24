import { useEffect, useState } from 'react'
import { CustomerCard } from '../components/customers/CustomerCard'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FilterChips } from '../components/ui/FilterChips'
import { LoadingState } from '../components/ui/LoadingState'
import { SearchBar } from '../components/ui/SearchBar'
import { useApp } from '../context/AppContext'
import { todayISO } from '../lib/dates'
import { humanizeError } from '../lib/errors'
import type { Customer, CustomerListFilter } from '../lib/types'

export function CustomersPage() {
  const { repo, workspace } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CustomerListFilter>('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const today = todayISO()

  useEffect(() => {
    let gone = false
    setLoading(true)
    void repo
      .listCustomers({ search, filter, page: 1, pageSize: page * 30 })
      .then((result) => {
        if (gone) return
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((caught: unknown) => {
        if (!gone) setError(humanizeError(caught))
      })
      .finally(() => {
        if (!gone) setLoading(false)
      })
    return () => {
      gone = true
    }
  }, [repo, search, filter, page, workspace?.customers.length, workspace?.organization.updatedAt])

  const nameOf = (id: string | null) => workspace?.members.find((member) => member.userId === id)?.fullName

  return (
    <div>
      <h1 className="font-display text-4xl">Customers</h1>
      <p className="mt-1 text-sm text-muted">{total} {total === 1 ? 'customer' : 'customers'}</p>
      <div className="mt-4 space-y-3">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1) }} />
        <FilterChips value={filter} onChange={(value) => { setFilter(value); setPage(1) }} />
      </div>
      {loading ? <LoadingState label="Loading customers…" /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={search ? `No customers match “${search}”.` : 'No customers yet.'} body={search ? undefined : 'Add the first enquiry.'} />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              today={today}
              assignee={customer.assignedTo ? nameOf(customer.assignedTo) : 'Unassigned'}
            />
          ))}
        </div>
      )}
      {page * 30 < total ? (
        <button type="button" className="btn btn-secondary mt-4 w-full" onClick={() => setPage((current) => current + 1)}>
          Load more
        </button>
      ) : null}
    </div>
  )
}
