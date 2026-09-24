import { describe, expect, it } from 'vitest'
import { buildDemoState, DEMO_OWNER_ID, DEMO_STAFF_ID } from './data/demoData'
import { todayISO } from './dates'
import { DomainError } from './errors'
import {
  completeFollowUp,
  createCustomer,
  markLost,
  recordSale,
  scheduleFollowUp,
  scheduleTestRide,
  updateCustomer,
} from './mutations'
import type { Actor, WorkspaceData } from './types'

function ownerActor(): Actor {
  return { userId: DEMO_OWNER_ID, role: 'OWNER', canViewAll: true, fullName: 'Biswajit' }
}

function staffActor(): Actor {
  return { userId: DEMO_STAFF_ID, role: 'STAFF', canViewAll: false, fullName: 'Riya' }
}

const sampleNow = new Date(2026, 8, 24, 8, 0, 0)

function copyState(): WorkspaceData {
  return structuredClone(buildDemoState(sampleNow).workspace)
}

describe('customer workflow', () => {
  it('creates a customer and a follow-up', () => {
    const data = copyState()
    const customer = createCustomer(data, ownerActor(), {
      name: 'Anita Roy',
      phone: '9123456780',
      model: 'Zoom',
      batteryConfiguration: 'Lithium Battery',
      followUpDate: '2026-09-25',
      followUpTime: '11:00',
    })
    expect(customer.status).toBe('FOLLOW_UP')
    expect(data.followUps.some((item) => item.customerId === customer.id && item.status === 'SCHEDULED')).toBe(true)
    expect(data.activities.some((item) => item.customerId === customer.id && item.activityType === 'CREATED')).toBe(true)
  })

  it('blocks a duplicate phone unless add anyway is chosen', () => {
    const data = copyState()
    expect(() => createCustomer(data, ownerActor(), { name: 'Copy', phone: '9876543210' })).toThrow(DomainError)
    const created = createCustomer(data, ownerActor(), { name: 'Copy', phone: '9876543210' }, { allowDuplicate: true })
    expect(created.name).toBe('Copy')
  })

  it('edits details and changes status without deleting the customer', () => {
    const data = copyState()
    const original = data.customers[0]
    const updated = updateCustomer(data, ownerActor(), original.id, { notes: 'Called back', status: 'FOLLOW_UP' })
    expect(updated.notes).toBe('Called back')
    expect(data.customers.some((customer) => customer.id === original.id)).toBe(true)
  })

  it('completes a follow-up and keeps history', () => {
    const data = copyState()
    const customer = data.customers.find((item) => item.followUpDate === todayISO(sampleNow) && item.assignedTo === DEMO_OWNER_ID)
    expect(customer).toBeTruthy()
    completeFollowUp(data, ownerActor(), customer!.id)
    const saved = data.customers.find((item) => item.id === customer!.id)
    expect(saved?.followUpDate).toBeNull()
    expect(data.followUps.some((item) => item.customerId === customer!.id && item.status === 'COMPLETED')).toBe(true)
    expect(data.activities.some((item) => item.description === 'Follow-up completed')).toBe(true)
  })

  it('reschedules by updating the open follow-up', () => {
    const data = copyState()
    const customer = data.customers.find((item) => item.name === 'Rahul Das')!
    scheduleFollowUp(data, ownerActor(), customer.id, { date: '2026-09-28', time: '16:00' })
    const open = data.followUps.filter((item) => item.customerId === customer.id && item.status === 'SCHEDULED')
    expect(open).toHaveLength(1)
    expect(open[0]?.scheduledDate).toBe('2026-09-28')
  })

  it('schedules a test ride and records a sale without inventing a price', () => {
    const data = copyState()
    const customer = createCustomer(data, ownerActor(), { name: 'Test Rider', phone: '9000000099', model: 'Zoom' })
    scheduleTestRide(data, ownerActor(), customer.id, { date: '2026-09-26', time: '15:00', model: 'Zoom' })
    expect(data.customers.find((item) => item.id === customer.id)?.status).toBe('TEST_RIDE')
    recordSale(data, ownerActor(), customer.id, { model: 'Zoom', batteryConfiguration: 'Lithium Battery', saleAmount: null, deliveryDate: '2026-09-30' })
    const sold = data.customers.find((item) => item.id === customer.id)
    expect(sold?.status).toBe('SOLD')
    expect(sold?.saleAmount).toBeNull()
    expect(data.sales.some((sale) => sale.customerId === customer.id)).toBe(true)
  })

  it('marks a customer lost and keeps them searchable', () => {
    const data = copyState()
    const customer = data.customers.find((item) => item.name === 'Nila Das')!
    markLost(data, ownerActor(), customer.id, 'Bought elsewhere')
    const lost = data.customers.find((item) => item.id === customer.id)
    expect(lost?.status).toBe('LOST')
    expect(lost?.lostReason).toBe('Bought elsewhere')
    expect(data.customers.some((item) => item.name === 'Nila Das')).toBe(true)
  })

  it('stops staff from editing a lead assigned to someone else', () => {
    const data = copyState()
    const rahul = data.customers.find((item) => item.name === 'Rahul Das')!
    expect(() => updateCustomer(data, staffActor(), rahul.id, { notes: 'nope' })).toThrow(/do not have access/)
  })
})
