import { customersToCsv, memberName, queryCustomers, summarizeDashboard } from '../customers'
import { applyImport, buildBackup } from '../importExport'
import { DomainError } from '../errors'
import {
  completeFollowUp,
  createBusinessRecord,
  createCustomer,
  deleteCustomer,
  joinBusinessRecord,
  markLost,
  moveProduct,
  recordSale,
  removeMember,
  rotateJoinCode,
  saveProduct,
  scheduleFollowUp,
  scheduleTestRide,
  setGoogleReviewUrl,
  setMyNotifications,
  setTestRideStatus,
  updateBusiness,
  updateCustomer,
  updateMemberAccess,
  updateMyProfile,
  visibleCustomer,
  findPhoneMatch,
} from '../mutations'
import { canViewCustomer } from '../permissions'
import type {
  Actor,
  BackupFile,
  BusinessInput,
  Customer,
  CustomerInput,
  CustomerPatch,
  CustomerBundle,
  CustomerQuery,
  DashboardData,
  FollowUpInput,
  ImportResult,
  Page,
  PhoneMatch,
  Product,
  ProductKind,
  SaleInput,
  SessionUser,
  TestRideInput,
  TestRideStatus,
  WorkspaceData,
} from '../types'
import { buildDemoState, type DemoState, type DemoUser } from './demoData'
import type { Kv } from './storage'

const DEMO_KEY = 'bph.demo.v1'

export interface Repository {
  readonly mode: 'demo' | 'supabase'
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, fullName: string): Promise<{ needsEmailConfirmation: boolean }>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  getSession(): Promise<SessionUser | null>
  onAuth(listener: (user: SessionUser | null) => void): () => void
  snapshot(): WorkspaceData | null
  actor(): Actor | null
  reload(): Promise<void>
  createBusiness(input: BusinessInput): Promise<void>
  joinBusiness(code: string): Promise<void>
  updateBusiness(input: BusinessInput): Promise<void>
  setGoogleReviewUrl(url: string): Promise<void>
  rotateJoinCode(): Promise<string>
  updateMember(memberId: string, patch: { role?: 'OWNER' | 'STAFF'; canViewAll?: boolean }): Promise<void>
  removeMember(memberId: string): Promise<void>
  setMyNotifications(enabled: boolean): Promise<void>
  updateMyProfile(fullName: string, phone: string): Promise<void>
  saveProduct(input: { id?: string; kind: ProductKind; name: string; active?: boolean }): Promise<Product>
  moveProduct(productId: string, direction: -1 | 1): Promise<void>
  dashboard(): Promise<DashboardData>
  listCustomers(query: CustomerQuery): Promise<Page<Customer>>
  getCustomer(id: string): Promise<CustomerBundle>
  findByPhone(phone: string, exceptId?: string): Promise<PhoneMatch>
  createCustomer(input: CustomerInput, options?: { allowDuplicate?: boolean; id?: string }): Promise<Customer>
  updateCustomer(id: string, patch: CustomerPatch, options?: { allowDuplicate?: boolean }): Promise<Customer>
  scheduleFollowUp(customerId: string, input: FollowUpInput): Promise<void>
  completeFollowUp(customerId: string, followUpId?: string): Promise<void>
  scheduleTestRide(customerId: string, input: TestRideInput): Promise<void>
  setTestRideStatus(testRideId: string, status: Extract<TestRideStatus, 'COMPLETED' | 'CANCELLED'>): Promise<void>
  recordSale(customerId: string, input: SaleInput): Promise<void>
  markLost(customerId: string, reason: string, notes?: string | null): Promise<void>
  deleteCustomer(customerId: string): Promise<void>
  exportBackup(): Promise<BackupFile>
  exportCsv(): Promise<string>
  importBackup(raw: unknown): Promise<ImportResult>
  pendingCount(): number
  flush(): Promise<string | null>
  isOffline(): boolean
  subscribe(listener: () => void): () => void
  resetDemo(): Promise<void>
}

function viewOf(data: WorkspaceData, actor: Actor): WorkspaceData {
  const customers = data.customers.filter((customer) => canViewCustomer(actor, customer))
  const ids = new Set(customers.map((customer) => customer.id))
  return {
    ...data,
    customers,
    followUps: data.followUps.filter((item) => ids.has(item.customerId)),
    testRides: data.testRides.filter((item) => ids.has(item.customerId)),
    sales: data.sales.filter((item) => ids.has(item.customerId)),
    activities: data.activities.filter((item) => ids.has(item.customerId)),
  }
}

export class DemoRepository implements Repository {
  readonly mode = 'demo' as const
  private state: DemoState
  private listeners = new Set<(user: SessionUser | null) => void>()
  private dataListeners = new Set<() => void>()
  private readonly kv: Kv

  constructor(kv: Kv) {
    this.kv = kv
    const saved = kv.getItem(DEMO_KEY)
    this.state = saved ? (JSON.parse(saved) as DemoState) : buildDemoState()
    if (!saved) this.persist()
  }

  private persist() {
    this.kv.setItem(DEMO_KEY, JSON.stringify(this.state))
  }

  private emit() {
    const user = this.currentUser()
    for (const listener of this.listeners) listener(user)
    for (const listener of this.dataListeners) listener()
  }

  private currentDemoUser(): DemoUser | null {
    return this.state.users.find((user) => user.id === this.state.sessionUserId) ?? null
  }

  private currentUser(): SessionUser | null {
    const user = this.currentDemoUser()
    if (!user) return null
    const member = this.state.workspace.members.find((item) => item.userId === user.id)
    return { id: user.id, email: user.email, fullName: member?.fullName ?? user.fullName }
  }

  private requireUser(): DemoUser {
    const user = this.currentDemoUser()
    if (!user) throw new DomainError('Please sign in again.', 'permission')
    return user
  }

  actor(): Actor | null {
    const user = this.currentDemoUser()
    if (!user || !this.state.workspace.organization) return null
    const member = this.state.workspace.members.find((item) => item.userId === user.id)
    if (!member) return null
    return { userId: member.userId, role: member.role, canViewAll: member.canViewAll, fullName: member.fullName }
  }

  private requireActor(): Actor {
    const actor = this.actor()
    if (!actor) throw new DomainError('Join the business before continuing.', 'permission')
    return actor
  }

  snapshot(): WorkspaceData | null {
    const actor = this.actor()
    if (!actor || !this.state.workspace.organization) return null
    return structuredClone(viewOf(this.state.workspace, actor))
  }

  async signIn(email: string, password: string) {
    const user = this.state.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || user.password !== password) {
      throw new DomainError('Email or password is incorrect.', 'validation')
    }
    this.state.sessionUserId = user.id
    this.persist()
    this.emit()
  }

  async signUp(email: string, password: string, fullName: string) {
    const name = fullName.trim()
    if (!name) throw new DomainError('Enter your name.', 'validation')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new DomainError('Enter a valid email.', 'validation')
    if (password.length < 8) throw new DomainError('Use at least 8 characters for the password.', 'validation')
    if (this.state.users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new DomainError('An account with that email already exists.', 'validation')
    }
    const user: DemoUser = { id: crypto.randomUUID(), email: email.trim().toLowerCase(), password, fullName: name }
    this.state.users.push(user)
    this.state.sessionUserId = user.id
    this.persist()
    this.emit()
    return { needsEmailConfirmation: false }
  }

  async signOut() {
    this.state.sessionUserId = null
    this.persist()
    this.emit()
  }

  async requestPasswordReset() {
    throw new DomainError('Password reset emails need Supabase. In demo mode, use the passwords on the sign-in screen.', 'validation')
  }

  async updatePassword(password: string) {
    if (password.length < 8) throw new DomainError('Use at least 8 characters for the password.', 'validation')
    const user = this.requireUser()
    user.password = password
    this.persist()
  }

  async getSession() {
    return this.currentUser()
  }

  onAuth(listener: (user: SessionUser | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  subscribe(listener: () => void) {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  async reload() {
    this.emit()
  }

  async createBusiness(input: BusinessInput) {
    const user = this.requireUser()
    if (this.state.workspace.organization) {
      throw new DomainError('This device already has a business. Join with the team code instead.', 'validation')
    }
    this.state.workspace = createBusinessRecord({ id: user.id, email: user.email, fullName: user.fullName }, input)
    this.persist()
    this.emit()
  }

  async joinBusiness(code: string) {
    const user = this.requireUser()
    if (!this.state.workspace.organization) throw new DomainError('Ask the owner to set up BPH first.', 'validation')
    joinBusinessRecord(this.state.workspace, { id: user.id, email: user.email, fullName: user.fullName }, code)
    this.persist()
    this.emit()
  }

  private change<T>(run: (data: WorkspaceData, actor: Actor) => T): T {
    const actor = this.requireActor()
    const result = run(this.state.workspace, actor)
    this.persist()
    this.emit()
    return result
  }

  async updateBusiness(input: BusinessInput) {
    this.change((data, actor) => updateBusiness(data, actor, input))
  }

  async setGoogleReviewUrl(url: string) {
    this.change((data, actor) => setGoogleReviewUrl(data, actor, url))
  }

  async rotateJoinCode() {
    return this.change((data, actor) => rotateJoinCode(data, actor))
  }

  async updateMember(memberId: string, patch: { role?: 'OWNER' | 'STAFF'; canViewAll?: boolean }) {
    this.change((data, actor) => updateMemberAccess(data, actor, memberId, patch))
  }

  async removeMember(memberId: string) {
    this.change((data, actor) => removeMember(data, actor, memberId))
  }

  async setMyNotifications(enabled: boolean) {
    this.change((data, actor) => setMyNotifications(data, actor, enabled))
  }

  async updateMyProfile(fullName: string, phone: string) {
    const user = this.requireUser()
    this.change((data, actor) => updateMyProfile(data, actor, fullName, phone))
    user.fullName = fullName.trim()
    this.persist()
  }

  async saveProduct(input: { id?: string; kind: ProductKind; name: string; active?: boolean }) {
    return this.change((data, actor) => saveProduct(data, actor, input))
  }

  async moveProduct(productId: string, direction: -1 | 1) {
    this.change((data, actor) => moveProduct(data, actor, productId, direction))
  }

  async dashboard() {
    const actor = this.requireActor()
    return summarizeDashboard(this.state.workspace.customers, this.state.workspace.testRides, actor)
  }

  async listCustomers(query: CustomerQuery) {
    const actor = this.requireActor()
    return queryCustomers(this.state.workspace.customers, actor, query)
  }

  async getCustomer(id: string) {
    const actor = this.requireActor()
    const customer = visibleCustomer(this.state.workspace, actor, id)
    return {
      customer,
      followUps: this.state.workspace.followUps.filter((item) => item.customerId === id),
      testRides: this.state.workspace.testRides.filter((item) => item.customerId === id),
      sales: this.state.workspace.sales.filter((item) => item.customerId === id),
      activities: this.state.workspace.activities
        .filter((item) => item.customerId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  }

  async findByPhone(phone: string, exceptId?: string): Promise<PhoneMatch> {
    const actor = this.requireActor()
    return findPhoneMatch(this.state.workspace, actor, phone, exceptId)
  }

  async createCustomer(input: CustomerInput, options?: { allowDuplicate?: boolean; id?: string }) {
    return this.change((data, actor) => createCustomer(data, actor, input, options))
  }

  async updateCustomer(id: string, patch: CustomerPatch, options?: { allowDuplicate?: boolean }) {
    return this.change((data, actor) => updateCustomer(data, actor, id, patch, options))
  }

  async scheduleFollowUp(customerId: string, input: FollowUpInput) {
    this.change((data, actor) => scheduleFollowUp(data, actor, customerId, input))
  }

  async completeFollowUp(customerId: string, followUpId?: string) {
    this.change((data, actor) => completeFollowUp(data, actor, customerId, followUpId))
  }

  async scheduleTestRide(customerId: string, input: TestRideInput) {
    this.change((data, actor) => scheduleTestRide(data, actor, customerId, input))
  }

  async setTestRideStatus(testRideId: string, status: Extract<TestRideStatus, 'COMPLETED' | 'CANCELLED'>) {
    this.change((data, actor) => setTestRideStatus(data, actor, testRideId, status))
  }

  async recordSale(customerId: string, input: SaleInput) {
    this.change((data, actor) => recordSale(data, actor, customerId, input))
  }

  async markLost(customerId: string, reason: string, notes?: string | null) {
    this.change((data, actor) => markLost(data, actor, customerId, reason, notes))
  }

  async deleteCustomer(customerId: string) {
    this.change((data, actor) => deleteCustomer(data, actor, customerId))
  }

  async exportBackup() {
    const actor = this.requireActor()
    if (actor.role !== 'OWNER') throw new DomainError('Only the owner can export data.', 'permission')
    return buildBackup(this.snapshot() ?? this.state.workspace, new Date().toISOString())
  }

  async exportCsv() {
    const actor = this.requireActor()
    if (actor.role !== 'OWNER') throw new DomainError('Only the owner can export data.', 'permission')
    const view = this.snapshot()
    return customersToCsv(view?.customers ?? [], (id) => memberName(this.state.workspace.members, id))
  }

  async importBackup(raw: unknown) {
    return this.change((data, actor) => applyImport(data, actor, raw))
  }

  pendingCount() {
    return 0
  }

  async flush() {
    return null
  }

  isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false
  }

  async resetDemo() {
    this.state = buildDemoState()
    this.persist()
    this.emit()
  }
}
