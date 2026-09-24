export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card px-5 py-6" role="alert">
      <p className="font-semibold">Something needs attention</p>
      <p className="mt-1 text-muted">{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-secondary mt-4" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
