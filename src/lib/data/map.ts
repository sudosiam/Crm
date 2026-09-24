import type {
  Activity,
  Customer,
  CustomerStatus,
  FollowUp,
  FollowUpStatus,
  Member,
  Organization,
  Product,
  ProductKind,
  Role,
  Sale,
  TestRide,
  TestRideStatus,
} from '../types'

type Row = Record<string, unknown>

function str(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value
}

function text(value: unknown): string | null {
  const valueText = str(value)
  return valueText && valueText.trim() ? valueText : null
}

function time(value: unknown): string | null {
  const raw = str(value)
  return raw ? raw.slice(0, 5) : null
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function mapOrganization(row: Row): Organization {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    tagline: String(row.tagline ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    website: String(row.website ?? ''),
    adLandingUrl: String(row.ad_landing_url ?? ''),
    address: String(row.address ?? ''),
    businessHours: String(row.business_hours ?? ''),
    googleReviewUrl: String(row.google_review_url ?? ''),
    joinCode: String(row.join_code ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapMember(row: Row): Member {
  const profileValue = row.profiles
  const profile = Array.isArray(profileValue) ? (profileValue[0] as Row | undefined) : (profileValue as Row | null)
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    userId: String(row.user_id),
    role: (row.role as Role) ?? 'STAFF',
    canViewAll: Boolean(row.can_view_all),
    notifyFollowups: row.notify_followups !== false,
    fullName: String(profile?.full_name ?? 'Teammate'),
    phone: text(profile?.phone),
    email: String(profile?.email ?? ''),
    createdAt: String(row.created_at),
  }
}

export function mapProduct(row: Row): Product {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    kind: row.kind as ProductKind,
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapCustomer(row: Row): Customer {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    phone: String(row.phone),
    phoneNormalized: String(row.phone_normalized),
    status: row.status as CustomerStatus,
    enquiryDate: String(row.enquiry_date),
    model: text(row.model),
    batteryConfiguration: text(row.battery_configuration),
    budget: text(row.budget),
    source: text(row.source),
    notes: text(row.notes),
    followUpDate: text(row.follow_up_date),
    followUpTime: time(row.follow_up_time),
    assignedTo: text(row.assigned_to),
    createdBy: text(row.created_by),
    testRideDate: text(row.test_ride_date),
    testRideTime: time(row.test_ride_time),
    saleAmount: num(row.sale_amount),
    deliveryDate: text(row.delivery_date),
    lostReason: text(row.lost_reason),
    statusChangedAt: String(row.status_changed_at),
    isSample: Boolean(row.is_sample),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function mapFollowUp(row: Row): FollowUp {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    customerId: String(row.customer_id),
    assignedTo: text(row.assigned_to),
    scheduledDate: String(row.scheduled_date),
    scheduledTime: time(row.scheduled_time),
    completedAt: text(row.completed_at),
    status: row.status as FollowUpStatus,
    notes: text(row.notes),
    createdBy: text(row.created_by),
    createdAt: String(row.created_at),
  }
}

export function mapTestRide(row: Row): TestRide {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    customerId: String(row.customer_id),
    assignedTo: text(row.assigned_to),
    scheduledDate: String(row.scheduled_date),
    scheduledTime: time(row.scheduled_time),
    status: row.status as TestRideStatus,
    model: text(row.model),
    notes: text(row.notes),
    createdBy: text(row.created_by),
    createdAt: String(row.created_at),
  }
}

export function mapSale(row: Row): Sale {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    customerId: String(row.customer_id),
    model: text(row.model),
    batteryConfiguration: text(row.battery_configuration),
    saleAmount: num(row.sale_amount),
    deliveryDate: text(row.delivery_date),
    notes: text(row.notes),
    createdBy: text(row.created_by),
    createdAt: String(row.created_at),
  }
}

export function mapActivity(row: Row): Activity {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    customerId: String(row.customer_id),
    userId: text(row.user_id),
    activityType: row.activity_type as Activity['activityType'],
    description: String(row.description ?? ''),
    createdAt: String(row.created_at),
  }
}
