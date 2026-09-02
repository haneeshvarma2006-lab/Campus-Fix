import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui'

const DEMO = [
  { role: 'Admin', email: 'admin@campusfix.app', password: 'admin1234' },
  { role: 'Staff', email: 'staff@campusfix.app', password: 'staff1234' },
  { role: 'Citizen', email: 'rahul@example.com', password: 'demo1234' },
]

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={location.state?.from || '/reports'} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const account = await login({ email, password })
      notify(`Welcome back, ${account.name.split(' ')[0]}.`)
      navigate(location.state?.from || '/reports', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell auth-wrap">
      <h1 style={{ marginBottom: 7 }}>Log in</h1>
      <p className="muted small" style={{ marginBottom: 28 }}>
        Track your reports and see what is being fixed.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email" autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="small muted" style={{ marginTop: 18, textAlign: 'center' }}>
        New here? <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 550 }}>Create an account</Link>
      </p>

      <div className="demo-box">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <strong style={{ fontSize: 12.5 }}>Demo accounts</strong>
          <span className="tiny muted">from the seed data</span>
        </div>
        {DEMO.map((d) => (
          <div key={d.email} className="demo-row">
            <span>{d.email}</span>
            <button
              type="button"
              onClick={() => { setEmail(d.email); setPassword(d.password) }}
            >
              Use {d.role.toLowerCase()}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
