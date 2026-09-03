import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Icon, Spinner } from '../components/ui'
import { GoogleButton } from '../components/GoogleButton'

export function Signup() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  if (user) return <Navigate to="/" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Use a password of at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      const account = await signup(form)
      notify(
        account.role === 'admin'
          ? "You're the first account here, so you have admin access."
          : 'Account created. Welcome to CampusFix.'
      )
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap-s page auth-page">
      <div className="col g-2" style={{ marginBottom: 22, textAlign: 'center' }}>
        <h1 className="t-h1">Join CampusFix</h1>
        <p className="muted t-sm">Report campus problems and follow them until they&rsquo;re fixed.</p>
      </div>

      <div className="card col g-4">
        <GoogleButton label="Sign up with Google" next="/" />

        {!showEmail ? (
          <button className="btn btn-quiet btn-block" onClick={() => setShowEmail(true)}>
            Use email instead
          </button>
        ) : (
          <form onSubmit={submit} className="col g-4" noValidate>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" required autoComplete="name" autoFocus
                     value={form.name} onChange={set('name')} placeholder="Your name" />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email"
                     value={form.email} onChange={set('email')} placeholder="you@campus.edu" />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required autoComplete="new-password"
                     value={form.password} onChange={set('password')} placeholder="At least 8 characters" />
              <span className="hint">Stored hashed with bcrypt, never in plain text.</span>
            </div>

            {error && <div className="form-err"><Icon.Alert width={16} height={16} />{error}</div>}

            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? <><Spinner /> Creating…</> : 'Create account'}
            </button>
          </form>
        )}
      </div>

      <p className="t-sm muted" style={{ textAlign: 'center', marginTop: 16 }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Log in</Link>
      </p>
    </div>
  )
}
