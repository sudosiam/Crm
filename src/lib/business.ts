import type { ProductKind } from './types'

export const BPH = {
  name: 'BISWAJIT POWER HUB',
  shortName: 'BPH',
  tagline: 'Powering Every Ride ♻️',
  phone: '+91 96355 05436',
  phoneTel: '+919635505436',
  email: 'biswajitpowerhub@gmail.com',
  website: 'https://biswajitpowerhub.in',
  adLandingUrl: 'https://biswajitpowerhub.in/ad-landing',
  address: 'Chunakhali Bus Stand, Nimtala, Berhampore, Murshidabad, West Bengal 742149',
  businessHours: 'Every day, 9:00 AM – 8:30 PM',
} as const

export const DEFAULT_MODELS = [
  'Single Light',
  'Dubbel Light',
  'Dubbel Light Pro',
  'GT-90 Ola',
  'Activa Pro',
  'Zoom',
  'Metrix 2.0',
  'SPORTZ Pro',
  'Blaze X',
] as const

export const DEFAULT_BATTERIES = [
  'No Battery',
  'Graphine (Acid)',
  'Lithium Battery',
  'Lithium Pro Battery',
] as const

export const DEMO_JOIN_CODE = 'BPHDEMO1'

export function defaultProductList(): Array<{ kind: ProductKind; name: string; sortOrder: number }> {
  return [
    ...DEFAULT_MODELS.map((name, sortOrder) => ({ kind: 'model' as const, name, sortOrder })),
    ...DEFAULT_BATTERIES.map((name, sortOrder) => ({ kind: 'battery' as const, name, sortOrder })),
  ]
}

export interface MessageTemplate {
  id: string
  label: string
  body: string
}

export function messageTemplates(businessName: string): MessageTemplate[] {
  const name = businessName.trim() || BPH.name
  return [
    {
      id: 'follow-up',
      label: 'Follow-up',
      body: `Hello, this is ${name}. We are following up on your electric scooter enquiry. When would be a good time to talk?`,
    },
    {
      id: 'test-ride',
      label: 'Test ride',
      body: `Hello, this is ${name}. Your test ride is scheduled at our showroom (${BPH.address}). Please reply if you need to change the time.`,
    },
    {
      id: 'price',
      label: 'Price enquiry',
      body: `Hello, this is ${name}. Happy to help with your price enquiry. Which model are you considering, and would you like to visit the showroom for a test ride?`,
    },
    {
      id: 'thanks',
      label: 'Thank you',
      body: `Thank you for visiting ${name}. Please tell us if you have any questions about the scooter you enquired about.`,
    },
    {
      id: 'delivery',
      label: 'Delivery',
      body: `Hello from ${name}. This is a message about delivery of your scooter. Please reply if you need to confirm the delivery date.`,
    },
    {
      id: 'review',
      label: 'Review request',
      body: `Thank you for choosing ${name}. We hope you're happy with your new scooter. If you have a moment, we'd really appreciate an honest review of your experience. Thank you! 🙏`,
    },
    {
      id: 'referral',
      label: 'Referral',
      body: `Thank you for choosing ${name}! If any of your friends or family are looking for an electric scooter, we'd be happy to help them with a test ride. ⚡🛵`,
    },
  ]
}

export const STATUS_META: Record<
  'NEW' | 'FOLLOW_UP' | 'TEST_RIDE' | 'SOLD' | 'LOST',
  { label: string; emoji: string; tone: string }
> = {
  NEW: { label: 'New', emoji: '🟡', tone: 'status-new' },
  FOLLOW_UP: { label: 'Follow-up', emoji: '🔵', tone: 'status-follow' },
  TEST_RIDE: { label: 'Test Ride', emoji: '🟣', tone: 'status-ride' },
  SOLD: { label: 'Sold / Delivered', emoji: '🟢', tone: 'status-sold' },
  LOST: { label: 'Lost', emoji: '🔴', tone: 'status-lost' },
}
