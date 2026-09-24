import type { ReactNode } from 'react'

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card px-3 py-4 text-center">
      <p className="font-semibold text-balance">{title}</p>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
