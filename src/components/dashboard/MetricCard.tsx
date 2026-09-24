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
  const alert = tone === 'warning' && value > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card min-h-16 px-2.5 py-2.5 text-left ${alert ? 'border-warning' : ''}`}
    >
      <span className={`block text-2xl font-semibold leading-none tracking-tight tabular-nums ${alert ? 'text-warning' : ''}`}>{value}</span>
      <span className="mt-1 block text-[11px] leading-tight font-medium text-muted">{label}</span>
    </button>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="section-title">{children}</h2>
      {action}
    </div>
  )
}
