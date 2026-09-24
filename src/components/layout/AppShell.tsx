import { Bike, CalendarClock, Home, Menu, Plus, Settings, ShoppingBag, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { OfflineBanner } from '../ui/OfflineBanner'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', icon: Users, end: false },
  { to: '/follow-ups', label: 'Follow-ups', icon: CalendarClock, end: false },
]

const morePaths = ['/more', '/test-rides', '/sales', '/settings']

function itemClass(active: boolean) {
  return `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${active ? 'bg-white/15 text-white' : 'text-white/75'}`
}

function tabClass(active: boolean) {
  return `flex h-12 min-w-0 flex-col items-center justify-center gap-px px-0.5 text-[10px] leading-none font-semibold ${active ? 'text-brand' : 'text-muted'}`
}

function MenuLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <nav className="mt-2 flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Menu">
        <NavLink to="/" end className={({ isActive }) => itemClass(isActive)} onClick={onNavigate}>
          <Home className="size-4" aria-hidden="true" /> Home
        </NavLink>
        <NavLink to="/customers" className={({ isActive }) => itemClass(isActive)} onClick={onNavigate}>
          <Users className="size-4" aria-hidden="true" /> Customers
        </NavLink>
        <NavLink to="/follow-ups" className={({ isActive }) => itemClass(isActive)} onClick={onNavigate}>
          <CalendarClock className="size-4" aria-hidden="true" /> Follow-ups
        </NavLink>
        <NavLink to="/test-rides" className={({ isActive }) => itemClass(isActive)} onClick={onNavigate}>
          <Bike className="size-4" aria-hidden="true" /> Test rides
        </NavLink>
        <NavLink to="/sales" className={({ isActive }) => itemClass(isActive)} onClick={onNavigate}>
          <ShoppingBag className="size-4" aria-hidden="true" /> Sales
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => itemClass(isActive)} onClick={onNavigate}>
          <Settings className="size-4" aria-hidden="true" /> Settings
        </NavLink>
      </nav>
      <NavLink to="/customers/new" className="btn btn-primary mt-3" onClick={onNavigate}>
        <Plus className="size-4" aria-hidden="true" /> Add customer
      </NavLink>
    </>
  )
}

function Brand({ trailing }: { trailing?: ReactNode }) {
  const { workspace } = useApp()
  return (
    <div className="flex items-start justify-between gap-2 px-2 py-2">
      <div>
        <p className="text-lg font-semibold tracking-tight">BPH</p>
        <p className="text-xs text-white/60">{workspace?.organization.name ?? 'BISWAJIT POWER HUB'}</p>
      </div>
      {trailing}
    </div>
  )
}

export function AppShell() {
  const { mode, offline, pending, syncing, sync } = useApp()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(location.pathname)
  const closeRef = useRef<HTMLButtonElement>(null)
  const hideNav = location.pathname.includes('/customers/new') || location.pathname.endsWith('/edit')
  const moreActive = morePaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
  const closeMenu = () => setMenuOpen(false)

  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname)
    if (menuOpen) setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden h-dvh flex-col bg-nav p-3 text-brand-ink md:flex" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <Brand />
        <MenuLinks onNavigate={closeMenu} />
      </aside>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/45 md:hidden"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <aside
            id="bph-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="drawer-in fixed inset-y-0 left-0 z-[70] flex w-[min(17.5rem,86vw)] flex-col bg-nav p-3 text-brand-ink md:hidden"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <Brand
              trailing={
                <button ref={closeRef} type="button" className="rounded-lg p-2 text-white" aria-label="Close menu" onClick={closeMenu}>
                  <X className="size-5" aria-hidden="true" />
                </button>
              }
            />
            <MenuLinks onNavigate={closeMenu} />
          </aside>
        </>
      ) : null}
      <div className="min-w-0">
        <OfflineBanner mode={mode} offline={offline} pending={pending} syncing={syncing} onSync={() => void sync()} />
        <main className={`mx-auto w-full max-w-3xl px-3 pt-3 md:px-8 ${hideNav ? 'pb-6 md:pb-10' : 'app-pad md:pb-10'}`}>
          <Outlet />
        </main>
      </div>
      {hideNav ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
          aria-label="Main"
        >
          <ul className="grid h-12 grid-cols-5">
            {links.slice(0, 2).map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={({ isActive }) => tabClass(isActive)}>
                  <link.icon className="size-4" aria-hidden="true" />
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/customers/new" aria-label="Add customer" className={({ isActive }) => tabClass(isActive)}>
                <Plus className="size-4" aria-hidden="true" />
                Add
              </NavLink>
            </li>
            <li>
              <NavLink to="/follow-ups" className={({ isActive }) => tabClass(isActive)}>
                <CalendarClock className="size-4" aria-hidden="true" />
                Follow-ups
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                className={`${tabClass(menuOpen || moreActive)} w-full`}
                aria-expanded={menuOpen}
                aria-controls="bph-drawer"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <Menu className="size-4" aria-hidden="true" />
                More
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
