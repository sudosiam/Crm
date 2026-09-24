import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { SelectField } from '../components/ui/SelectField'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useApp } from '../context/AppContext'
import { formatDate, monthBounds, todayISO } from '../lib/dates'
import { formatPhone } from '../lib/phone'
import type { Customer } from '../lib/types'

export function SalesPage() {
  const { repo, workspace } = useApp()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'lost' ? 'lost' : 'sold'
  const [customers, setCustomers] = useState<Customer[]>([])
  const today = todayISO()
  const { start, end } = monthBounds()

  useEffect(() => {
    setCustomers(repo.snapshot()?.customers ?? [])
  }, [repo, workspace?.customers.length, workspace?.organization.updatedAt])

  const rows = customers.filter((customer) => {
    const when = customer.statusChangedAt.slice(0, 10)
    const inMonth = when >= start && when < end
    return tab === 'sold' ? customer.status === 'SOLD' && inMonth : customer.status === 'LOST' && inMonth
  })

  return (
    <div>
      <h1 className="page-title">Sales</h1>
      <p className="mt-1 text-muted">This month. No accounts, just who bought and who did not.</p>
      <div className="mt-3">
        <SelectField
          label="Show"
          value={tab}
          options={[
            { value: 'sold', label: 'Sold this month' },
            { value: 'lost', label: 'Lost this month' },
          ]}
          onChange={(next) => setParams(next === 'lost' ? { tab: 'lost' } : {})}
        />
      </div>
      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState title={tab === 'sold' ? 'No sales this month.' : 'No lost customers this month.'} /></div>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="card block px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{customer.name}</p>
                  <p className="tabular-nums">{formatPhone(customer.phoneNormalized)}</p>
                </div>
                <StatusBadge status={customer.status} />
              </div>
              <p className="mt-2 text-muted">{[customer.model, customer.batteryConfiguration].filter(Boolean).join(' · ')}</p>
              <p className="mt-1 text-sm">
                {tab === 'sold'
                  ? `Delivery ${customer.deliveryDate ? formatDate(customer.deliveryDate, today) : 'not set'}${customer.saleAmount === null ? '' : ` · ${customer.saleAmount}`}`
                  : customer.lostReason}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
