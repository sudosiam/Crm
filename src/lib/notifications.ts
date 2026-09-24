import { todayISO } from './dates'

export function notificationSupport(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  const result = await Notification.requestPermission()
  return result
}

export async function maybeNotify(overdue: number, todayCount: number, enabled: boolean) {
  if (!enabled || overdue + todayCount === 0) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const stamp = todayISO()
  if (localStorage.getItem('bph.notified') === stamp) return
  const body = overdue
    ? `${overdue} overdue and ${todayCount} follow-up${todayCount === 1 ? '' : 's'} today.`
    : `${todayCount} follow-up${todayCount === 1 ? '' : 's'} today.`
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification('BPH follow-ups', { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` })
  } else {
    new Notification('BPH follow-ups', { body })
  }
  localStorage.setItem('bph.notified', stamp)
}
