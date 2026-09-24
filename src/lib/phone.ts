/** Indian mobile numbers. Accepts spaces, +91, or a leading 0. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  let national = digits
  if (national.length === 12 && national.startsWith('91')) national = national.slice(2)
  else if (national.length === 11 && national.startsWith('0')) national = national.slice(1)
  if (!/^[6-9]\d{9}$/.test(national)) return null
  return national
}

export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone) ?? phone.replace(/\D/g, '')
  if (normalized.length !== 10) return phone.trim()
  return `${normalized.slice(0, 5)} ${normalized.slice(5)}`
}

export function telUrl(phone: string): string | null {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  return `tel:+91${normalized}`
}

export function whatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  const text = message.trim()
  const base = `https://wa.me/91${normalized}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
