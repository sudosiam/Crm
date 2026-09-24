import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BPH } from '../lib/business'

const links = [
  { to: '/test-rides', label: 'Test rides', detail: 'Today and upcoming' },
  { to: '/sales', label: 'Sales', detail: 'Sold and lost this month' },
  { to: '/settings', label: 'Settings', detail: 'Business, team, backup' },
]

export function MorePage() {
  return (
    <div>
      <h1 className="page-title">More</h1>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="flex items-center justify-between border-b border-line px-3 py-2.5 last:border-b-0">
            <span>
              <span className="block font-semibold">{link.label}</span>
              <span className="text-sm text-muted">{link.detail}</span>
            </span>
            <ChevronRight className="size-5 text-muted" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">{BPH.name}<br />{BPH.phone}<br />{BPH.businessHours}</p>
    </div>
  )
}
