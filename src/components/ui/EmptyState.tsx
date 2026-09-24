import type { ReactNode } from 'react'

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card px-5 py-8 text-center">
      <p className="font-display text-2xl text-balance">{title}</p>
      {body ? <p className="mt-2 text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
