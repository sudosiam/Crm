import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { customersToCsv, memberName, queryCustomers, summarizeDashboard } from '../customers'
import { DomainError, humanizeError, isNetworkError } from '../errors'
import { buildBackup, parseBackup } from '../importExport'
import { createId } from '../ids'
import {
  completeFollowUp,
  createCustomer,
  deleteCustomer,
  findPhoneMatch,
  markLost,
  recordSale,
  saveProduct,
  scheduleFollowUp,
  scheduleTestRide,
  setGoogleReviewUrl,
  setMyNotifications,
  setTestRideStatus,
  updateBusiness,
  updateCustomer,
  updateMyProfile,
  visibleCustomer,
} from '../mutations'
import type {
  Actor,
  BackupFile,
  BusinessInput,
  Customer,
  CustomerInput,
  CustomerPatch,
  CustomerQuery,
  DashboardData,
  FollowUpInput,
  ImportResult,
  Page,
  PhoneMatch,
  ProductKind,
  SaleInput,
  SessionUser,
  TestRideInput,
  TestRideStatus,
  WorkspaceData,
} from '../types'
import { appRootUrl } from '../url'
import { mapActivity, mapCustomer, mapFollowUp, mapMember, mapOrganization, mapProduct, mapSale, mapTestRide } from './map'
import type { Repository } from './repository'
import type { Kv } from './storage'

const CACHE_KEY = 'bph.supabase-cache.v1'

type PendingOp =
  | { id: string; type: 'createCustomer'; customerId: string; input: CustomerInput; allowDuplicate: boolean }
  | { id: string; type: 'updateCustomer'; customerId: string; patch: CustomerPatch; allowDuplicate: boolean }
  | { id: string; type: 'scheduleFollowUp'; customerId: string; input: FollowUpInput }
  | { id: string; type: 'completeFollowUp'; customerId: string; followUpId?: string }
  | { id: string; type: 'scheduleTestRide'; customerId: string; input: TestRideInput }
  | { id: string; type: 'setTestRideStatus'; testRideId: string; status: 'COMPLETED' | 'CANCELLED' }
  | { id: string; type: 'recordSale'; saleId: string; customerId: string; input: SaleInput }
  | { id: string; type: 'markLost'; customerId: string; reason: string; notes?: string | null }
  | { id: string; type: 'deleteCustomer'; customerId: string }
  | { id: string; type: 'updateBusiness'; input: BusinessInput }
  | { id: string; type: 'setGoogleReviewUrl'; url: string }
  | { id: string; type: 'setMyNotifications'; enabled: boolean }
  | { id: string; type: 'updateMyProfile'; fullName: string; phone: string }
  | { id: string; type: 'saveProduct'; productId: string; input: { id?: string; kind: ProductKind; name: string; active?: boolean } }

interface CacheFile {
  userId: string
  workspace: WorkspaceData | null
  queue: PendingOp[]
}

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const
  private workspace: WorkspaceData | null = null
  private queue: PendingOp[] = []
  private user: SessionUser | null = null
  private offline = false
  private channel: RealtimeChannel | null = null
  private reloadTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<(user: SessionUser | null) => void>()
  private dataListeners = new Set<() => void>()
  private readonly client: SupabaseClient
  private readonly kv: Kv

  constructor(client: SupabaseClient, kv: Kv) {
    this.client = client
    this.kv = kv
    this.client.auth.onAuthStateChange(() => {
      void this.reload().catch(() => undefined)
    })
  }

  private persist() {
    if (!this.user) {
      this.kv.removeItem(CACHE_KEY)
      return
    }
    const file: CacheFile = { userId: this.user.id, workspace: this.workspace, queue: this.queue }
    this.kv.setItem(CACHE_KEY, JSON.stringify(file))
  }

  private restore(userId: string) {
    const raw = this.kv.getItem(CACHE_KEY)
    if (!raw) return
    try {
      const file = JSON.parse(raw) as CacheFile
      if (file.userId !== userId) return
      this.workspace = file.workspace
      this.queue = file.queue ?? []
    } catch {
      this.kv.removeItem(CACHE_KEY)
    }
  }

  private emit() {
    for (const listener of this.listeners) listener(this.user)
    for (const listener of this.dataListeners) listener()
  }

  actor(): Actor | null {
    if (!this.user || !this.workspace) return null
    const member = this.workspace.members.find((item) => item.userId === this.user?.id)
    if (!member) return null
    return { userId: member.userId, role: member.role, canViewAll: member.canViewAll, fullName: member.fullName }
  }

  private requireActor(): Actor {
    const actor = this.actor()
    if (!actor) throw new DomainError('Join the business before continuing.', 'permission')
    return actor
  }

  private requireWorkspace(): WorkspaceData {
    if (!this.workspace) throw new DomainError('Business data is not on this phone yet.', 'offline')
    return this.workspace
  }

  snapshot(): WorkspaceData | null {
    return this.workspace ? structuredClone(this.workspace) : null
  }

  isOffline() {
    return this.offline || (typeof navigator !== 'undefined' && navigator.onLine === false)
  }

  pendingCount() {
    return this.queue.length
  }

  async getSession() {
    const { data } = await this.client.auth.getSession()
    const sessionUser = data.session?.user
    if (!sessionUser) {
      this.user = null
      return null
    }
    const meta = sessionUser.user_metadata?.full_name
    this.user = {
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      fullName: typeof meta === 'string' && meta ? meta : (sessionUser.email?.split('@')[0] ?? 'User'),
    }
    return this.user
  }

  onAuth(listener: (user: SessionUser | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  subscribe(listener: () => void) {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(error.message)
    await this.reload()
  }

  async signUp(email: string, password: string, fullName: string) {
    if (!fullName.trim()) throw new DomainError('Enter your name.', 'validation')
    if (password.length < 8) throw new DomainError('Use at least 8 characters for the password.', 'validation')
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() }, emailRedirectTo: appRootUrl() },
    })
    if (error) throw new Error(error.message)
    if (data.session) await this.reload()
    return { needsEmailConfirmation: !data.session }
  }

  async signOut() {
    this.channel?.unsubscribe()
    this.channel = null
    this.workspace = null
    this.queue = []
    this.user = null
    this.kv.removeItem(CACHE_KEY)
    await this.client.auth.signOut()
    this.emit()
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), { redirectTo: appRootUrl() })
    if (error) throw new Error(error.message)
  }

  async updatePassword(password: string) {
    if (password.length < 8) throw new DomainError('Use at least 8 characters for the password.', 'validation')
    const { error } = await this.client.auth.updateUser({ password })
    if (error) throw new Error(error.message)
    sessionStorage.removeItem('bph.recovery')
  }

  async reload() {
    try {
      const session = await this.getSession()
      if (!session) {
        this.workspace = null
        this.queue = []
        this.offline = false
        this.emit()
        return
      }
      this.restore(session.id)
      const fresh = await this.fetchWorkspace(session)
      this.workspace = fresh
      if (this.workspace && this.queue.length) this.reapply()
      this.offline = false
      this.persist()
      if (fresh) this.listen(fresh.organization.id)
      this.emit()
    } catch (error) {
      if (isNetworkError(error) && this.user) {
        this.restore(this.user.id)
        this.offline = true
        this.emit()
        return
      }
      throw error
    }
  }

  private listen(orgId: string) {
    this.channel?.unsubscribe()
    this.channel = this.client
      .channel(`bph-${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `organization_id=eq.${orgId}` }, () => this.scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups', filter: `organization_id=eq.${orgId}` }, () => this.scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_rides', filter: `organization_id=eq.${orgId}` }, () => this.scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `organization_id=eq.${orgId}` }, () => this.scheduleReload())
      .subscribe()
  }

  private scheduleReload() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer)
    this.reloadTimer = setTimeout(() => {
      void this.reload().catch(() => undefined)
    }, 400)
  }

  private async fetchWorkspace(session: SessionUser): Promise<WorkspaceData | null> {
    const { data: membership, error: memberError } = await this.client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.id)
      .maybeSingle()
    if (memberError) throw new Error(memberError.message)
    if (!membership) return null
    const orgId = String(membership.organization_id)
    const [organization, members, products, customers, followUps, testRides, sales] = await Promise.all([
      this.one('organizations', orgId),
      this.paged((from, to) => this.client.from('organization_members').select('*, profiles(full_name, phone, email)').eq('organization_id', orgId).range(from, to)),
      this.paged((from, to) => this.client.from('products').select('*').eq('organization_id', orgId).order('sort_order').range(from, to)),
      this.paged((from, to) => this.client.from('customers').select('*').eq('organization_id', orgId).range(from, to)),
      this.paged((from, to) => this.client.from('follow_ups').select('*').eq('organization_id', orgId).range(from, to)),
      this.paged((from, to) => this.client.from('test_rides').select('*').eq('organization_id', orgId).range(from, to)),
      this.paged((from, to) => this.client.from('sales').select('*').eq('organization_id', orgId).range(from, to)),
    ])
    const { data: activities, error: activityError } = await this.client
      .from('activity_logs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (activityError) throw new Error(activityError.message)
    return {
      organization: mapOrganization(organization),
      members: members.map((row) => mapMember(row)),
      products: products.map((row) => mapProduct(row)),
      customers: customers.map((row) => mapCustomer(row)),
      followUps: followUps.map((row) => mapFollowUp(row)),
      testRides: testRides.map((row) => mapTestRide(row)),
      sales: sales.map((row) => mapSale(row)),
      activities: (activities ?? []).map((row) => mapActivity(row as Record<string, unknown>)),
    }
  }

  private async one(table: string, id: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.client.from(table).select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data as Record<string, unknown>
  }

  private async paged(
    load: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  ): Promise<Record<string, unknown>[]> {
    const size = 1000
    const rows: Record<string, unknown>[] = []
    for (let from = 0; ; from += size) {
      const { data, error } = await load(from, from + size - 1)
      if (error) throw new Error(error.message)
      const page = (data ?? []) as Record<string, unknown>[]
      rows.push(...page)
      if (page.length < size) break
    }
    return rows
  }

  private reapply() {
    const actor = this.actor()
    if (!actor || !this.workspace) return
    for (const op of this.queue) {
      try {
        this.apply(op, actor)
      } catch {
        // The server copy remains visible if a queued change no longer applies.
      }
    }
  }

  private apply(op: PendingOp, actor: Actor) {
    const data = this.requireWorkspace()
    switch (op.type) {
      case 'createCustomer':
        createCustomer(data, actor, op.input, { id: op.customerId, allowDuplicate: op.allowDuplicate })
        break
      case 'updateCustomer':
        updateCustomer(data, actor, op.customerId, op.patch, { allowDuplicate: op.allowDuplicate })
        break
      case 'scheduleFollowUp':
        scheduleFollowUp(data, actor, op.customerId, op.input)
        break
      case 'completeFollowUp':
        completeFollowUp(data, actor, op.customerId, op.followUpId)
        break
      case 'scheduleTestRide':
        scheduleTestRide(data, actor, op.customerId, op.input)
        break
      case 'setTestRideStatus':
        setTestRideStatus(data, actor, op.testRideId, op.status)
        break
      case 'recordSale':
        recordSale(data, actor, op.customerId, op.input, { id: op.saleId })
        break
      case 'markLost':
        markLost(data, actor, op.customerId, op.reason, op.notes)
        break
      case 'deleteCustomer':
        deleteCustomer(data, actor, op.customerId)
        break
      case 'updateBusiness':
        updateBusiness(data, actor, op.input)
        break
      case 'setGoogleReviewUrl':
        setGoogleReviewUrl(data, actor, op.url)
        break
      case 'setMyNotifications':
        setMyNotifications(data, actor, op.enabled)
        break
      case 'updateMyProfile':
        updateMyProfile(data, actor, op.fullName, op.phone)
        break
      case 'saveProduct':
        saveProduct(data, actor, { ...op.input, id: op.productId })
        break
      default:
        break
    }
  }

  private async send(op: PendingOp) {
    const fail = (error: { message: string } | null) => {
      if (error) throw new Error(error.message)
    }
    switch (op.type) {
      case 'createCustomer':
        fail((await this.client.rpc('create_customer', this.customerArgs(op.customerId, op.input, op.allowDuplicate))).error)
        break
      case 'updateCustomer': {
        const current = this.requireWorkspace().customers.find((customer) => customer.id === op.customerId)
        if (!current) throw new DomainError('That customer could not be found.', 'not_found')
        const next = { ...current, ...op.patch }
        fail((await this.client.rpc('update_customer', {
          p_id: op.customerId,
          p_name: next.name,
          p_phone: next.phone,
          p_status: next.status === 'SOLD' || next.status === 'LOST' ? null : (op.patch.status ?? next.status),
          p_enquiry_date: next.enquiryDate,
          p_model: next.model,
          p_battery: next.batteryConfiguration,
          p_budget: next.budget,
          p_source: next.source,
          p_notes: next.notes,
          p_assigned_to: next.assignedTo,
          p_allow_duplicate: op.allowDuplicate,
        })).error)
        break
      }
      case 'scheduleFollowUp':
        fail((await this.client.rpc('schedule_follow_up', {
          p_customer_id: op.customerId,
          p_date: op.input.date,
          p_time: op.input.time ?? null,
          p_notes: op.input.notes ?? null,
          p_assigned_to: op.input.assignedTo ?? null,
        })).error)
        break
      case 'completeFollowUp':
        fail((await this.client.rpc('complete_follow_up', {
          p_customer_id: op.customerId,
          p_follow_up_id: op.followUpId ?? null,
        })).error)
        break
      case 'scheduleTestRide':
        fail((await this.client.rpc('schedule_test_ride', {
          p_customer_id: op.customerId,
          p_date: op.input.date,
          p_time: op.input.time ?? null,
          p_model: op.input.model ?? null,
          p_notes: op.input.notes ?? null,
          p_assigned_to: op.input.assignedTo ?? null,
        })).error)
        break
      case 'setTestRideStatus':
        fail((await this.client.rpc('set_test_ride_status', { p_id: op.testRideId, p_status: op.status })).error)
        break
      case 'recordSale':
        fail((await this.client.rpc('record_sale', {
          p_sale_id: op.saleId,
          p_customer_id: op.customerId,
          p_model: op.input.model ?? null,
          p_battery: op.input.batteryConfiguration ?? null,
          p_sale_amount: op.input.saleAmount ?? null,
          p_delivery_date: op.input.deliveryDate ?? null,
          p_notes: op.input.notes ?? null,
        })).error)
        break
      case 'markLost':
        fail((await this.client.rpc('mark_lost', {
          p_customer_id: op.customerId,
          p_reason: op.reason,
          p_notes: op.notes ?? null,
        })).error)
        break
      case 'deleteCustomer':
        fail((await this.client.rpc('delete_customer', { p_id: op.customerId })).error)
        break
      case 'updateBusiness':
        fail((await this.client.rpc('update_business', this.businessArgs(op.input))).error)
        break
      case 'setGoogleReviewUrl':
        fail((await this.client.rpc('set_google_review_url', { p_url: op.url })).error)
        break
      case 'setMyNotifications':
        fail((await this.client.rpc('set_my_notifications', { p_enabled: op.enabled })).error)
        break
      case 'updateMyProfile': {
        const phone = op.phone.trim()
        fail((await this.client.from('profiles').update({ full_name: op.fullName.trim(), phone: phone || null }).eq('id', this.user?.id ?? '')).error)
        break
      }
      case 'saveProduct':
        fail((await this.client.rpc('upsert_product', {
          p_id: op.productId,
          p_kind: op.input.kind,
          p_name: op.input.name,
          p_sort_order: 0,
          p_active: op.input.active ?? true,
        })).error)
        break
      default:
        break
    }
  }

  private customerArgs(id: string, input: CustomerInput, allowDuplicate: boolean) {
    return {
      p_id: id,
      p_name: input.name,
      p_phone: input.phone,
      p_status: input.status ?? null,
      p_enquiry_date: input.enquiryDate ?? null,
      p_model: input.model ?? null,
      p_battery: input.batteryConfiguration ?? null,
      p_budget: input.budget ?? null,
      p_source: input.source ?? null,
      p_notes: input.notes ?? null,
      p_follow_up_date: input.followUpDate ?? null,
      p_follow_up_time: input.followUpTime ?? null,
      p_assigned_to: input.assignedTo ?? null,
      p_allow_duplicate: allowDuplicate,
    }
  }

  private businessArgs(input: BusinessInput) {
    return {
      p_name: input.name,
      p_tagline: input.tagline,
      p_phone: input.phone,
      p_email: input.email,
      p_website: input.website,
      p_ad_landing_url: input.adLandingUrl,
      p_address: input.address,
      p_business_hours: input.businessHours,
    }
  }

  private async run(op: PendingOp): Promise<void> {
    if (this.isOffline()) {
      this.apply(op, this.requireActor())
      this.queue.push(op)
      this.offline = true
      this.persist()
      this.emit()
      return
    }
    try {
      await this.send(op)
      await this.reload()
    } catch (error) {
      if (isNetworkError(error)) {
        this.apply(op, this.requireActor())
        this.queue.push(op)
        this.offline = true
        this.persist()
        this.emit()
        return
      }
      throw error
    }
  }

  async flush() {
    if (this.isOffline() || this.queue.length === 0) return null
    const pending = [...this.queue]
    this.queue = []
    let failure: string | null = null
    for (const op of pending) {
      try {
        await this.send(op)
      } catch (error) {
        if (isNetworkError(error)) {
          this.queue.push(op, ...pending.slice(pending.indexOf(op) + 1))
          this.offline = true
          failure = 'Still offline. Changes remain on this phone.'
          break
        }
        failure = humanizeError(error)
      }
    }
    try {
      await this.reload()
    } catch (error) {
      if (isNetworkError(error)) this.offline = true
    }
    this.persist()
    this.emit()
    return failure
  }

  async createBusiness(input: BusinessInput) {
    const { error } = await this.client.rpc('create_business', this.businessArgs(input))
    if (error) throw new Error(error.message)
    await this.reload()
  }

  async joinBusiness(code: string) {
    const { error } = await this.client.rpc('join_business', { p_code: code })
    if (error) throw new Error(error.message)
    await this.reload()
  }

  async updateBusiness(input: BusinessInput) {
    await this.run({ id: createId(), type: 'updateBusiness', input })
  }

  async setGoogleReviewUrl(url: string) {
    await this.run({ id: createId(), type: 'setGoogleReviewUrl', url })
  }

  async rotateJoinCode() {
    if (this.isOffline()) throw new DomainError('You need a connection to change the team code.', 'offline')
    const { data, error } = await this.client.rpc('rotate_join_code')
    if (error) throw new Error(error.message)
    await this.reload()
    return String(data)
  }

  async updateMember(memberId: string, patch: { role?: 'OWNER' | 'STAFF'; canViewAll?: boolean }) {
    if (this.isOffline()) throw new DomainError('You need a connection to change the team.', 'offline')
    const { error } = await this.client.rpc('update_member', {
      p_member_id: memberId,
      p_role: patch.role ?? null,
      p_can_view_all: patch.canViewAll ?? null,
    })
    if (error) throw new Error(error.message)
    await this.reload()
  }

  async removeMember(memberId: string) {
    if (this.isOffline()) throw new DomainError('You need a connection to change the team.', 'offline')
    const { error } = await this.client.rpc('remove_member', { p_member_id: memberId })
    if (error) throw new Error(error.message)
    await this.reload()
  }

  async setMyNotifications(enabled: boolean) {
    await this.run({ id: createId(), type: 'setMyNotifications', enabled })
  }

  async updateMyProfile(fullName: string, phone: string) {
    await this.run({ id: createId(), type: 'updateMyProfile', fullName, phone })
  }

  async saveProduct(input: { id?: string; kind: ProductKind; name: string; active?: boolean }) {
    const productId = input.id ?? createId()
    await this.run({ id: createId(), type: 'saveProduct', productId, input })
    return (
      this.workspace?.products.find((product) => product.id === productId) ?? {
        id: productId,
        organizationId: this.workspace?.organization.id ?? '',
        kind: input.kind,
        name: input.name,
        sortOrder: 0,
        active: input.active ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )
  }

  async moveProduct(productId: string, direction: -1 | 1) {
    if (this.isOffline()) throw new DomainError('You need a connection to reorder products.', 'offline')
    const products = [...(this.workspace?.products ?? [])]
    const product = products.find((item) => item.id === productId)
    if (!product) throw new DomainError('That product could not be found.', 'not_found')
    const siblings = products.filter((item) => item.kind === product.kind).sort((a, b) => a.sortOrder - b.sortOrder)
    const index = siblings.findIndex((item) => item.id === productId)
    const swap = siblings[index + direction]
    if (!swap) return
    const first = await this.client.from('products').update({ sort_order: swap.sortOrder }).eq('id', product.id)
    if (first.error) throw new Error(first.error.message)
    const second = await this.client.from('products').update({ sort_order: product.sortOrder }).eq('id', swap.id)
    if (second.error) throw new Error(second.error.message)
    await this.reload()
  }

  async dashboard(): Promise<DashboardData> {
    const actor = this.requireActor()
    const data = this.requireWorkspace()
    return summarizeDashboard(data.customers, data.testRides, actor)
  }

  async listCustomers(query: CustomerQuery): Promise<Page<Customer>> {
    const actor = this.requireActor()
    return queryCustomers(this.requireWorkspace().customers, actor, query)
  }

  async getCustomer(id: string) {
    const actor = this.requireActor()
    const data = this.requireWorkspace()
    const customer = visibleCustomer(data, actor, id)
    let activities = data.activities.filter((item) => item.customerId === id)
    if (!this.isOffline()) {
      const { data: rows, error } = await this.client
        .from('activity_logs')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
      if (!error && rows) {
        activities = rows.map((row) => mapActivity(row as Record<string, unknown>))
        this.workspace = {
          ...data,
          activities: [...data.activities.filter((item) => item.customerId !== id), ...activities],
        }
      }
    }
    return {
      customer,
      followUps: data.followUps.filter((item) => item.customerId === id),
      testRides: data.testRides.filter((item) => item.customerId === id),
      sales: data.sales.filter((item) => item.customerId === id),
      activities: activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  }

  async findByPhone(phone: string, exceptId?: string): Promise<PhoneMatch> {
    const actor = this.requireActor()
    if (this.isOffline()) return findPhoneMatch(this.requireWorkspace(), actor, phone, exceptId)
    const { data, error } = await this.client.rpc('find_customer_by_phone', { p_phone: phone })
    if (error) {
      if (isNetworkError(error)) return findPhoneMatch(this.requireWorkspace(), actor, phone, exceptId)
      throw new Error(error.message)
    }
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return { state: 'none' }
    if (!row.is_visible) return { state: 'hidden' }
    if (exceptId && row.customer_id === exceptId) return { state: 'none' }
    const customer = this.workspace?.customers.find((item) => item.id === row.customer_id)
    if (!customer) return { state: 'hidden' }
    return { state: 'visible', customer }
  }

  async createCustomer(input: CustomerInput, options?: { allowDuplicate?: boolean; id?: string }) {
    const customerId = options?.id ?? createId()
    await this.run({
      id: createId(),
      type: 'createCustomer',
      customerId,
      input,
      allowDuplicate: options?.allowDuplicate ?? false,
    })
    const customer = this.workspace?.customers.find((item) => item.id === customerId)
    if (!customer) throw new DomainError('Customer added. It may be assigned to someone else.', 'permission')
    return customer
  }

  async updateCustomer(id: string, patch: CustomerPatch, options?: { allowDuplicate?: boolean }) {
    await this.run({ id: createId(), type: 'updateCustomer', customerId: id, patch, allowDuplicate: options?.allowDuplicate ?? false })
    const customer = this.workspace?.customers.find((item) => item.id === id)
    if (!customer) throw new DomainError('Customer saved.', 'permission')
    return customer
  }

  async scheduleFollowUp(customerId: string, input: FollowUpInput) {
    await this.run({ id: createId(), type: 'scheduleFollowUp', customerId, input })
  }

  async completeFollowUp(customerId: string, followUpId?: string) {
    await this.run({ id: createId(), type: 'completeFollowUp', customerId, followUpId })
  }

  async scheduleTestRide(customerId: string, input: TestRideInput) {
    await this.run({ id: createId(), type: 'scheduleTestRide', customerId, input })
  }

  async setTestRideStatus(testRideId: string, status: Extract<TestRideStatus, 'COMPLETED' | 'CANCELLED'>) {
    await this.run({ id: createId(), type: 'setTestRideStatus', testRideId, status })
  }

  async recordSale(customerId: string, input: SaleInput) {
    await this.run({ id: createId(), type: 'recordSale', saleId: createId(), customerId, input })
  }

  async markLost(customerId: string, reason: string, notes?: string | null) {
    await this.run({ id: createId(), type: 'markLost', customerId, reason, notes })
  }

  async deleteCustomer(customerId: string) {
    await this.run({ id: createId(), type: 'deleteCustomer', customerId })
  }

  async exportBackup(): Promise<BackupFile> {
    const actor = this.requireActor()
    if (actor.role !== 'OWNER') throw new DomainError('Only the owner can export data.', 'permission')
    const data = this.snapshot()
    if (!data) throw new DomainError('Nothing to export yet.', 'validation')
    return buildBackup(data, new Date().toISOString())
  }

  async exportCsv() {
    const actor = this.requireActor()
    if (actor.role !== 'OWNER') throw new DomainError('Only the owner can export data.', 'permission')
    const data = this.snapshot()
    return customersToCsv(data?.customers ?? [], (id) => memberName(data?.members ?? [], id))
  }

  async importBackup(raw: unknown): Promise<ImportResult> {
    if (this.isOffline()) throw new DomainError('Import needs a connection.', 'offline')
    const actor = this.requireActor()
    if (actor.role !== 'OWNER') throw new DomainError('Only the owner can import data.', 'permission')
    const parsed = parseBackup(raw)
    const result: ImportResult = { added: 0, skippedDuplicates: 0, invalid: parsed.issues.length, issues: [...parsed.issues] }
    for (const product of parsed.products) {
      const exists = this.workspace?.products.some(
        (item) => item.kind === product.kind && item.name.toLowerCase() === product.name.toLowerCase(),
      )
      if (exists) continue
      const { error } = await this.client.rpc('upsert_product', {
        p_id: createId(),
        p_kind: product.kind,
        p_name: product.name,
        p_sort_order: product.sortOrder,
        p_active: product.active,
      })
      if (error) result.issues.push(`${product.name} was not added.`)
    }
    for (const customer of parsed.customers) {
      const match = await this.findByPhone(customer.phone)
      if (match.state !== 'none') {
        result.skippedDuplicates += 1
        continue
      }
      const id = createId()
      const closed = customer.status === 'SOLD' || customer.status === 'LOST'
      const { error } = await this.client.rpc('create_customer', this.customerArgs(id, {
        name: customer.name,
        phone: customer.phone,
        status: closed ? 'NEW' : customer.status,
        enquiryDate: customer.enquiryDate,
        model: customer.model,
        batteryConfiguration: customer.batteryConfiguration,
        budget: customer.budget,
        source: customer.source,
        notes: customer.notes,
        followUpDate: closed ? null : customer.followUpDate,
        followUpTime: closed ? null : customer.followUpTime,
        assignedTo: customer.assignedTo,
      }, false))
      if (error) {
        if (error.message.includes('BPH_DUPLICATE')) result.skippedDuplicates += 1
        else result.issues.push(`${customer.name} was not imported.`)
        continue
      }
      if (customer.status === 'TEST_RIDE' && customer.testRideDate) {
        await this.client.rpc('schedule_test_ride', {
          p_customer_id: id,
          p_date: customer.testRideDate,
          p_time: customer.testRideTime,
          p_model: customer.model,
          p_notes: null,
          p_assigned_to: customer.assignedTo,
        })
      }
      if (customer.status === 'SOLD') {
        await this.client.rpc('record_sale', {
          p_sale_id: createId(),
          p_customer_id: id,
          p_model: customer.model,
          p_battery: customer.batteryConfiguration,
          p_sale_amount: customer.saleAmount,
          p_delivery_date: customer.deliveryDate,
          p_notes: null,
        })
      }
      if (customer.status === 'LOST' && customer.lostReason) {
        await this.client.rpc('mark_lost', { p_customer_id: id, p_reason: customer.lostReason, p_notes: null })
      }
      result.added += 1
    }
    await this.reload()
    return result
  }

  async resetDemo() {
    throw new DomainError('Demo data is only used when Supabase is not connected.', 'validation')
  }
}
