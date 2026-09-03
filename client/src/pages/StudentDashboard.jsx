import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, Icon, useToast } from '../components/ui'
import { ACTIVE } from '../lib/format'

/**
 * What a student actually needs on opening the app: a way to report something,
 * and the state of what they already reported. Deliberately not an analytics
 * dashboard — three counts and a list.
 */
export function StudentDashboard() {
  const { user } = useAuth()
  const { error: toastError } = useToast()

  const [reports, setReports] = useState([])
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const c = new AbortController()
    Promise.all([
      api.listReports({ scope: 'mine', limit: 6, sort: 'newest' }, c.signal),
      api.stats(c.signal),
    ])
      .then(([list, stats]) => {
        setReports(list.reports)
        setCounts(stats)
      })
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => c.abort()
  }, [toastError])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const open = counts ? ACTIVE.reduce((n, s) => n + (counts.counts[s] || 0), 0) : 0
  const fixed = counts?.counts?.fixed || 0

  return (
    <div className="wrap page">
      <div className="page-head">
        <h1 className="t-h1">Hey {firstName} 👋</h1>
        <p className="muted t-sm" style={{ marginTop: 4 }}>
          {counts?.total
            ? `You've reported ${counts.total} ${counts.total === 1 ? 'thing' : 'things'}.`
            : 'Spotted something broken on campus?'}
        </p>
      </div>

      {/* The primary action, impossible to miss. */}
      <Link to="/submit" className="report-cta">
        <span className="report-cta-icon"><Icon.Plus width={22} height={22} /></span>
        <span className="grow">
          <span className="t-h3" style={{ display: 'block' }}>Report a problem</span>
          <span className="t-xs" style={{ opacity: .85 }}>Takes under a minute</span>
        </span>
        <Icon.Next />
      </Link>

      {counts && counts.total > 0 && (
        <div className="stats" style={{ marginBlock: 18 }}>
          <div className="stat">
            <div className="stat-n">{open}</div>
            <div className="stat-l"><span className="dot" style={{ background: 'var(--reported)' }} />Still open</div>
          </div>
          <div className="stat">
            <div className="stat-n">{fixed}</div>
            <div className="stat-l"><span className="dot" style={{ background: 'var(--fixed)' }} />Fixed</div>
          </div>
          <div className="stat">
            <div className="stat-n">{counts.total}</div>
            <div className="stat-l"><span className="dot" style={{ background: 'var(--ink-4)' }} />Total</div>
          </div>
        </div>
      )}

      <div className="between" style={{ marginTop: 24, marginBottom: 12 }}>
        <h2 className="t-h2">My reports</h2>
        {reports.length > 0 && (
          <Link to="/reports" className="btn btn-quiet btn-sm">See all <Icon.Next width={15} height={15} /></Link>
        )}
      </div>

      {loading && <CardSkeleton count={3} />}

      {!loading && reports.length === 0 && (
        <EmptyState
          title="Nothing reported yet"
          message="When something on campus is broken, dirty or unsafe, report it here and follow what happens to it."
          action={<Link to="/submit" className="btn">Report your first problem</Link>}
        />
      )}

      {!loading && reports.length > 0 && (
        <div className="reports">
          {reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  )
}
