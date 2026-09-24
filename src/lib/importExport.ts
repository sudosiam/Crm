import { isValidDate, isValidTime } from './dates'
import { createId } from './ids'
import { normalizePhone } from './phone'
import { canManageBusiness } from './permissions'
import type {
  Activity,
  Actor,
  BackupCustomer,
  BackupFile,
  FollowUp,
  ImportResult,
  ProductKind,
  Sale,
  TestRide,
  WorkspaceData,
} from './types'
import { CUSTOMER_STATUSES, FOLLOW_UP_STATUSES, TEST_RIDE_STATUSES } from './types'
import { DomainError } from './errors'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

export function buildBackup(data: WorkspaceData, exportedAt: string): BackupFile {
  return {
    version: 1,
    exportedAt,
    business: {
      name: data.organization.name,
      tagline: data.organization.tagline,
      phone: data.organization.phone,
      email: data.organization.email,
      website: data.organization.website,
      adLandingUrl: data.organization.adLandingUrl,
      address: data.organization.address,
      businessHours: data.organization.businessHours,
      googleReviewUrl: data.organization.googleReviewUrl,
    },
    products: data.products.map((product) => ({
      kind: product.kind,
      name: product.name,
      sortOrder: product.sortOrder,
      active: product.active,
    })),
    customers: data.customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phoneNormalized,
      status: customer.status,
      enquiryDate: customer.enquiryDate,
      model: customer.model,
      batteryConfiguration: customer.batteryConfiguration,
      budget: customer.budget,
      source: customer.source,
      notes: customer.notes,
      followUpDate: customer.followUpDate,
      followUpTime: customer.followUpTime,
      assignedTo: customer.assignedTo,
      testRideDate: customer.testRideDate,
      testRideTime: customer.testRideTime,
      saleAmount: customer.saleAmount,
      deliveryDate: customer.deliveryDate,
      lostReason: customer.lostReason,
      statusChangedAt: customer.statusChangedAt,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })),
    followUps: data.followUps.map(({ organizationId: _organizationId, ...followUp }) => followUp),
    testRides: data.testRides.map(({ organizationId: _organizationId, ...ride }) => ride),
    sales: data.sales.map(({ organizationId: _organizationId, ...sale }) => sale),
    activities: data.activities.map(({ organizationId: _organizationId, ...activity }) => activity),
  }
}

interface ParsedBackup {
  customers: BackupCustomer[]
  followUps: FollowUp[]
  testRides: TestRide[]
  sales: Sale[]
  activities: Activity[]
  products: BackupFile['products']
  issues: string[]
}

function optionalDate(value: unknown, label: string, issues: string[], row: number): string | null {
  const raw = text(value)
  if (!raw) return null
  if (!isValidDate(raw)) {
    issues.push(`Row ${row}: ${label} is not a real date.`)
    return null
  }
  return raw
}

export function parseBackup(raw: unknown): ParsedBackup {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.customers)) {
    throw new DomainError('This file is not a BPH backup.', 'validation')
  }
  const issues: string[] = []
  const customers: BackupCustomer[] = []
  raw.customers.forEach((item, index) => {
    const row = index + 1
    if (!isRecord(item)) {
      issues.push(`Row ${row}: the customer record is not valid.`)
      return
    }
    const name = text(item.name) ?? ''
    const phone = typeof item.phone === 'string' ? normalizePhone(item.phone) : null
    const status = oneOf(item.status, CUSTOMER_STATUSES)
    const enquiryDate = text(item.enquiryDate)
    if (!phone || !status || !enquiryDate || !isValidDate(enquiryDate)) {
      issues.push(`Row ${row}: a valid mobile number, status, and enquiry date are required.`)
      return
    }
    const followUpTime = text(item.followUpTime)
    if (followUpTime && !isValidTime(followUpTime.slice(0, 5))) {
      issues.push(`Row ${row}: follow-up time was skipped because it is not valid.`)
    }
    const saleAmount = item.saleAmount === null || item.saleAmount === undefined || item.saleAmount === ''
      ? null
      : Number(item.saleAmount)
    customers.push({
      id: text(item.id) ?? createId(),
      name,
      phone,
      status,
      enquiryDate,
      model: text(item.model),
      batteryConfiguration: text(item.batteryConfiguration),
      budget: text(item.budget),
      source: text(item.source),
      notes: text(item.notes),
      followUpDate: optionalDate(item.followUpDate, 'Follow-up date', issues, row),
      followUpTime: followUpTime && isValidTime(followUpTime.slice(0, 5)) ? followUpTime.slice(0, 5) : null,
      assignedTo: text(item.assignedTo),
      testRideDate: optionalDate(item.testRideDate, 'Test ride date', issues, row),
      testRideTime: text(item.testRideTime),
      saleAmount: saleAmount !== null && Number.isFinite(saleAmount) && saleAmount >= 0 ? saleAmount : null,
      deliveryDate: optionalDate(item.deliveryDate, 'Delivery date', issues, row),
      lostReason: text(item.lostReason),
      statusChangedAt: text(item.statusChangedAt) ?? new Date().toISOString(),
      createdAt: text(item.createdAt) ?? new Date().toISOString(),
      updatedAt: text(item.updatedAt) ?? new Date().toISOString(),
    })
  })
  const products = Array.isArray(raw.products)
    ? raw.products.flatMap((item) => {
        if (!isRecord(item)) return []
        const kind = oneOf(item.kind, ['model', 'battery'] as const satisfies readonly ProductKind[])
        const name = text(item.name)
        if (!kind || !name) return []
        return [{ kind, name, sortOrder: Number(item.sortOrder) || 0, active: item.active !== false }]
      })
    : []
  return {
    customers,
    followUps: parseChildren(raw.followUps, 'follow-up'),
    testRides: parseChildren(raw.testRides, 'test ride'),
    sales: parseChildren(raw.sales, 'sale'),
    activities: parseChildren(raw.activities, 'activity'),
    products,
    issues,
  }
}

function parseChildren<T>(value: unknown, _label: string): T[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord) as T[]
}

export function applyImport(data: WorkspaceData, actor: Actor, raw: unknown, now = new Date()): ImportResult {
  if (!canManageBusiness(actor)) throw new DomainError('Only the owner can import data.', 'permission')
  const parsed = parseBackup(raw)
  const result: ImportResult = { added: 0, skippedDuplicates: 0, invalid: parsed.issues.length, issues: [...parsed.issues] }
  const idMap = new Map<string, string>()
  const at = now.toISOString()
  for (const product of parsed.products) {
    const exists = data.products.some(
      (item) => item.kind === product.kind && item.name.toLowerCase() === product.name.toLowerCase(),
    )
    if (exists) continue
    data.products.push({
      id: createId(),
      organizationId: data.organization.id,
      kind: product.kind,
      name: product.name,
      sortOrder: product.sortOrder,
      active: product.active,
      createdAt: at,
      updatedAt: at,
    })
  }
  for (const customer of parsed.customers) {
    const duplicate = data.customers.find((item) => item.phoneNormalized === customer.phone || item.id === customer.id)
    if (duplicate) {
      result.skippedDuplicates += 1
      idMap.set(customer.id, duplicate.id)
      continue
    }
    const id = createId()
    idMap.set(customer.id, id)
    const memberIds = new Set(data.members.map((member) => member.userId))
    data.customers.push({
      ...customer,
      id,
      organizationId: data.organization.id,
      phoneNormalized: customer.phone,
      assignedTo: customer.assignedTo && memberIds.has(customer.assignedTo) ? customer.assignedTo : null,
      createdBy: actor.userId,
      isSample: false,
      createdAt: customer.createdAt || at,
      updatedAt: at,
      statusChangedAt: customer.statusChangedAt || at,
    })
    result.added += 1
  }
  const known = (oldId: string | null | undefined) => (oldId ? idMap.get(oldId) ?? null : null)
  for (const item of parsed.followUps) {
    const customerId = known(item.customerId)
    if (!customerId || !oneOf(item.status, FOLLOW_UP_STATUSES) || !text(item.scheduledDate)) continue
    if (data.followUps.some((followUp) => followUp.id === item.id)) continue
    data.followUps.push({
      ...item,
      id: createId(),
      organizationId: data.organization.id,
      customerId,
      status: item.status,
      scheduledDate: item.scheduledDate,
    })
  }
  for (const item of parsed.testRides) {
    const customerId = known(item.customerId)
    if (!customerId || !oneOf(item.status, TEST_RIDE_STATUSES) || !text(item.scheduledDate)) continue
    data.testRides.push({
      ...item,
      id: createId(),
      organizationId: data.organization.id,
      customerId,
      status: item.status,
      scheduledDate: item.scheduledDate,
    })
  }
  for (const item of parsed.sales) {
    const customerId = known(item.customerId)
    if (!customerId) continue
    data.sales.push({
      ...item,
      id: createId(),
      organizationId: data.organization.id,
      customerId,
    })
  }
  for (const item of parsed.activities) {
    const customerId = known(item.customerId)
    if (!customerId || !text(item.description) || !text(item.activityType)) continue
    data.activities.push({
      ...item,
      id: createId(),
      organizationId: data.organization.id,
      customerId,
      userId: null,
      description: item.description,
      activityType: item.activityType,
      createdAt: item.createdAt || at,
    })
  }
  return result
}

export function containsSecretKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecretKey)
  if (isRecord(value)) {
    return Object.entries(value).some(
      ([key, child]) => /password|service_role|secret|anon_key/i.test(key) || containsSecretKey(child),
    )
  }
  return false
}
