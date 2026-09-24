import { BPH, defaultProductList } from './business'
import { isValidDate, isValidTime, timestamp, todayISO } from './dates'
import { DomainError } from './errors'
import { createId, randomJoinCode } from './ids'
import { normalizePhone } from './phone'
import { canEditCustomer, canManageBusiness, canViewCustomer } from './permissions'
import type {
  Activity,
  ActivityType,
  Actor,
  BusinessInput,
  Customer,
  CustomerInput,
  CustomerPatch,
  CustomerStatus,
  FollowUp,
  FollowUpInput,
  Member,
  Product,
  ProductKind,
  SaleInput,
  TestRideInput,
  TestRideStatus,
  WorkspaceData,
} from './types'

export interface MutationOptions {
  now?: Date
  id?: string
  allowDuplicate?: boolean
}

function nowStamp(options?: MutationOptions): string {
  return timestamp(options?.now ?? new Date())
}

function today(options?: MutationOptions): string {
  return todayISO(options?.now ?? new Date())
}

function blankToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function requireDate(value: string, label: string): string {
  if (!isValidDate(value)) throw new DomainError(`Choose a valid ${label}.`, 'validation')
  return value
}

function optionalTime(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.slice(0, 5)
  if (!isValidTime(trimmed)) throw new DomainError('Choose a valid time.', 'validation')
  return trimmed
}

function assertMember(data: WorkspaceData, userId: string | null | undefined): string | null {
  if (!userId) return null
  const member = data.members.find((item) => item.userId === userId)
  if (!member) throw new DomainError('Choose a salesperson from the team.', 'validation')
  return member.userId
}

function getCustomer(data: WorkspaceData, customerId: string): Customer {
  const customer = data.customers.find((item) => item.id === customerId)
  if (!customer) throw new DomainError('That customer could not be found.', 'not_found')
  return customer
}

function assertCanEdit(actor: Actor, customer: Customer) {
  if (!canEditCustomer(actor, customer)) {
    throw new DomainError('You do not have access to this customer.', 'permission')
  }
}

function assertOpen(customer: Customer) {
  if (customer.status === 'SOLD' || customer.status === 'LOST') {
    throw new DomainError('Change the status before scheduling this.', 'validation')
  }
}

function log(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  activityType: ActivityType,
  description: string,
  at: string,
): Activity {
  const activity: Activity = {
    id: createId(),
    organizationId: data.organization.id,
    customerId,
    userId: actor.userId,
    activityType,
    description,
    createdAt: at,
  }
  data.activities.push(activity)
  return activity
}

function replaceCustomer(data: WorkspaceData, customer: Customer) {
  data.customers = data.customers.map((item) => (item.id === customer.id ? customer : item))
}

export function visibleCustomer(data: WorkspaceData, actor: Actor, customerId: string): Customer {
  const customer = getCustomer(data, customerId)
  if (!canViewCustomer(actor, customer)) {
    throw new DomainError('You do not have access to this customer.', 'permission')
  }
  return customer
}

export function findPhoneMatch(data: WorkspaceData, actor: Actor, phone: string, exceptId?: string) {
  const normalized = normalizePhone(phone)
  if (!normalized) return { state: 'none' as const }
  const existing = data.customers.find(
    (customer) => customer.phoneNormalized === normalized && customer.id !== exceptId,
  )
  if (!existing) return { state: 'none' as const }
  if (!canViewCustomer(actor, existing)) return { state: 'hidden' as const }
  return { state: 'visible' as const, customer: existing }
}

export function createCustomer(
  data: WorkspaceData,
  actor: Actor,
  input: CustomerInput,
  options: MutationOptions = {},
): Customer {
  const name = input.name.trim()
  if (!name) throw new DomainError('Enter the customer name.', 'validation')
  const phone = normalizePhone(input.phone)
  if (!phone) throw new DomainError('Enter a valid 10-digit mobile number.', 'validation')
  const match = findPhoneMatch(data, actor, phone)
  if (match.state !== 'none' && !options.allowDuplicate) {
    throw new DomainError(
      'Customer already exists.',
      'duplicate',
      match.state === 'visible' ? match.customer.id : undefined,
    )
  }
  const at = nowStamp(options)
  const followUpDate = input.followUpDate ? requireDate(input.followUpDate, 'follow-up date') : null
  const followUpTime = optionalTime(input.followUpTime)
  const status: CustomerStatus = input.status ?? (followUpDate ? 'FOLLOW_UP' : 'NEW')
  if (status === 'SOLD' || status === 'LOST') {
    throw new DomainError('Save the customer first, then mark sold or lost.', 'validation')
  }
  const assignedTo = assertMember(data, input.assignedTo === undefined ? actor.userId : input.assignedTo)
  const customer: Customer = {
    id: options.id ?? createId(),
    organizationId: data.organization.id,
    name,
    phone,
    phoneNormalized: phone,
    status: followUpDate && status === 'NEW' ? 'FOLLOW_UP' : status,
    enquiryDate: input.enquiryDate ? requireDate(input.enquiryDate, 'enquiry date') : today(options),
    model: blankToNull(input.model),
    batteryConfiguration: blankToNull(input.batteryConfiguration),
    budget: blankToNull(input.budget),
    source: blankToNull(input.source),
    notes: blankToNull(input.notes),
    followUpDate,
    followUpTime: followUpDate ? followUpTime : null,
    assignedTo,
    createdBy: actor.userId,
    testRideDate: null,
    testRideTime: null,
    saleAmount: null,
    deliveryDate: null,
    lostReason: null,
    statusChangedAt: at,
    isSample: false,
    createdAt: at,
    updatedAt: at,
  }
  data.customers.push(customer)
  log(data, actor, customer.id, 'CREATED', 'Customer added', at)
  if (followUpDate) {
    const followUp: FollowUp = {
      id: createId(),
      organizationId: data.organization.id,
      customerId: customer.id,
      assignedTo,
      scheduledDate: followUpDate,
      scheduledTime: followUpTime,
      completedAt: null,
      status: 'SCHEDULED',
      notes: null,
      createdBy: actor.userId,
      createdAt: at,
    }
    data.followUps.push(followUp)
    log(data, actor, customer.id, 'FOLLOW_UP_SCHEDULED', 'Follow-up scheduled', at)
  }
  return customer
}

export function updateCustomer(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  patch: CustomerPatch,
  options: MutationOptions = {},
): Customer {
  const current = getCustomer(data, customerId)
  assertCanEdit(actor, current)
  const at = nowStamp(options)
  const next: Customer = { ...current, updatedAt: at }
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) throw new DomainError('Enter the customer name.', 'validation')
    next.name = name
  }
  if (patch.phone !== undefined) {
    const phone = normalizePhone(patch.phone)
    if (!phone) throw new DomainError('Enter a valid 10-digit mobile number.', 'validation')
    const match = findPhoneMatch(data, actor, phone, customerId)
    if (match.state !== 'none' && !options.allowDuplicate) {
      throw new DomainError(
        'Customer already exists.',
        'duplicate',
        match.state === 'visible' ? match.customer.id : undefined,
      )
    }
    next.phone = phone
    next.phoneNormalized = phone
  }
  if (patch.enquiryDate !== undefined) next.enquiryDate = requireDate(patch.enquiryDate, 'enquiry date')
  if (patch.model !== undefined) next.model = blankToNull(patch.model)
  if (patch.batteryConfiguration !== undefined) next.batteryConfiguration = blankToNull(patch.batteryConfiguration)
  if (patch.budget !== undefined) next.budget = blankToNull(patch.budget)
  if (patch.source !== undefined) next.source = blankToNull(patch.source)
  if (patch.notes !== undefined) next.notes = blankToNull(patch.notes)
  if (patch.assignedTo !== undefined) next.assignedTo = assertMember(data, patch.assignedTo)
  if (patch.status !== undefined) {
    if (patch.status === 'SOLD' || patch.status === 'LOST') {
      throw new DomainError('Use the sold or lost action for that status.', 'validation')
    }
    if (patch.status !== current.status) {
      next.status = patch.status
      next.statusChangedAt = at
      log(data, actor, customerId, 'STATUS', `Status changed to ${patch.status}`, at)
    }
  }
  replaceCustomer(data, next)
  log(data, actor, customerId, 'UPDATED', 'Customer details updated', at)
  return next
}

export function scheduleFollowUp(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  input: FollowUpInput,
  options: MutationOptions = {},
): FollowUp {
  const customer = getCustomer(data, customerId)
  assertCanEdit(actor, customer)
  assertOpen(customer)
  const date = requireDate(input.date, 'follow-up date')
  const time = optionalTime(input.time)
  const at = nowStamp(options)
  const assignedTo = assertMember(data, input.assignedTo === undefined ? customer.assignedTo : input.assignedTo)
  const open = data.followUps.find((item) => item.customerId === customerId && item.status === 'SCHEDULED')
  let followUp: FollowUp
  if (open) {
    followUp = {
      ...open,
      scheduledDate: date,
      scheduledTime: time,
      notes: input.notes === undefined ? open.notes : blankToNull(input.notes),
      assignedTo,
    }
    data.followUps = data.followUps.map((item) => (item.id === open.id ? followUp : item))
    log(data, actor, customerId, 'FOLLOW_UP_RESCHEDULED', 'Follow-up rescheduled', at)
  } else {
    followUp = {
      id: options.id ?? createId(),
      organizationId: data.organization.id,
      customerId,
      assignedTo,
      scheduledDate: date,
      scheduledTime: time,
      completedAt: null,
      status: 'SCHEDULED',
      notes: blankToNull(input.notes),
      createdBy: actor.userId,
      createdAt: at,
    }
    data.followUps.push(followUp)
    log(data, actor, customerId, 'FOLLOW_UP_SCHEDULED', 'Follow-up scheduled', at)
  }
  replaceCustomer(data, {
    ...customer,
    status: customer.status === 'NEW' ? 'FOLLOW_UP' : customer.status,
    statusChangedAt: customer.status === 'NEW' ? at : customer.statusChangedAt,
    followUpDate: date,
    followUpTime: time,
    updatedAt: at,
  })
  return followUp
}

export function completeFollowUp(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  followUpId?: string,
  options: MutationOptions = {},
): void {
  const customer = getCustomer(data, customerId)
  assertCanEdit(actor, customer)
  const open = data.followUps.find((item) =>
    followUpId ? item.id === followUpId : item.customerId === customerId && item.status === 'SCHEDULED',
  )
  if (!open || open.status !== 'SCHEDULED') {
    throw new DomainError('No follow-up is scheduled.', 'validation')
  }
  const at = nowStamp(options)
  data.followUps = data.followUps.map((item) =>
    item.id === open.id ? { ...item, status: 'COMPLETED', completedAt: at } : item,
  )
  const stillOpen = data.followUps.find((item) => item.customerId === customerId && item.status === 'SCHEDULED')
  replaceCustomer(data, {
    ...customer,
    followUpDate: stillOpen ? stillOpen.scheduledDate : null,
    followUpTime: stillOpen ? stillOpen.scheduledTime : null,
    updatedAt: at,
  })
  log(data, actor, customerId, 'FOLLOW_UP_COMPLETED', 'Follow-up completed', at)
}

export function scheduleTestRide(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  input: TestRideInput,
  options: MutationOptions = {},
): void {
  const customer = getCustomer(data, customerId)
  assertCanEdit(actor, customer)
  assertOpen(customer)
  const date = requireDate(input.date, 'test ride date')
  const time = optionalTime(input.time)
  const at = nowStamp(options)
  const assignedTo = assertMember(data, input.assignedTo === undefined ? customer.assignedTo ?? actor.userId : input.assignedTo)
  const model = input.model === undefined ? customer.model : blankToNull(input.model)
  const open = data.testRides.find((item) => item.customerId === customerId && item.status === 'SCHEDULED')
  if (open) {
    data.testRides = data.testRides.map((item) =>
      item.id === open.id
        ? {
            ...item,
            scheduledDate: date,
            scheduledTime: time,
            model,
            notes: input.notes === undefined ? item.notes : blankToNull(input.notes),
            assignedTo,
          }
        : item,
    )
  } else {
    data.testRides.push({
      id: options.id ?? createId(),
      organizationId: data.organization.id,
      customerId,
      assignedTo,
      scheduledDate: date,
      scheduledTime: time,
      status: 'SCHEDULED',
      model,
      notes: blankToNull(input.notes),
      createdBy: actor.userId,
      createdAt: at,
    })
  }
  replaceCustomer(data, {
    ...customer,
    status: 'TEST_RIDE',
    statusChangedAt: customer.status === 'TEST_RIDE' ? customer.statusChangedAt : at,
    testRideDate: date,
    testRideTime: time,
    model: model ?? customer.model,
    updatedAt: at,
  })
  log(data, actor, customerId, 'TEST_RIDE_SCHEDULED', 'Test ride scheduled', at)
}

export function setTestRideStatus(
  data: WorkspaceData,
  actor: Actor,
  testRideId: string,
  status: Extract<TestRideStatus, 'COMPLETED' | 'CANCELLED'>,
  options: MutationOptions = {},
): void {
  const ride = data.testRides.find((item) => item.id === testRideId)
  if (!ride) throw new DomainError('That test ride could not be found.', 'not_found')
  const customer = getCustomer(data, ride.customerId)
  assertCanEdit(actor, customer)
  if (ride.status !== 'SCHEDULED') throw new DomainError('This test ride is already closed.', 'validation')
  const at = nowStamp(options)
  data.testRides = data.testRides.map((item) => (item.id === ride.id ? { ...item, status } : item))
  const stillOpen = data.testRides.find((item) => item.customerId === customer.id && item.status === 'SCHEDULED')
  replaceCustomer(data, {
    ...customer,
    testRideDate: stillOpen ? stillOpen.scheduledDate : status === 'COMPLETED' ? ride.scheduledDate : null,
    testRideTime: stillOpen ? stillOpen.scheduledTime : status === 'COMPLETED' ? ride.scheduledTime : null,
    updatedAt: at,
  })
  log(
    data,
    actor,
    customer.id,
    status === 'COMPLETED' ? 'TEST_RIDE_COMPLETED' : 'TEST_RIDE_CANCELLED',
    status === 'COMPLETED' ? 'Test ride completed' : 'Test ride cancelled',
    at,
  )
}

function closeOpenWork(data: WorkspaceData, customerId: string, at: string, cancelRides: boolean) {
  data.followUps = data.followUps.map((item) =>
    item.customerId === customerId && item.status === 'SCHEDULED'
      ? { ...item, status: 'COMPLETED', completedAt: at }
      : item,
  )
  if (cancelRides) {
    data.testRides = data.testRides.map((item) =>
      item.customerId === customerId && item.status === 'SCHEDULED' ? { ...item, status: 'CANCELLED' } : item,
    )
  }
}

export function recordSale(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  input: SaleInput,
  options: MutationOptions = {},
): void {
  const customer = getCustomer(data, customerId)
  assertCanEdit(actor, customer)
  if (input.saleAmount !== null && input.saleAmount !== undefined) {
    if (!Number.isFinite(input.saleAmount) || input.saleAmount < 0) {
      throw new DomainError('Enter a valid sale amount, or leave it blank.', 'validation')
    }
  }
  const deliveryDate = input.deliveryDate ? requireDate(input.deliveryDate, 'delivery date') : null
  const at = nowStamp(options)
  const model = input.model === undefined ? customer.model : blankToNull(input.model)
  const battery = input.batteryConfiguration === undefined ? customer.batteryConfiguration : blankToNull(input.batteryConfiguration)
  data.sales.push({
    id: options.id ?? createId(),
    organizationId: data.organization.id,
    customerId,
    model,
    batteryConfiguration: battery,
    saleAmount: input.saleAmount ?? null,
    deliveryDate,
    notes: blankToNull(input.notes),
    createdBy: actor.userId,
    createdAt: at,
  })
  closeOpenWork(data, customerId, at, false)
  replaceCustomer(data, {
    ...customer,
    status: 'SOLD',
    statusChangedAt: at,
    model,
    batteryConfiguration: battery,
    saleAmount: input.saleAmount ?? null,
    deliveryDate,
    followUpDate: null,
    followUpTime: null,
    lostReason: null,
    updatedAt: at,
  })
  log(data, actor, customerId, 'SOLD', 'Marked sold', at)
}

export function markLost(
  data: WorkspaceData,
  actor: Actor,
  customerId: string,
  reason: string,
  notes?: string | null,
  options: MutationOptions = {},
): void {
  const customer = getCustomer(data, customerId)
  assertCanEdit(actor, customer)
  const lostReason = reason.trim()
  if (!lostReason) throw new DomainError('Choose a reason.', 'validation')
  const at = nowStamp(options)
  closeOpenWork(data, customerId, at, true)
  const extra = blankToNull(notes)
  replaceCustomer(data, {
    ...customer,
    status: 'LOST',
    statusChangedAt: at,
    lostReason,
    notes: extra ? [customer.notes, extra].filter(Boolean).join('\n') : customer.notes,
    followUpDate: null,
    followUpTime: null,
    testRideDate: null,
    testRideTime: null,
    updatedAt: at,
  })
  log(data, actor, customerId, 'LOST', `Marked lost · ${lostReason}`, at)
}

export function deleteCustomer(data: WorkspaceData, actor: Actor, customerId: string): void {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can delete a customer.', 'permission')
  const customer = getCustomer(data, customerId)
  data.customers = data.customers.filter((item) => item.id !== customer.id)
  data.followUps = data.followUps.filter((item) => item.customerId !== customer.id)
  data.testRides = data.testRides.filter((item) => item.customerId !== customer.id)
  data.sales = data.sales.filter((item) => item.customerId !== customer.id)
  data.activities = data.activities.filter((item) => item.customerId !== customer.id)
}

export function updateBusiness(data: WorkspaceData, actor: Actor, input: BusinessInput, options: MutationOptions = {}): void {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can change business settings.', 'permission')
  if (!input.name.trim()) throw new DomainError('Enter the business name.', 'validation')
  const at = nowStamp(options)
  data.organization = {
    ...data.organization,
    name: input.name.trim(),
    tagline: input.tagline.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    website: input.website.trim(),
    adLandingUrl: input.adLandingUrl.trim(),
    address: input.address.trim(),
    businessHours: input.businessHours.trim(),
    googleReviewUrl: (input.googleReviewUrl ?? data.organization.googleReviewUrl).trim(),
    updatedAt: at,
  }
}

export function setGoogleReviewUrl(data: WorkspaceData, actor: Actor, url: string, options: MutationOptions = {}): void {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can change the review link.', 'permission')
  const trimmed = url.trim()
  if (trimmed && !/^https:\/\//i.test(trimmed)) {
    throw new DomainError('The review link should start with https://', 'validation')
  }
  data.organization = { ...data.organization, googleReviewUrl: trimmed, updatedAt: nowStamp(options) }
}

export function rotateJoinCode(data: WorkspaceData, actor: Actor, options: MutationOptions = {}): string {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can change the team code.', 'permission')
  const joinCode = randomJoinCode()
  data.organization = { ...data.organization, joinCode, updatedAt: nowStamp(options) }
  return joinCode
}

export function updateMemberAccess(
  data: WorkspaceData,
  actor: Actor,
  memberId: string,
  patch: { role?: Member['role']; canViewAll?: boolean },
  options: MutationOptions = {},
): void {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can change the team.', 'permission')
  const member = data.members.find((item) => item.id === memberId)
  if (!member) throw new DomainError('That teammate could not be found.', 'not_found')
  const nextRole = patch.role ?? member.role
  const owners = data.members.filter((item) => item.role === 'OWNER')
  if (member.role === 'OWNER' && nextRole !== 'OWNER' && owners.length <= 1) {
    throw new DomainError('The business needs at least one owner.', 'validation')
  }
  data.members = data.members.map((item) =>
    item.id === member.id
      ? {
          ...item,
          role: nextRole,
          canViewAll: nextRole === 'OWNER' ? true : (patch.canViewAll ?? item.canViewAll),
        }
      : item,
  )
  void options
}

export function removeMember(data: WorkspaceData, actor: Actor, memberId: string): void {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can remove a teammate.', 'permission')
  const member = data.members.find((item) => item.id === memberId)
  if (!member) throw new DomainError('That teammate could not be found.', 'not_found')
  if (member.userId === actor.userId) throw new DomainError('You cannot remove yourself.', 'validation')
  const owners = data.members.filter((item) => item.role === 'OWNER')
  if (member.role === 'OWNER' && owners.length <= 1) {
    throw new DomainError('The business needs at least one owner.', 'validation')
  }
  data.members = data.members.filter((item) => item.id !== member.id)
  data.customers = data.customers.map((customer) =>
    customer.assignedTo === member.userId ? { ...customer, assignedTo: null } : customer,
  )
}

export function setMyNotifications(data: WorkspaceData, actor: Actor, enabled: boolean): void {
  data.members = data.members.map((member) =>
    member.userId === actor.userId ? { ...member, notifyFollowups: enabled } : member,
  )
}

export function updateMyProfile(data: WorkspaceData, actor: Actor, fullName: string, phone: string): void {
  const name = fullName.trim()
  if (!name) throw new DomainError('Enter your name.', 'validation')
  const normalized = phone.trim() ? normalizePhone(phone) : null
  if (phone.trim() && !normalized) throw new DomainError('Enter a valid 10-digit mobile number.', 'validation')
  data.members = data.members.map((member) =>
    member.userId === actor.userId ? { ...member, fullName: name, phone: normalized } : member,
  )
}

export function saveProduct(
  data: WorkspaceData,
  actor: Actor,
  input: { id?: string; kind: ProductKind; name: string; sortOrder?: number; active?: boolean },
  options: MutationOptions = {},
): Product {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can edit products.', 'permission')
  const name = input.name.trim()
  if (!name) throw new DomainError('Enter a name.', 'validation')
  const duplicate = data.products.find(
    (product) => product.kind === input.kind && product.name.toLowerCase() === name.toLowerCase() && product.id !== input.id,
  )
  if (duplicate) throw new DomainError('That name is already in the list.', 'validation')
  const at = nowStamp(options)
  if (input.id) {
    const current = data.products.find((product) => product.id === input.id)
    if (!current) throw new DomainError('That product could not be found.', 'not_found')
    const next = { ...current, name, active: input.active ?? current.active, updatedAt: at }
    data.products = data.products.map((product) => (product.id === current.id ? next : product))
    return next
  }
  const product: Product = {
    id: createId(),
    organizationId: data.organization.id,
    kind: input.kind,
    name,
    sortOrder: input.sortOrder ?? data.products.filter((item) => item.kind === input.kind).length,
    active: input.active ?? true,
    createdAt: at,
    updatedAt: at,
  }
  data.products.push(product)
  return product
}

export function moveProduct(data: WorkspaceData, actor: Actor, productId: string, direction: -1 | 1): void {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can edit products.', 'permission')
  const product = data.products.find((item) => item.id === productId)
  if (!product) throw new DomainError('That product could not be found.', 'not_found')
  const siblings = data.products
    .filter((item) => item.kind === product.kind)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const index = siblings.findIndex((item) => item.id === product.id)
  const swap = siblings[index + direction]
  if (!swap) return
  const order = product.sortOrder
  data.products = data.products.map((item) => {
    if (item.id === product.id) return { ...item, sortOrder: swap.sortOrder }
    if (item.id === swap.id) return { ...item, sortOrder: order }
    return item
  })
}

export function createBusinessRecord(user: { id: string; email: string; fullName: string }, input: BusinessInput, now = new Date()): WorkspaceData {
  const at = timestamp(now)
  const organizationId = createId()
  const products = defaultProductList().map((product) => ({
    id: createId(),
    organizationId,
    kind: product.kind,
    name: product.name,
    sortOrder: product.sortOrder,
    active: true,
    createdAt: at,
    updatedAt: at,
  }))
  return {
    organization: {
      id: organizationId,
      name: input.name.trim() || BPH.name,
      tagline: input.tagline.trim() || BPH.tagline,
      phone: input.phone.trim() || BPH.phone,
      email: input.email.trim() || BPH.email,
      website: input.website.trim() || BPH.website,
      adLandingUrl: input.adLandingUrl.trim() || BPH.adLandingUrl,
      address: input.address.trim() || BPH.address,
      businessHours: input.businessHours.trim() || BPH.businessHours,
      googleReviewUrl: '',
      joinCode: randomJoinCode(),
      createdAt: at,
      updatedAt: at,
    },
    members: [
      {
        id: createId(),
        organizationId,
        userId: user.id,
        role: 'OWNER',
        canViewAll: true,
        notifyFollowups: true,
        fullName: user.fullName,
        phone: null,
        email: user.email,
        createdAt: at,
      },
    ],
    products,
    customers: [],
    followUps: [],
    testRides: [],
    sales: [],
    activities: [],
  }
}

export function joinBusinessRecord(data: WorkspaceData, user: { id: string; email: string; fullName: string }, code: string, now = new Date()): Member {
  if (data.members.some((member) => member.userId === user.id)) {
    throw new DomainError('You already belong to a business.', 'validation')
  }
  if (data.organization.joinCode.trim().toUpperCase() !== code.trim().toUpperCase()) {
    throw new DomainError('That team code was not recognized.', 'validation')
  }
  const member: Member = {
    id: createId(),
    organizationId: data.organization.id,
    userId: user.id,
    role: 'STAFF',
    canViewAll: false,
    notifyFollowups: true,
    fullName: user.fullName,
    phone: null,
    email: user.email,
    createdAt: timestamp(now),
  }
  data.members.push(member)
  return member
}
