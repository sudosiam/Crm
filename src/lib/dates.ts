export function todayISO(now = new Date()): string {
  return toISODate(now)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

export function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false
  const [h, m] = value.split(':').map(Number)
  return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return toISODate(dt)
}

export function monthBounds(now = new Date()): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start: toISODate(start), end: toISODate(end) }
}

export function datePart(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const match = time.match(/^(\d{2}):(\d{2})/)
  if (!match) return time
  const hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${suffix}`
}

export function formatDate(isoDate: string | null | undefined, today = todayISO()): string {
  if (!isoDate) return ''
  if (isoDate === today) return 'Today'
  if (isoDate === addDays(today, 1)) return 'Tomorrow'
  if (isoDate === addDays(today, -1)) return 'Yesterday'
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatWhen(
  date: string | null | undefined,
  time: string | null | undefined,
  today = todayISO(),
): string {
  if (!date) return 'No follow-up set'
  const day = formatDate(date, today)
  const clock = formatTime(time)
  return clock ? `${day} · ${clock}` : day
}

export function greeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function timestamp(now = new Date()): string {
  return now.toISOString()
}
