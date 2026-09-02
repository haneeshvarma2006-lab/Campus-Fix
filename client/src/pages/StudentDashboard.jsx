import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, useToast, Icon } from '../components/ui'
import { ACTIVE, STATUS_LABEL, PIPELINE, formatHours } from '../lib/format'

/**
 * A student's home: what they have filed, how much of it is still moving, and
 * the handful of reports that most need their attention.
 */
export function StudentDashboard() {
  const { user } = useAuth()
  const { error: toastError } = useToast()

  const [stats, setStats] = useState(null)
  const [active, setActive] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.stats(controller.signal),
      api.listReports({ scope: 'mine', status: 'active', sort: 'newest', limit: 4 }, controller.signal),
      api.listReports({ scope: 'mine', sort: 'newest', limit: 4 }, controller.signal),
    ])
      .then(([s, a, r]) => {
        setStats(s)
        setActive(a.reports)
        setRecent(r.reports)
      })
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [toastError])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const openCount = stats?.openCount ?? 0

  const headline = !stats
    ? 'Loading your reports…'
    : stats.total === 0
      ? 'Nothing filed yet. When you spot something broken, this is where it goes.'
      : openCount === 0
        ? `All ${stats.total} of your reports are closed. Nothing outstanding.`
        : `${openCount} of your ${stats.total} report${stats.total === 1 ? '' : 's'} ${openCount === 1 ? 'is' : 'are'} still being worked on.`

  return (
    <div className="shell-wide page fade-in">
      <div className="between wrap page-head">
        <div>
          <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>
            Hello, {firstName}
          </h1>
          <p className="lede">{headline}</p>
        </div>
        <Link to="/submit" className="btn btn-clay">
          <Icon.Plus width={15} height={15} /> Report an issue
        </Link>
      </div>

      {/* Their own counts, one tile per stage. */}
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        {PIPELINE.map((stage) => (
          <Link key={stage} to={`/reports?status=${stage}`} className={`stat t-${stage}`}>
            <div className="stat-value">{stats ? stats.counts[stage] : '—'}</div>
            <div className="stat-label"><span className="badge-dot" />{STATUS_LABEL[stage]}</div>
          </Link>
        ))}
        <div className="stat">
          <div className="stat-value">{stats ? formatHours(stats.avgFixHours) : '—'}</div>
          <div className="stat-label"><Icon.Clock width={13} height={13} />Avg time to fix</div>
        </div>
      </div>

      {loading && <CardSkeleton count={3} />}

      {!loading && stats?.total === 0 && (
        <EmptyState
          icon={Icon.Camera}
          title="File your first report"
          message="A photo, roughly where it is, and a sentence about what is wrong. It takes about a minute and you get a reference number to follow."
          action={<Link to="/submit" className="btn btn-clay">Report an issue</Link>}
        />
      )}

      {!loading && active.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="h2">Still open</h2>
            <Link to="/reports?status=active" className="btn btn-quiet btn-sm">View all</Link>
          </div>
          <div className="grid-reports">
            {active.map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        </section>
      )}

      {!loading && stats?.total > 0 && active.length === 0 && (
        <section style={{ marginBottom: 40 }}>
          <div className="panel row" style={{ gap: 12 }}>
            <span className="feature-mark" style={{ width: 30, height: 30, marginBottom: 0 }}>
              <Icon.Check width={15} height={15} />
            </span>
            <div className="stack g-1">
              <strong style={{ fontSize: 14 }}>Nothing outstanding</strong>
              <span className="small muted">Every report you have filed has been closed out.</span>
            </div>
          </div>
        </section>
      )}

      {!loading && recent.length > 0 && (
        <section>
          <div className="between" style={{ marginBottom: 14 }}>
            <h2 className="h2">Recently filed</h2>
            <Link to="/reports" className="btn btn-quiet btn-sm">All my reports</Link>
          </div>
          <div className="grid-reports">
            {recent.map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        </section>
      )}

      {!loading && stats?.byCategory?.length > 1 && (
        <section style={{ marginTop: 40 }}>
          <h2 className="h2" style={{ marginBottom: 14 }}>What you report most</h2>
          <div className="card">
            <div className="stack g-3">
              {stats.byCategory.map((c) => {
                const max = Math.max(...stats.byCategory.map((x) => x.count))
                return (
                  <div key={c.category} className="bar-row">
                    <span className="bar-label small">{c.category}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(c.count / max) * 100}%` }} />
                    </span>
                    <span className="bar-value">{c.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
