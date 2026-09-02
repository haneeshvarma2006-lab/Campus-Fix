import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Icon, Spinner } from '../components/ui'
import { GoogleButton } from '../components/GoogleButton'

const DEMO = [
  { role: 'Admin',   email: 'admin@campusfix.app',  password: 'admin1234', note: 'every report' },
  { role: 'Student', email: 'student.a@campus.edu', password: 'demo1234',  note: 'own reports' },
]

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { notify, error: toastError } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Google redirects failures back here with a readable reason.
  const oauthError = searchParams.get('error')
  useEffect(() => {
    if (oauthError) toastError(oauthError)
  }, [oauthError, toastError])

  if (user) return <Navigate to={location.state?.from || '/'} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const account = await login({ email, password })
      notify(`Welcome back, ${account.name.split(' ')[0]}.`)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell auth-wrap fade-in">
      <div className="stack g-1" style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 34 }}>Welcome back</h1>
        <p className="muted small">Track your reports and see what is being fixed.</p>
      </div>

      <div className="auth-card">
        <GoogleButton label="Continue with Google" next={location.state?.from || '/'} />

        <form onSubmit={handleSubmit} noValidate className="stack g-4">
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

          {error && (
            <div className="form-error">
              <Icon.Alert width={15} height={15} style={{ marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-block" disabled={busy}>
            {busy ? <><Spinner /> Signing in…</> : 'Log in'}
          </button>
        </form>
      </div>

      <p className="small muted" style={{ marginTop: 18, textAlign: 'center' }}>
        New here? <Link to="/signup" style={{ color: 'var(--clay)', fontWeight: 550 }}>Create an account</Link>
      </p>

      <div className="demo-box">
        <div className="demo-head">
          <span className="overline">Demo accounts</span>
          <span className="tiny faint">tap to fill</span>
        </div>
        {DEMO.map((d) => (
          <button
            key={d.email}
            type="button"
            className="demo-row"
            onClick={() => { setEmail(d.email); setPassword(d.password); setError('') }}
          >
            <span className="demo-role">{d.role}</span>
            <span className="code truncate" style={{ flex: 1 }}>{d.email}</span>
            <span className="tiny faint">sees {d.note}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
