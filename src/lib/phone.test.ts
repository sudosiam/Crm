import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone, telUrl, whatsAppUrl } from './phone'

describe('phone numbers', () => {
  it('accepts a 10-digit mobile and +91', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210')
    expect(normalizePhone('+91 96355 05436')).toBe('9635505436')
    expect(normalizePhone('09876543210')).toBe('9876543210')
  })

  it('rejects short or invalid numbers', () => {
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('5876543210')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })

  it('builds call and WhatsApp links without sending anything', () => {
    expect(telUrl('9876543210')).toBe('tel:+919876543210')
    expect(whatsAppUrl('9876543210', 'Hello')).toBe('https://wa.me/919876543210?text=Hello')
    expect(formatPhone('9876543210')).toBe('98765 43210')
  })
})
