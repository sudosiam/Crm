import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { humanizeError } from '../lib/errors'

export function ForgotPage() {
  const { repo } = useApp()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-y-auto px-4 py-6">
      <h1 className="page-title">Reset password</h1>
      <p className="mt-2 text-muted">We will email a reset link if this address has an account.</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          void repo
            .requestPasswordReset(email)
            .then(() => setMessage('If an account exists for that email, a reset link is on the way.'))
            .catch((caught: unknown) => setError(humanizeError(caught)))
            .finally(() => setBusy(false))
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Email</span>
          <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {message ? <p>{message}</p> : null}
        {error ? <p className="text-danger" role="alert">{error}</p> : null}
        <button className="btn btn-primary w-full" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <Link to="/login" className="mt-4 font-semibold text-brand">Back to sign in</Link>
    </main>
  )
}
