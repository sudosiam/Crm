export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-muted" role="status">
      <span className="size-3 animate-pulse rounded-full bg-brand" aria-hidden="true" />
      {label}
    </div>
  )
}
