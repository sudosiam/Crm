import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BPH } from '../lib/business'
import { DEMO_OWNER_EMAIL, DEMO_OWNER_PASSWORD, DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from '../lib/data/demoData'
import { humanizeError } from '../lib/errors'
import { useApp } from '../context/AppContext'

export function LoginPage() {
  const { user, workspace, ready, mode, repo } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [modeForm, setModeForm] = useState<'in' | 'up'>('in')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && user) return <Navigate to={workspace ? '/' : '/setup'} replace />

  async function submit() {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (modeForm === 'in') {
        await repo.signIn(email, password)
        navigate('/')
      } else {
        const result = await repo.signUp(email, password, fullName)
        if (result.needsEmailConfirmation) setInfo('Check your email to confirm the account, then sign in.')
        else navigate('/setup')
      }
    } catch (caught) {
      setError(humanizeError(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <p className="font-display text-5xl text-brand">BPH</p>
      <h1 className="mt-2 font-display text-3xl">{BPH.name}</h1>
      <p className="mt-1 text-muted">{BPH.tagline}</p>
      <form
        className="card mt-6 space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <h2 className="text-xl font-semibold">{modeForm === 'in' ? 'Sign in' : 'Create account'}</h2>
        {modeForm === 'up' ? (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Your name</span>
            <input className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Email</span>
          <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Password</span>
          <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={modeForm === 'in' ? 'current-password' : 'new-password'} required />
        </label>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {info ? <p className="text-sm">{info}</p> : null}
        <button className="btn btn-primary w-full" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : modeForm === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <div className="flex justify-between text-sm">
          <button type="button" className="font-semibold text-brand" onClick={() => setModeForm(modeForm === 'in' ? 'up' : 'in')}>
            {modeForm === 'in' ? 'Create account' : 'Have an account? Sign in'}
          </button>
          <Link to="/forgot" className="font-semibold text-brand">Forgot password</Link>
        </div>
      </form>
      {mode === 'demo' ? (
        <div className="mt-4 rounded-2xl bg-brand-soft p-4 text-sm">
          <p className="font-semibold">Demo on this phone</p>
          <p className="mt-1">Owner: {DEMO_OWNER_EMAIL} · {DEMO_OWNER_PASSWORD}</p>
          <p>Staff: {DEMO_STAFF_EMAIL} · {DEMO_STAFF_PASSWORD}</p>
          <p className="mt-1 text-muted">Team code starts as BPHDEMO1. Nothing here is a real customer.</p>
        </div>
      ) : null}
      <footer className="mt-8 text-sm text-muted">
        <p>{BPH.address}</p>
        <p className="mt-1">{BPH.businessHours}</p>
        <p className="mt-1">{BPH.phone}</p>
      </footer>
    </main>
  )
}
