import type { ReactNode } from 'react'

export function MetricCard({
  label,
  value,
  tone = 'default',
  onClick,
}: {
  label: string
  value: number
  tone?: 'default' | 'warning'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card px-3 py-3 text-left ${tone === 'warning' && value > 0 ? 'ring-2 ring-warning' : ''}`}
    >
      <span className={`block font-display text-3xl leading-none ${tone === 'warning' && value > 0 ? 'text-warning' : ''}`}>{value}</span>
      <span className="mt-1 block text-sm text-muted">{label}</span>
    </button>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-2xl">{children}</h2>
      {action}
    </div>
  )
}
