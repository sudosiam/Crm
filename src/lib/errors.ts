export type DomainCode = 'validation' | 'duplicate' | 'permission' | 'not_found' | 'offline'

export class DomainError extends Error {
  readonly code: DomainCode
  readonly existingId?: string

  constructor(message: string, code: DomainCode, existingId?: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.existingId = existingId
  }
}

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|network|load failed|timeout|offline|fetch/i.test(message)
}

export function humanizeError(error: unknown): string {
  if (error instanceof DomainError) return error.message
  const message = error instanceof Error ? error.message : String(error)
  const tagged = message.match(/BPH_(VALIDATION|DUPLICATE|PERMISSION|NOT_FOUND):\s*([\s\S]*)/)
  if (tagged) {
    if (tagged[1] === 'DUPLICATE') return 'Customer already exists.'
    const text = tagged[2].trim()
    return text || 'Please check the details and try again.'
  }
  if (isNetworkError(error)) {
    return 'Could not reach BPH. Check your connection and try again.'
  }
  if (/jwt|invalid claim|not authenticated|session/i.test(message)) {
    return 'Please sign in again.'
  }
  if (/already belong|already a member/i.test(message)) {
    return 'You already belong to a business.'
  }
  if (/code not recognized|join code/i.test(message)) {
    return 'That team code was not recognized.'
  }
  console.error(error)
  return 'Something went wrong. Please try again.'
}
