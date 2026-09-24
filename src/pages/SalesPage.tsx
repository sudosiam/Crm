import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
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
      <h1 className="font-display text-4xl">Sales</h1>
      <p className="mt-1 text-muted">This month. No accounts, just who bought and who did not.</p>
      <div className="mt-4 flex gap-2">
        <button type="button" className="chip" aria-pressed={tab === 'sold'} onClick={() => setParams({})}>Sold</button>
        <button type="button" className="chip" aria-pressed={tab === 'lost'} onClick={() => setParams({ tab: 'lost' })}>Lost</button>
      </div>
      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState title={tab === 'sold' ? 'No sales this month.' : 'No lost customers this month.'} /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((customer) => (
            <Link key={customer.id} to={`/customers/${customer.id}`} className="card block p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{customer.name}</p>
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
