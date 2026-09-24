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
  return `flex items-center gap-3 rounded-2xl px-3 py-3 font-semibold ${active ? 'bg-white/15 text-white' : 'text-white/75'}`
}

export function AppShell() {
  const { mode, offline, pending, syncing, sync, workspace } = useApp()
  const location = useLocation()
  const hideNav = location.pathname.includes('/customers/new') || location.pathname.endsWith('/edit')
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-nav p-4 text-brand-ink md:flex">
        <div className="px-2 py-3">
          <p className="font-display text-3xl">BPH</p>
          <p className="text-sm text-white/75">{workspace?.organization.name ?? 'BISWAJIT POWER HUB'}</p>
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => itemClass(isActive)}>
            <Home className="size-5" aria-hidden="true" /> Home
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => itemClass(isActive)}>
            <Users className="size-5" aria-hidden="true" /> Customers
          </NavLink>
          <NavLink to="/follow-ups" className={({ isActive }) => itemClass(isActive)}>
            <CalendarClock className="size-5" aria-hidden="true" /> Follow-ups
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
        <NavLink to="/customers/new" className="btn btn-primary">
          <Plus className="size-5" aria-hidden="true" /> Add customer
        </NavLink>
      </aside>
      <div className="min-w-0">
        <OfflineBanner mode={mode} offline={offline} pending={pending} syncing={syncing} onSync={() => void sync()} />
        <main className={`mx-auto w-full max-w-3xl px-4 pt-4 ${hideNav ? 'pb-8' : 'pb-28'} md:px-8 md:pb-10`}>
          <Outlet />
        </main>
      </div>
      {hideNav ? null : (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] md:hidden" aria-label="Main">
          <ul className="grid grid-cols-5">
            {links.slice(0, 2).map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-xs font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}>
                  <link.icon className="size-5" aria-hidden="true" />
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li className="flex justify-center">
              <NavLink to="/customers/new" aria-label="Add customer" className="mt-[-14px] flex size-14 items-center justify-center rounded-full bg-brand text-brand-ink shadow-lg">
                <Plus className="size-7" aria-hidden="true" />
              </NavLink>
            </li>
            {links.slice(2).map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-xs font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}>
                  <link.icon className="size-5" aria-hidden="true" />
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
