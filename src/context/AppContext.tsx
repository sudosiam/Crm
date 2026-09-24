import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRepository, configError, isSupabaseConfigured, type Repository } from '../lib/data'
import { humanizeError } from '../lib/errors'
import type { Actor, SessionUser, WorkspaceData } from '../lib/types'

interface AppValue {
  ready: boolean
  configError: string | null
  mode: Repository['mode']
  user: SessionUser | null
  workspace: WorkspaceData | null
  actor: Actor | null
  offline: boolean
  pending: number
  syncing: boolean
  repo: Repository
  refresh: () => Promise<void>
  sync: () => Promise<string | null>
}

const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => getRepository(), [])
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [bootError, setBootError] = useState<string | null>(configError)

  const pull = () => {
    setWorkspace(repo.snapshot())
    setOffline(repo.isOffline())
    setPending(repo.pendingCount())
    const actor = repo.actor()
    if (actor) {
      setUser((current) =>
        current && current.id === actor.userId ? { ...current, fullName: actor.fullName } : current,
      )
    }
  }

  useEffect(() => {
    let gone = false
    const unsub = repo.subscribe(() => {
      setWorkspace(repo.snapshot())
      setOffline(repo.isOffline())
      setPending(repo.pendingCount())
    })
    const unauth = repo.onAuth((next) => setUser(next))
    void repo
      .reload()
      .then(async () => {
        if (gone) return
        setUser(await repo.getSession())
        setWorkspace(repo.snapshot())
        setOffline(repo.isOffline())
        setPending(repo.pendingCount())
      })
      .catch((error: unknown) => {
        if (!gone) setBootError(humanizeError(error))
      })
      .finally(() => {
        if (!gone) setReady(true)
      })
    const onOnline = () => {
      setSyncing(true)
      void repo.flush().finally(() => {
        setWorkspace(repo.snapshot())
        setOffline(repo.isOffline())
        setPending(repo.pendingCount())
        setSyncing(false)
      })
    }
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      gone = true
      unsub()
      unauth()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [repo])

  const value = useMemo<AppValue>(
    () => ({
      ready,
      configError: bootError,
      mode: isSupabaseConfigured ? 'supabase' : 'demo',
      user,
      workspace,
      actor: repo.actor(),
      offline,
      pending,
      syncing,
      repo,
      refresh: async () => {
        await repo.reload()
        setUser(await repo.getSession())
        pull()
      },
      sync: async () => {
        setSyncing(true)
        try {
          return await repo.flush()
        } finally {
          pull()
          setSyncing(false)
        }
      },
    }),
    [ready, bootError, user, workspace, offline, pending, syncing, repo],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('App missing')
  return value
}
