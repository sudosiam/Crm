export const CUSTOMER_STATUSES = ['NEW', 'FOLLOW_UP', 'TEST_RIDE', 'SOLD', 'LOST'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export const FOLLOW_UP_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

export const TEST_RIDE_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const
export type TestRideStatus = (typeof TEST_RIDE_STATUSES)[number]

export const ROLES = ['OWNER', 'STAFF'] as const
export type Role = (typeof ROLES)[number]

export const PRODUCT_KINDS = ['model', 'battery'] as const
export type ProductKind = (typeof PRODUCT_KINDS)[number]

export const LEAD_SOURCES = [
  'Google Ads',
  'Google Maps',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Phone Call',
  'Walk-in',
  'Referral',
  'Other',
] as const

export const LOST_REASONS = [
  'Price',
  'Bought elsewhere',
  'Delayed purchase',
  'Not interested',
  'Could not contact',
  'Other',
] as const

export const ACTIVITY_TYPES = [
  'CREATED',
  'UPDATED',
  'STATUS',
  'FOLLOW_UP_SCHEDULED',
  'FOLLOW_UP_COMPLETED',
  'FOLLOW_UP_RESCHEDULED',
  'TEST_RIDE_SCHEDULED',
  'TEST_RIDE_COMPLETED',
  'TEST_RIDE_CANCELLED',
  'SOLD',
  'LOST',
] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export type CustomerListFilter =
  | 'all'
  | CustomerStatus
  | 'today'
  | 'overdue'
  | 'mine'
  | 'unassigned'

export interface SessionUser {
  id: string
  email: string
  fullName: string
}

export interface Organization {
  id: string
  name: string
  tagline: string
  phone: string
  email: string
  website: string
  adLandingUrl: string
  address: string
  businessHours: string
  googleReviewUrl: string
  joinCode: string
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  organizationId: string
  userId: string
  role: Role
  canViewAll: boolean
  notifyFollowups: boolean
  fullName: string
  phone: string | null
  email: string
  createdAt: string
}

export interface Product {
  id: string
  organizationId: string
  kind: ProductKind
  name: string
  sortOrder: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  organizationId: string
  name: string
  phone: string
  phoneNormalized: string
  status: CustomerStatus
  enquiryDate: string
  model: string | null
  batteryConfiguration: string | null
  budget: string | null
  source: string | null
  notes: string | null
  followUpDate: string | null
  followUpTime: string | null
  assignedTo: string | null
  createdBy: string | null
  testRideDate: string | null
  testRideTime: string | null
  saleAmount: number | null
  deliveryDate: string | null
  lostReason: string | null
  statusChangedAt: string
  isSample: boolean
  createdAt: string
  updatedAt: string
}

export interface FollowUp {
  id: string
  organizationId: string
  customerId: string
  assignedTo: string | null
  scheduledDate: string
  scheduledTime: string | null
  completedAt: string | null
  status: FollowUpStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface TestRide {
  id: string
  organizationId: string
  customerId: string
  assignedTo: string | null
  scheduledDate: string
  scheduledTime: string | null
  status: TestRideStatus
  model: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface Sale {
  id: string
  organizationId: string
  customerId: string
  model: string | null
  batteryConfiguration: string | null
  saleAmount: number | null
  deliveryDate: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export interface Activity {
  id: string
  organizationId: string
  customerId: string
  userId: string | null
  activityType: ActivityType
  description: string
  createdAt: string
}

export interface WorkspaceData {
  organization: Organization
  members: Member[]
  products: Product[]
  customers: Customer[]
  followUps: FollowUp[]
  testRides: TestRide[]
  sales: Sale[]
  activities: Activity[]
}

export interface Actor {
  userId: string
  role: Role
  canViewAll: boolean
  fullName: string
}

export interface CustomerInput {
  name: string
  phone: string
  status?: CustomerStatus
  enquiryDate?: string
  model?: string | null
  batteryConfiguration?: string | null
  budget?: string | null
  source?: string | null
  notes?: string | null
  followUpDate?: string | null
  followUpTime?: string | null
  assignedTo?: string | null
}

export interface CustomerPatch {
  name?: string
  phone?: string
  status?: CustomerStatus
  enquiryDate?: string
  model?: string | null
  batteryConfiguration?: string | null
  budget?: string | null
  source?: string | null
  notes?: string | null
  assignedTo?: string | null
}

export interface FollowUpInput {
  date: string
  time?: string | null
  notes?: string | null
  assignedTo?: string | null
}

export interface TestRideInput {
  date: string
  time?: string | null
  model?: string | null
  notes?: string | null
  assignedTo?: string | null
}

export interface SaleInput {
  model?: string | null
  batteryConfiguration?: string | null
  saleAmount?: number | null
  deliveryDate?: string | null
  notes?: string | null
}

export interface CustomerQuery {
  search?: string
  filter?: CustomerListFilter
  page?: number
  pageSize?: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardData {
  followUpsToday: Customer[]
  overdue: Customer[]
  testRidesToday: TestRide[]
  counts: {
    followUpsToday: number
    overdue: number
    newLeadsMonth: number
    testRidesToday: number
    soldMonth: number
    lostMonth: number
  }
}

export interface CustomerBundle {
  customer: Customer
  followUps: FollowUp[]
  testRides: TestRide[]
  sales: Sale[]
  activities: Activity[]
}

export interface PhoneMatch {
  state: 'none' | 'visible' | 'hidden'
  customer?: Customer
}

export interface BusinessInput {
  name: string
  tagline: string
  phone: string
  email: string
  website: string
  adLandingUrl: string
  address: string
  businessHours: string
  googleReviewUrl?: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface BackupCustomer {
  id: string
  name: string
  phone: string
  status: CustomerStatus
  enquiryDate: string
  model: string | null
  batteryConfiguration: string | null
  budget: string | null
  source: string | null
  notes: string | null
  followUpDate: string | null
  followUpTime: string | null
  assignedTo: string | null
  testRideDate: string | null
  testRideTime: string | null
  saleAmount: number | null
  deliveryDate: string | null
  lostReason: string | null
  statusChangedAt: string
  createdAt: string
  updatedAt: string
}

export interface BackupFile {
  version: 1
  exportedAt: string
  business: {
    name: string
    tagline: string
    phone: string
    email: string
    website: string
    adLandingUrl: string
    address: string
    businessHours: string
    googleReviewUrl: string
  }
  products: Array<{
    kind: ProductKind
    name: string
    sortOrder: number
    active: boolean
  }>
  customers: BackupCustomer[]
  followUps: Array<Omit<FollowUp, 'organizationId'>>
  testRides: Array<Omit<TestRide, 'organizationId'>>
  sales: Array<Omit<Sale, 'organizationId'>>
  activities: Array<Omit<Activity, 'organizationId'>>
}

export interface ImportResult {
  added: number
  skippedDuplicates: number
  invalid: number
  issues: string[]
}
