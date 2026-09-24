import { WifiOff } from 'lucide-react'

export function OfflineBanner({
  mode,
  offline,
  pending,
  syncing,
  onSync,
}: {
  mode: 'demo' | 'supabase'
  offline: boolean
  pending: number
  syncing: boolean
  onSync: () => void
}) {
  if (mode === 'demo') {
    return (
      <div className="bg-nav px-4 py-1.5 text-center text-xs text-brand-ink">
        Demo · data stays on this phone
      </div>
    )
  }
  if (!offline && pending === 0 && !syncing) return null
  return (
    <div className="flex items-center justify-between gap-3 bg-nav px-4 py-2 text-xs leading-snug text-brand-ink">
      <p className="flex items-start gap-2">
        <WifiOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {syncing
          ? 'Syncing…'
          : offline
            ? pending > 0
              ? `${pending} change${pending === 1 ? '' : 's'} saved on this phone. They will sync when you are back online.`
              : 'You are offline. Showing what is saved on this phone.'
            : `${pending} change${pending === 1 ? '' : 's'} waiting to sync.`}
      </p>
      {!offline && pending > 0 ? (
        <button type="button" className="shrink-0 font-semibold underline" onClick={onSync}>
          Sync
        </button>
      ) : null}
    </div>
  )
}
