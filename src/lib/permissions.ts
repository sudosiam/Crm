import type { Actor, Customer, Role } from './types'

export function canViewCustomer(
  actor: Pick<Actor, 'userId' | 'role' | 'canViewAll'>,
  customer: Pick<Customer, 'assignedTo'>,
): boolean {
  if (actor.role === 'OWNER' || actor.canViewAll) return true
  return customer.assignedTo === actor.userId
}

export function canEditCustomer(
  actor: Pick<Actor, 'userId' | 'role' | 'canViewAll'>,
  customer: Pick<Customer, 'assignedTo'>,
): boolean {
  return canViewCustomer(actor, customer)
}

export function canManageBusiness(actor: Pick<Actor, 'role'>): boolean {
  return actor.role === 'OWNER'
}

export function isOwnerRole(role: Role): boolean {
  return role === 'OWNER'
}
