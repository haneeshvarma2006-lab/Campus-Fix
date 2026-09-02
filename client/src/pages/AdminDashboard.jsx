import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, useToast, Icon } from '../components/ui'
import { STATUSES, STATUS_LABEL, formatHours } from '../lib/format'

/** Debounces the search box so typing does not fire a request per keystroke. */
function useDebounced(value, delay = 320) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function TrendStrip({ trend }) {
  const max = Math.max(1, ...trend.map((t) => t.count))
  return (
    <div className="card chart-card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14 }}>Reports filed</h3>
        <span className="tiny muted">last 14 days</span>
      </div>
      <div className="trend">
        {trend.map((t) => (
          <div
            key={t.day}
            className="trend-bar"
            data-has-value={t.count > 0}
            style={{ height: `${Math.max(4, (t.count / max) * 100)}%` }}
            title={`${t.day}: ${t.count} report${t.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryBars({ byCategory }) {
  const max = Math.max(1, ...byCategory.map((c) => c.count))
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, marginBottom: 14 }}>By category</h3>
      <div className="stack stack-3">
        {byCategory.length === 0 && <p className="small muted">No reports yet.</p>}
        {byCategory.map((c) => (
          <div key={c.category} className="bar-row">
            <span style={{ width: 108, flexShrink: 0 }} className="small">{c.category}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(c.count / max) * 100}%` }} />
            </span>
            <span className="mono tiny muted" style={{ width: 22, textAlign: 'right' }}>{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const { isAdmin } = useAuth()
  const { error: toastError } = useToast()

  const [stats, setStats] = useState(null)
  const [data, setData] = useState({ reports: [], total: 0, pages: 1, page: 1 })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const q = useDebounced(search)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.stats(controller.signal).then(setStats),
      api.listCategories(controller.signal).then((d) => setCategories(d.categories)),
    ]).catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
    return () => controller.abort()
  }, [toastError])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api.listReports({ scope: 'all', status, category, q, sort, page, limit: 12 }, controller.signal)
      .then(setData)
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [status, category, q, sort, page, toastError])

  // Any filter change should return to the first page, or you can land on an
  // empty page-4 of a three-page result.
  useEffect(() => { setPage(1) }, [status, category, q, sort])

  const openCount = stats ? stats.counts.open + stats.counts.in_progress : 0

  const summary = useMemo(() => ([
    { key: 'open', label: 'Open', value: stats?.counts.open ?? '—' },
    { key: 'in_progress', label: 'In progress', value: stats?.counts.in_progress ?? '—' },
    { key: 'resolved', label: 'Resolved', value: stats?.counts.resolved ?? '—' },
    { key: 'rejected', label: 'Rejected', value: stats?.counts.rejected ?? '—' },
  ]), [stats])

  return (
    <div className="shell-wide page">
      <div className="row-between wrap page-head">
        <div>
          <h1>Dashboard</h1>
          <p>
            {stats
              ? `${stats.total} report${stats.total === 1 ? '' : 's'} in total · ${openCount} still needing attention.`
              : 'Every report across every reporter.'}
          </p>
        </div>
        {isAdmin && <Link to="/admin/settings" className="btn btn-ghost">Settings</Link>}
      </div>

      <div className="stat-grid" style={{ marginBottom: 14 }}>
        {summary.map((s) => (
          <div key={s.key} className={`stat tone-${s.key}`}>
            <div className="stat-value mono">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
        <div className="stat">
          <div className="stat-value mono">{stats ? `${stats.resolutionRate}%` : '—'}</div>
          <div className="stat-label">Resolution rate</div>
        </div>
        <div className="stat">
          <div className="stat-value mono">{stats ? formatHours(stats.avgResolutionHours) : '—'}</div>
          <div className="stat-label">Avg time to resolve</div>
        </div>
      </div>

      {stats && (
        <div className="chart-grid">
          <TrendStrip trend={stats.trend} />
          <CategoryBars byCategory={stats.byCategory} />
        </div>
      )}

      {/* --- filters --- */}
      <div className="stack stack-3" style={{ marginBottom: 22 }}>
        <div className="row" style={{ gap: 8, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, color: 'var(--gray-400)', display: 'flex' }}>
            <Icon.Search />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search title, description, location, or reference code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input" style={{ width: 168 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="votes">Most supported</option>
          </select>
        </div>

        <div className="row wrap" style={{ gap: 7 }}>
          <button className={`chip ${status === 'all' ? 'active' : ''}`} onClick={() => setStatus('all')}>
            All statuses
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={`chip ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}

          <span className="spacer" />

          <select className="input" style={{ width: 176 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {!loading && (
        <p className="small muted" style={{ marginBottom: 14 }}>
          {data.total === 0 ? 'No matches' : `Showing ${data.reports.length} of ${data.total}`}
          {q && ` for “${q}”`}
        </p>
      )}

      {loading && <CardSkeleton count={6} />}

      {!loading && data.reports.length === 0 && (
        <EmptyState
          title="Nothing matches those filters"
          message="Try clearing the search or widening the status filter."
          action={
            <button
              className="btn btn-ghost"
              onClick={() => { setStatus('all'); setCategory('all'); setSearch('') }}
            >
              Clear filters
            </button>
          }
        />
      )}

      {!loading && data.reports.length > 0 && (
        <div className="grid-reports">
          {data.reports.map((r) => <ReportCard key={r.id} report={r} showReporter />)}
        </div>
      )}

      {!loading && data.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="small muted mono">Page {data.page} of {data.pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
