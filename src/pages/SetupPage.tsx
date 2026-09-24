import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BPH, DEMO_JOIN_CODE } from '../lib/business'
import { SelectField } from '../components/ui/SelectField'
import { useApp } from '../context/AppContext'
import { humanizeError } from '../lib/errors'
import type { BusinessInput } from '../lib/types'

const initial: BusinessInput = {
  name: BPH.name,
  tagline: BPH.tagline,
  phone: BPH.phone,
  email: BPH.email,
  website: BPH.website,
  adLandingUrl: BPH.adLandingUrl,
  address: BPH.address,
  businessHours: BPH.businessHours,
}

export function SetupPage() {
  const { user, workspace, ready, mode, repo } = useApp()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [form, setForm] = useState(initial)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (ready && !user) return <Navigate to="/login" replace />
  if (ready && workspace) return <Navigate to="/" replace />

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-4 py-6">
      <p className="text-sm font-semibold tracking-[0.18em] text-brand">BPH</p>
      <h1 className="page-title mt-1">Set up the showroom</h1>
      <p className="mt-2 text-sm text-muted">The owner creates BISWAJIT POWER HUB once. Everyone else joins with the team code.</p>
      <div className="mt-4">
        <SelectField
          label="How are you joining?"
          value={tab}
          options={[
            { value: 'create', label: 'Set up BPH' },
            { value: 'join', label: 'I have a team code' },
          ]}
          onChange={(next) => setTab(next as 'create' | 'join')}
        />
      </div>
      {tab === 'create' ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            void repo.createBusiness(form).catch((caught: unknown) => setError(humanizeError(caught))).finally(() => setBusy(false))
          }}
        >
          {(['name', 'phone', 'email', 'address', 'businessHours'] as const).map((key) => (
            <label key={key} className="block">
              <span className="mb-1 block text-sm font-semibold capitalize">{key === 'businessHours' ? 'Business hours' : key}</span>
              <input className="field" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            </label>
          ))}
          {error ? <p className="text-danger" role="alert">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={busy} type="submit">{busy ? 'Creating…' : 'Create business'}</button>
        </form>
      ) : (
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            void repo.joinBusiness(code).catch((caught: unknown) => setError(humanizeError(caught))).finally(() => setBusy(false))
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Team code</span>
            <input className="field uppercase" value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="characters" required />
          </label>
          {mode === 'demo' ? <p className="text-sm text-muted">Demo code: {DEMO_JOIN_CODE}</p> : null}
          {error ? <p className="text-danger" role="alert">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={busy} type="submit">{busy ? 'Joining…' : 'Join'}</button>
        </form>
      )}
    </main>
  )
}
