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
  const [field, setField] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setField('')

    if (form.password.length < 8) {
      setError('Use a password of at least 8 characters.')
      setField('password')
      return
    }

    setBusy(true)
    try {
      const account = await signup(form)
      notify(
        account.role === 'admin'
          ? 'Account created — you are the first user, so you have admin access.'
          : 'Account created. Welcome to CampusFix.'
      )
      navigate(account.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      setField(err.field || '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell auth-wrap fade-in">
      <div className="stack g-1" style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 34 }}>Create an account</h1>
        <p className="muted small">Sign up to file and track issue reports.</p>
      </div>

      <div className="auth-card">
        <GoogleButton label="Sign up with Google" next="/dashboard" />

        <form onSubmit={handleSubmit} noValidate className="stack g-4">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name" type="text" required autoComplete="name" autoFocus
              value={form.name} onChange={set('name')} placeholder="Your full name"
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={form.email} onChange={set('email')} placeholder="you@college.edu"
              aria-invalid={field === 'email' || undefined}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" required autoComplete="new-password"
              value={form.password} onChange={set('password')} placeholder="At least 8 characters"
              aria-invalid={field === 'password' || undefined}
            />
            <span className="field-hint">Stored hashed with bcrypt — never in plain text.</span>
          </div>

          {error && (
            <div className="form-error">
              <Icon.Alert width={15} height={15} style={{ marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-block" disabled={busy}>
            {busy ? <><Spinner /> Creating account…</> : 'Create account'}
          </button>
        </form>
      </div>

      <p className="small muted" style={{ marginTop: 18, textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--clay)', fontWeight: 550 }}>Log in</Link>
      </p>

      <p className="tiny faint" style={{ marginTop: 18, textAlign: 'center', lineHeight: 1.65 }}>
        New accounts are students. Admin access is granted by an existing admin — except on a
        brand-new install, where the first account becomes the admin.
      </p>
    </div>
  )
}
