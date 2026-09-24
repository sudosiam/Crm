import { describe, expect, it } from 'vitest'
import { buildDemoState } from './data/demoData'
import { todayISO } from './dates'
import { matchesSearch, queryCustomers, summarizeDashboard } from './customers'
import type { Actor } from './types'

describe('search, filters, and dashboard', () => {
  const now = new Date(2026, 8, 24, 8, 0, 0)
  const today = todayISO(now)
  const demo = buildDemoState(now)
  const owner = demo.workspace.members[0]
  const staff = demo.workspace.members[1]
  const ownerActor: Actor = { userId: owner.userId, role: 'OWNER', canViewAll: true, fullName: owner.fullName }
  const staffActor: Actor = { userId: staff.userId, role: 'STAFF', canViewAll: false, fullName: staff.fullName }

  it('finds customers by name, phone, model, and notes', () => {
    const rahul = demo.workspace.customers[0]
    expect(matchesSearch(rahul, 'rahul')).toBe(true)
    expect(matchesSearch(rahul, '98765 43210')).toBe(true)
    expect(matchesSearch(rahul, 'zoom')).toBe(true)
    expect(matchesSearch(rahul, 'after lunch')).toBe(true)
    expect(matchesSearch(rahul, 'activa')).toBe(false)
  })

  it('filters by status, today, overdue, mine, and unassigned', () => {
    expect(queryCustomers(demo.workspace.customers, ownerActor, { filter: 'SOLD' }).total).toBe(1)
    expect(queryCustomers(demo.workspace.customers, ownerActor, { filter: 'today' }, today).total).toBe(2)
    expect(queryCustomers(demo.workspace.customers, ownerActor, { filter: 'overdue' }, today).total).toBe(1)
    expect(queryCustomers(demo.workspace.customers, staffActor, { filter: 'mine' }).items.every((customer) => customer.assignedTo === staff.userId)).toBe(true)
    expect(queryCustomers(demo.workspace.customers, ownerActor, { filter: 'unassigned' }).total).toBe(1)
  })

  it('hides other people\'s leads from staff and counts the owner dashboard', () => {
    const staffPage = queryCustomers(demo.workspace.customers, staffActor, { filter: 'all' })
    expect(staffPage.items.some((customer) => customer.name === 'Rahul Das')).toBe(false)
    const dashboard = summarizeDashboard(demo.workspace.customers, demo.workspace.testRides, ownerActor, now)
    expect(dashboard.counts.followUpsToday).toBe(2)
    expect(dashboard.counts.overdue).toBe(1)
    expect(dashboard.counts.testRidesToday).toBe(1)
    expect(dashboard.counts.soldMonth).toBe(1)
    expect(dashboard.counts.lostMonth).toBe(1)
    expect(dashboard.counts.newLeadsMonth).toBeGreaterThan(0)
  })
})
