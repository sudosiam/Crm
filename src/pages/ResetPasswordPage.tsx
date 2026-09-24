import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { humanizeError } from '../lib/errors'

export function ResetPasswordPage() {
  const { repo, user } = useApp()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const recovery = sessionStorage.getItem('bph.recovery') === '1' || Boolean(user)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <h1 className="font-display text-4xl">Choose a new password</h1>
      {recovery ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setBusy(true)
            void repo
              .updatePassword(password)
              .then(() => navigate('/'))
              .catch((caught: unknown) => setError(humanizeError(caught)))
              .finally(() => setBusy(false))
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">New password</span>
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </label>
          {error ? <p className="text-danger" role="alert">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      ) : (
        <p className="mt-4 text-muted">This reset link is invalid or has expired. Request a new one from the sign-in screen.</p>
      )}
      <Link to="/login" className="mt-4 font-semibold text-brand">Back to sign in</Link>
    </main>
  )
}
