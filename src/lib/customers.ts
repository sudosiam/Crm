import { datePart, monthBounds, todayISO } from './dates'
import { canViewCustomer } from './permissions'
import type {
  Actor,
  Customer,
  CustomerListFilter,
  CustomerQuery,
  DashboardData,
  Page,
  TestRide,
} from './types'

export function followUpBucket(
  customer: Pick<Customer, 'followUpDate' | 'status'>,
  today: string,
): 'today' | 'overdue' | 'upcoming' | 'none' {
  if (!customer.followUpDate) return 'none'
  if (customer.status === 'SOLD' || customer.status === 'LOST') return 'none'
  if (customer.followUpDate === today) return 'today'
  if (customer.followUpDate < today) return 'overdue'
  return 'upcoming'
}

export function matchesSearch(customer: Customer, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  const haystack = [customer.name, customer.phone, customer.phoneNormalized, customer.model ?? '', customer.notes ?? '']
    .join('\n')
    .toLowerCase()
  if (haystack.includes(q)) return true
  if (digits.length >= 3 && customer.phoneNormalized.includes(digits)) return true
  return false
}

export function matchesFilter(
  customer: Customer,
  filter: CustomerListFilter,
  ctx: { userId: string; today: string },
): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'NEW':
    case 'FOLLOW_UP':
    case 'TEST_RIDE':
    case 'SOLD':
    case 'LOST':
      return customer.status === filter
    case 'today':
      return followUpBucket(customer, ctx.today) === 'today'
    case 'overdue':
      return followUpBucket(customer, ctx.today) === 'overdue'
    case 'mine':
      return customer.assignedTo === ctx.userId
    case 'unassigned':
      return customer.assignedTo === null
    default:
      return true
  }
}

function timeKey(time: string | null): string {
  return time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '99:99'
}

export function sortCustomers(customers: Customer[], filter: CustomerListFilter): Customer[] {
  const copy = [...customers]
  if (filter === 'today' || filter === 'overdue') {
    copy.sort((a, b) => {
      const date = (a.followUpDate ?? '').localeCompare(b.followUpDate ?? '')
      if (date !== 0) return date
      return timeKey(a.followUpTime).localeCompare(timeKey(b.followUpTime))
    })
    return copy
  }
  copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return copy
}

export function queryCustomers(
  customers: Customer[],
  actor: Actor,
  query: CustomerQuery,
  today = todayISO(),
): Page<Customer> {
  const filter = query.filter ?? 'all'
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 30))
  const visible = customers.filter((customer) => canViewCustomer(actor, customer))
  const filtered = visible.filter(
    (customer) => matchesFilter(customer, filter, { userId: actor.userId, today }) && matchesSearch(customer, query.search ?? ''),
  )
  const sorted = sortCustomers(filtered, filter)
  const start = (page - 1) * pageSize
  return {
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
  }
}

export function summarizeDashboard(
  customers: Customer[],
  testRides: TestRide[],
  actor: Actor,
  now = new Date(),
): DashboardData {
  const today = todayISO(now)
  const { start, end } = monthBounds(now)
  const visible = customers.filter((customer) => canViewCustomer(actor, customer))
  const visibleIds = new Set(visible.map((customer) => customer.id))
  const followUpsToday = sortCustomers(
    visible.filter((customer) => followUpBucket(customer, today) === 'today'),
    'today',
  )
  const overdue = sortCustomers(
    visible.filter((customer) => followUpBucket(customer, today) === 'overdue'),
    'overdue',
  )
  const rides = testRides
    .filter((ride) => ride.status === 'SCHEDULED' && ride.scheduledDate === today && visibleIds.has(ride.customerId))
    .sort((a, b) => timeKey(a.scheduledTime).localeCompare(timeKey(b.scheduledTime)))
  const inMonth = (iso: string) => {
    const day = datePart(iso)
    return day >= start && day < end
  }
  return {
    followUpsToday,
    overdue,
    testRidesToday: rides,
    counts: {
      followUpsToday: followUpsToday.length,
      overdue: overdue.length,
      newLeadsMonth: visible.filter((customer) => customer.enquiryDate >= start && customer.enquiryDate < end).length,
      testRidesToday: rides.length,
      soldMonth: visible.filter((customer) => customer.status === 'SOLD' && inMonth(customer.statusChangedAt)).length,
      lostMonth: visible.filter((customer) => customer.status === 'LOST' && inMonth(customer.statusChangedAt)).length,
    },
  }
}

export function sanitizeSearchTerm(query: string): string {
  return query.replace(/[^a-zA-Z0-9\u0900-\u097F +.-]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function customersToCsv(customers: Customer[], nameOf: (userId: string | null) => string): string {
  const headers = [
    'Name',
    'Phone',
    'Status',
    'Model',
    'Battery',
    'Budget',
    'Source',
    'Enquiry date',
    'Follow-up date',
    'Follow-up time',
    'Assigned to',
    'Notes',
    'Test ride date',
    'Sale amount',
    'Delivery date',
    'Lost reason',
    'Created at',
  ]
  const lines = customers.map((customer) =>
    [
      customer.name,
      customer.phoneNormalized,
      customer.status,
      customer.model,
      customer.batteryConfiguration,
      customer.budget,
      customer.source,
      customer.enquiryDate,
      customer.followUpDate,
      customer.followUpTime,
      nameOf(customer.assignedTo),
      customer.notes,
      customer.testRideDate,
      customer.saleAmount,
      customer.deliveryDate,
      customer.lostReason,
      customer.createdAt,
    ]
      .map(csvEscape)
      .join(','),
  )
  return [headers.join(','), ...lines].join('\n')
}

export function memberName(members: Array<{ userId: string; fullName: string }>, userId: string | null): string {
  if (!userId) return ''
  return members.find((member) => member.userId === userId)?.fullName ?? ''
}
