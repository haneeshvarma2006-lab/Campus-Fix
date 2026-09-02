import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const STEPS = [
  { n: '01', title: 'Report it', body: 'A title, a photo, and where it is. Takes under a minute from your phone, and your location can be filled in automatically.' },
  { n: '02', title: 'It gets triaged', body: 'Every report lands in one queue with a reference code. Staff set priority and move it through open, in progress, and resolved.' },
  { n: '03', title: 'You see the whole trail', body: 'Each status change is timestamped and attributed, with notes from the team. Nothing quietly disappears.' },
]

export function Landing() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/reports" replace />

  return (
    <>
      <section className="shell hero">
        <span className="eyebrow">
          <span className="badge-dot" style={{ background: 'currentColor' }} />
          Sanitation &amp; maintenance reporting
        </span>

        <h1>Report it. Track it. See it fixed.</h1>

        <p>
          CampusFix turns "someone should really fix that" into a tracked ticket with a
          reference number, a photo, and a status anyone involved can check — for a campus,
          a neighbourhood, or any facility.
        </p>

        <div className="hero-actions">
          <Link to="/signup" className="btn btn-lg">Create an account</Link>
          <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
        </div>
      </section>

      <section className="shell-wide" style={{ paddingBottom: 72 }}>
        <div className="feature-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="card feature">
              <div className="feature-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 80 }}>
        <div className="card" style={{ padding: 26 }}>
          <h2 style={{ marginBottom: 8 }}>Two kinds of account</h2>
          <p className="muted small" style={{ marginBottom: 20 }}>
            Roles are set by an admin, not chosen at signup — so the dashboard stays out of
            reach of anyone who simply registers.
          </p>

          <div className="stack stack-3">
            <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <span className="role-pill">Citizen</span>
              <p className="small muted" style={{ flex: 1 }}>
                Submits reports and tracks their own. Sees the full history and any notes the
                team leaves on their reports.
              </p>
            </div>
            <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <span className="role-pill">Staff / admin</span>
              <p className="small muted" style={{ flex: 1 }}>
                Sees every report, filters and searches across them, sets status and priority,
                and manages the category list. Admins additionally manage roles.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
