import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Icon, Spinner } from '../components/ui'
import { GoogleButton } from '../components/GoogleButton'

const DEMO = [
  { role: 'Student', email: 'student.a@campus.edu', password: 'demo1234' },
  { role: 'Admin', email: 'admin@campusfix.app', password: 'admin1234' },
]

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { notify, error: toastError } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  // Google bounces failures back here with a readable reason.
  const oauthError = params.get('error')
  useEffect(() => { if (oauthError) toastError(oauthError) }, [oauthError, toastError])

  if (user) return <Navigate to={location.state?.from || '/'} replace />

  const submit = async (e) => {
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
    <div className="wrap-s page auth-page">
      <div className="col g-2" style={{ marginBottom: 22, textAlign: 'center' }}>
        <h1 className="t-h1">Welcome back</h1>
        <p className="muted t-sm">Sign in to report and track campus issues.</p>
      </div>

      <div className="card col g-4">
        <GoogleButton next={location.state?.from || '/'} />

        {!showEmail ? (
          <button className="btn btn-quiet btn-block" onClick={() => setShowEmail(true)}>
            Use email instead
          </button>
        ) : (
          <form onSubmit={submit} className="col g-4" noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email" type="email" required autoComplete="email" autoFocus
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@campus.edu"
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

            {error && <div className="form-err"><Icon.Alert width={16} height={16} />{error}</div>}

            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? <><Spinner /> Signing in…</> : 'Log in'}
            </button>
          </form>
        )}
      </div>

      <p className="t-sm muted" style={{ textAlign: 'center', marginTop: 16 }}>
        New here? <Link to="/signup" style={{ color: 'var(--brand)', fontWeight: 600 }}>Create an account</Link>
      </p>

      <div className="card col g-2" style={{ marginTop: 18 }}>
        <span className="overline">Try it without signing up</span>
        {DEMO.map((d) => (
          <button
            key={d.email}
            className="demo-row"
            onClick={() => {
              setShowEmail(true)
              setEmail(d.email)
              setPassword(d.password)
              setError('')
            }}
          >
            <span className="tag">{d.role}</span>
            <span className="code grow truncate" style={{ textAlign: 'left' }}>{d.email}</span>
            <Icon.Next width={15} height={15} />
          </button>
        ))}
      </div>
    </div>
  )
}
