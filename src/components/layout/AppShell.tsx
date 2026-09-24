import { CalendarClock, Home, Menu, Plus, Users } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { OfflineBanner } from '../ui/OfflineBanner'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', icon: Users, end: false },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarClock, end: false },
  { to: '/more', label: 'More', icon: Menu, end: false },
]

function itemClass(active: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? 'bg-white/15 text-white' : 'text-white/70'}`
}

export function AppShell() {
  const { mode, offline, pending, syncing, sync, workspace } = useApp()
  const location = useLocation()
  const hideNav = location.pathname.includes('/customers/new') || location.pathname.endsWith('/edit')
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-nav p-3 text-brand-ink md:flex">
        <div className="px-2 py-3">
          <p className="text-lg font-semibold tracking-tight">BPH</p>
          <p className="text-xs text-white/60">{workspace?.organization.name ?? 'BISWAJIT POWER HUB'}</p>
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-0.5" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => itemClass(isActive)}>
            <Home className="size-4" aria-hidden="true" /> Home
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => itemClass(isActive)}>
            <Users className="size-4" aria-hidden="true" /> Customers
          </NavLink>
          <NavLink to="/follow-ups" className={({ isActive }) => itemClass(isActive)}>
            <CalendarClock className="size-4" aria-hidden="true" /> Follow-ups
          </NavLink>
          <NavLink to="/test-rides" className={({ isActive }) => itemClass(isActive)}>
            Test rides
          </NavLink>
          <NavLink to="/sales" className={({ isActive }) => itemClass(isActive)}>
            Sales
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => itemClass(isActive)}>
            Settings
          </NavLink>
        </nav>
        <NavLink to="/customers/new" className="btn btn-primary mt-3">
          <Plus className="size-4" aria-hidden="true" /> Add customer
        </NavLink>
      </aside>
      <div className="min-w-0">
        <OfflineBanner mode={mode} offline={offline} pending={pending} syncing={syncing} onSync={() => void sync()} />
        <main className={`mx-auto w-full max-w-3xl px-3 pt-3 ${hideNav ? 'pb-6' : 'pb-16'} md:px-8 md:pb-10`}>
          <Outlet />
        </main>
      </div>
      {hideNav ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Main"
        >
          <ul className="grid h-12 grid-cols-5">
            {links.slice(0, 2).map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `flex h-12 flex-col items-center justify-center gap-px text-[10px] leading-none font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}
                >
                  <link.icon className="size-4" aria-hidden="true" />
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink
                to="/customers/new"
                aria-label="Add customer"
                className="flex h-12 flex-col items-center justify-center gap-px text-[10px] leading-none font-semibold text-brand"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add
              </NavLink>
            </li>
            {links.slice(2).map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `flex h-12 flex-col items-center justify-center gap-px text-[10px] leading-none font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}
                >
                  <link.icon className="size-4" aria-hidden="true" />
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
