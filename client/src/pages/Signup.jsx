import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui'

export function Signup() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [field, setField] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/reports" replace />

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
      navigate('/reports', { replace: true })
    } catch (err) {
      setError(err.message)
      setField(err.field || '')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell auth-wrap">
      <h1 style={{ marginBottom: 7 }}>Create an account</h1>
      <p className="muted small" style={{ marginBottom: 28 }}>
        Sign up to submit and track issue reports.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input
            id="name" type="text" required autoComplete="name" autoFocus
            value={form.name} onChange={set('name')} placeholder="Full name"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email"
            value={form.email} onChange={set('email')} placeholder="you@example.com"
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

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="small muted" style={{ marginTop: 18, textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 550 }}>Log in</Link>
      </p>

      <p className="tiny muted" style={{ marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
        New accounts are citizens. Staff and admin access is granted by an existing admin —
        except on a brand-new install, where the first account becomes the admin.
      </p>
    </div>
  )
}
