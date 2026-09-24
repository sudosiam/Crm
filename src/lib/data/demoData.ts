import { BPH, DEMO_JOIN_CODE, defaultProductList } from '../business'
import { addDays, todayISO } from '../dates'
import { createId } from '../ids'
import type { Activity, Customer, FollowUp, Member, Organization, Sale, TestRide, WorkspaceData } from '../types'

export const DEMO_OWNER_ID = '11111111-1111-4111-8111-111111111111'
export const DEMO_STAFF_ID = '22222222-2222-4222-8222-222222222222'
export const DEMO_OWNER_EMAIL = 'owner@bph.demo'
export const DEMO_STAFF_EMAIL = 'staff@bph.demo'
export const DEMO_OWNER_PASSWORD = 'owner1234'
export const DEMO_STAFF_PASSWORD = 'staff1234'

export interface DemoUser {
  id: string
  email: string
  password: string
  fullName: string
}

export interface DemoState {
  users: DemoUser[]
  workspace: WorkspaceData
  sessionUserId: string | null
}

export function buildDemoState(now = new Date()): DemoState {
  const at = now.toISOString()
  const today = todayISO(now)
  const yesterday = addDays(today, -1)
  const tomorrow = addDays(today, 1)
  const soon = addDays(today, 3)
  const orgId = createId()
  const organization: Organization = {
    id: orgId,
    name: BPH.name,
    tagline: BPH.tagline,
    phone: BPH.phone,
    email: BPH.email,
    website: BPH.website,
    adLandingUrl: BPH.adLandingUrl,
    address: BPH.address,
    businessHours: BPH.businessHours,
    googleReviewUrl: '',
    joinCode: DEMO_JOIN_CODE,
    createdAt: at,
    updatedAt: at,
  }
  const members: Member[] = [
    {
      id: createId(),
      organizationId: orgId,
      userId: DEMO_OWNER_ID,
      role: 'OWNER',
      canViewAll: true,
      notifyFollowups: true,
      fullName: 'Biswajit',
      phone: null,
      email: DEMO_OWNER_EMAIL,
      createdAt: at,
    },
    {
      id: createId(),
      organizationId: orgId,
      userId: DEMO_STAFF_ID,
      role: 'STAFF',
      canViewAll: false,
      notifyFollowups: true,
      fullName: 'Riya',
      phone: null,
      email: DEMO_STAFF_EMAIL,
      createdAt: at,
    },
  ]
  const products = defaultProductList().map((product) => ({
    id: createId(),
    organizationId: orgId,
    kind: product.kind,
    name: product.name,
    sortOrder: product.sortOrder,
    active: true,
    createdAt: at,
    updatedAt: at,
  }))

  const make = (input: Omit<Customer, 'organizationId' | 'isSample' | 'createdBy' | 'phoneNormalized'> & { phone: string }): Customer => ({
    ...input,
    organizationId: orgId,
    phoneNormalized: input.phone,
    createdBy: input.assignedTo ?? DEMO_OWNER_ID,
    isSample: true,
  })

  const rahul = make({
    id: createId(),
    name: 'Rahul Das',
    phone: '9876543210',
    status: 'FOLLOW_UP',
    enquiryDate: today,
    model: 'Zoom',
    batteryConfiguration: 'Lithium Battery',
    budget: null,
    source: 'Google Ads',
    notes: 'Asked to visit after lunch',
    followUpDate: today,
    followUpTime: '11:00',
    assignedTo: DEMO_OWNER_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const mina = make({
    id: createId(),
    name: 'Mina Khatun',
    phone: '9000000012',
    status: 'FOLLOW_UP',
    enquiryDate: today,
    model: 'Activa Pro',
    batteryConfiguration: 'Graphine (Acid)',
    budget: null,
    source: 'Walk-in',
    notes: null,
    followUpDate: today,
    followUpTime: '17:30',
    assignedTo: DEMO_STAFF_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const rupa = make({
    id: createId(),
    name: 'Rupa Begum',
    phone: '9000000019',
    status: 'FOLLOW_UP',
    enquiryDate: yesterday,
    model: 'Dubbel Light Pro',
    batteryConfiguration: 'Lithium Battery',
    budget: null,
    source: 'Instagram',
    notes: 'Could not talk yesterday',
    followUpDate: yesterday,
    followUpTime: '16:00',
    assignedTo: DEMO_STAFF_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const suman = make({
    id: createId(),
    name: 'Suman Ghosh',
    phone: '9000000013',
    status: 'TEST_RIDE',
    enquiryDate: today,
    model: 'GT-90 Ola',
    batteryConfiguration: 'Lithium Pro Battery',
    budget: null,
    source: 'WhatsApp',
    notes: null,
    followUpDate: null,
    followUpTime: null,
    assignedTo: DEMO_OWNER_ID,
    testRideDate: today,
    testRideTime: '15:00',
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const priya = make({
    id: createId(),
    name: 'Priya Mandal',
    phone: '9000000014',
    status: 'NEW',
    enquiryDate: today,
    model: 'Blaze X',
    batteryConfiguration: 'Lithium Battery',
    budget: null,
    source: 'Instagram',
    notes: null,
    followUpDate: null,
    followUpTime: null,
    assignedTo: DEMO_STAFF_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const arif = make({
    id: createId(),
    name: 'Arif Sheikh',
    phone: '9000000015',
    status: 'SOLD',
    enquiryDate: today,
    model: 'Metrix 2.0',
    batteryConfiguration: 'Lithium Battery',
    budget: null,
    source: 'Referral',
    notes: null,
    followUpDate: null,
    followUpTime: null,
    assignedTo: DEMO_OWNER_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: today,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const kabir = make({
    id: createId(),
    name: 'Kabir Hossain',
    phone: '9000000016',
    status: 'LOST',
    enquiryDate: yesterday,
    model: 'SPORTZ Pro',
    batteryConfiguration: 'No Battery',
    budget: null,
    source: 'Phone Call',
    notes: null,
    followUpDate: null,
    followUpTime: null,
    assignedTo: DEMO_STAFF_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: 'Price',
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const nila = make({
    id: createId(),
    name: 'Nila Das',
    phone: '9000000017',
    status: 'FOLLOW_UP',
    enquiryDate: today,
    model: 'Dubbel Light',
    batteryConfiguration: 'Lithium Battery',
    budget: null,
    source: 'Google Maps',
    notes: null,
    followUpDate: tomorrow,
    followUpTime: '12:30',
    assignedTo: null,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })
  const farhan = make({
    id: createId(),
    name: 'Farhan Ali',
    phone: '9000000018',
    status: 'FOLLOW_UP',
    enquiryDate: today,
    model: 'Single Light',
    batteryConfiguration: 'Graphine (Acid)',
    budget: null,
    source: 'Facebook',
    notes: null,
    followUpDate: soon,
    followUpTime: '10:00',
    assignedTo: DEMO_OWNER_ID,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    createdAt: at,
    updatedAt: at,
  })

  const customers = [rahul, mina, rupa, suman, priya, arif, kabir, nila, farhan]
  const follow = (customer: Customer, date: string, time: string, status: FollowUp['status'] = 'SCHEDULED'): FollowUp => ({
    id: createId(),
    organizationId: orgId,
    customerId: customer.id,
    assignedTo: customer.assignedTo,
    scheduledDate: date,
    scheduledTime: time,
    completedAt: status === 'COMPLETED' ? at : null,
    status,
    notes: null,
    createdBy: DEMO_OWNER_ID,
    createdAt: at,
  })
  const followUps = [
    follow(rahul, today, '11:00'),
    follow(mina, today, '17:30'),
    follow(rupa, yesterday, '16:00'),
    follow(nila, tomorrow, '12:30'),
    follow(farhan, soon, '10:00'),
  ]
  const testRides: TestRide[] = [
    {
      id: createId(),
      organizationId: orgId,
      customerId: suman.id,
      assignedTo: DEMO_OWNER_ID,
      scheduledDate: today,
      scheduledTime: '15:00',
      status: 'SCHEDULED',
      model: 'GT-90 Ola',
      notes: null,
      createdBy: DEMO_OWNER_ID,
      createdAt: at,
    },
  ]
  const sales: Sale[] = [
    {
      id: createId(),
      organizationId: orgId,
      customerId: arif.id,
      model: 'Metrix 2.0',
      batteryConfiguration: 'Lithium Battery',
      saleAmount: null,
      deliveryDate: today,
      notes: null,
      createdBy: DEMO_OWNER_ID,
      createdAt: at,
    },
  ]
  const activity = (customerId: string, activityType: Activity['activityType'], description: string): Activity => ({
    id: createId(),
    organizationId: orgId,
    customerId,
    userId: DEMO_OWNER_ID,
    activityType,
    description,
    createdAt: at,
  })
  const activities = customers.flatMap((customer) => {
    const items = [activity(customer.id, 'CREATED', 'Customer added')]
    if (customer.followUpDate) items.push(activity(customer.id, 'FOLLOW_UP_SCHEDULED', 'Follow-up scheduled'))
    if (customer.status === 'TEST_RIDE') items.push(activity(customer.id, 'TEST_RIDE_SCHEDULED', 'Test ride scheduled'))
    if (customer.status === 'SOLD') items.push(activity(customer.id, 'SOLD', 'Marked sold'))
    if (customer.status === 'LOST') items.push(activity(customer.id, 'LOST', `Marked lost · ${customer.lostReason}`))
    return items
  })

  return {
    users: [
      { id: DEMO_OWNER_ID, email: DEMO_OWNER_EMAIL, password: DEMO_OWNER_PASSWORD, fullName: 'Biswajit' },
      { id: DEMO_STAFF_ID, email: DEMO_STAFF_EMAIL, password: DEMO_STAFF_PASSWORD, fullName: 'Riya' },
    ],
    sessionUserId: null,
    workspace: { organization, members, products, customers, followUps, testRides, sales, activities },
  }
}
