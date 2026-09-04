import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, useToast, Icon } from '../components/ui'
import { STATUSES, STATUS_LABEL, PIPELINE, formatHours, dayLabel } from '../lib/format'

/** Debounces the search box so typing does not fire a request per keystroke. */
function useDebounced(value, delay = 320) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function TrendCard({ trend }) {
  const max = Math.max(1, ...trend.map((t) => t.count))
  const total = trend.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="card chart-card">
      <div className="between" style={{ marginBottom: 14 }}>
        <h3 className="t-h3" style={{ fontSize: 14 }}>Reports filed</h3>
        <span className="t-xs faint">{total} in 14 days</span>
      </div>
      <div className="trend">
        {trend.map((t) => (
          <div
            key={t.day}
            className="trend-col"
            data-has={t.count > 0}
            title={`${t.day}: ${t.count} report${t.count === 1 ? '' : 's'}`}
          >
            <span className="trend-bar" style={{ height: `${Math.max(5, (t.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="trend-axis">
        <span>{dayLabel(trend[0]?.day)}</span>
        <span>{dayLabel(trend[Math.floor(trend.length / 2)]?.day)}</span>
        <span>today</span>
      </div>
    </div>
  )
}

/** A clickable breakdown — each bar doubles as a filter for that value. */
function BreakdownCard({ title, rows, labelKey, onPick, activeValue }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="card">
      <h3 className="t-h3" style={{ fontSize: 14, marginBottom: 14 }}>{title}</h3>
      <div className="col g-3">
        {rows.length === 0 && <p className="t-sm muted">Nothing yet.</p>}
        {rows.map((r) => {
          const label = r[labelKey]
          const isActive = activeValue === label
          return (
            <button
              key={label}
              className="bar-row"
              onClick={() => onPick(isActive ? 'all' : label)}
              title={`Filter by ${label}`}
              style={{ width: '100%', textAlign: 'left' }}
            >
              <span
                className="bar-label t-sm truncate"
                style={{ fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--brand)' : undefined }}
              >
                {label}
              </span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
              </span>
              <span className="bar-value">{r.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const { error: toastError } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [stats, setStats] = useState(null)
  const [data, setData] = useState({ reports: [], total: 0, pages: 1, page: 1 })
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters live in the URL so a filtered queue can be linked or bookmarked.
  const status = searchParams.get('status') || 'all'
  const category = searchParams.get('category') || 'all'
  const location = searchParams.get('location') || 'all'
  const sort = searchParams.get('sort') || 'newest'
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [page, setPage] = useState(1)

  const q = useDebounced(search)

  const update = (patch) => {
    const next = Object.fromEntries(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === 'all' || (k === 'sort' && v === 'newest')) delete next[k]
      else next[k] = v
    }
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.stats(controller.signal).then(setStats),
      api.listCategories(controller.signal).then((d) => setCategories(d.categories)),
      api.listLocations(controller.signal).then((d) => setLocations(d.locations)),
    ]).catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
    return () => controller.abort()
  }, [toastError])

  useEffect(() => { setPage(1) }, [status, category, location, q, sort])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api.listReports({ scope: 'all', status, category, location, q, sort, page, limit: 12 }, controller.signal)
      .then(setData)
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [status, category, location, q, sort, page, toastError])

  const tiles = useMemo(
    () => [...PIPELINE, 'rejected'].map((s) => ({ key: s, label: STATUS_LABEL[s], value: stats?.counts[s] })),
    [stats]
  )

  const hasFilters = status !== 'all' || category !== 'all' || location !== 'all' || Boolean(q)

  const clearAll = () => {
    setSearch('')
    setSearchParams({}, { replace: true })
  }

  return (
    <div className="wrap page in">
      <div className="between wrap-x page-head">
        <div>
          <h1 className="t-h1" style={{ fontSize: 'clamp(30px, 4vw, 42px)' }}>Dashboard</h1>
          <p className="lede">
            {stats
              ? `${stats.total} report${stats.total === 1 ? '' : 's'} in total · ${stats.openCount} still needing attention.`
              : 'Every report across every student.'}
          </p>
        </div>
        <Link to="/admin/settings" className="btn btn-ghost">Settings</Link>
      </div>

      {/*
        * The queue at a glance.
        *
        * This was nine identical tiles. Five of them were the stages of one
        * pipeline — parts of a single whole, drawn as five unrelated facts —
        * and on a phone the fifth sat alone in a row of two. A stacked bar
        * says what five cards could not: this is the shape of the queue, and
        * this is which part of it is growing.
        */}
      <section className="queue">
        <div className="queue-top">
          <div>
            <div className="queue-n">{stats?.openCount ?? '—'}</div>
            <div className="queue-l">still needing attention</div>
          </div>
          {stats?.oldestOpenDays != null && (
            <div className="queue-aside">
              <Icon.Alert width={14} height={14} />
              oldest is <strong>{stats.oldestOpenDays}d</strong> old
            </div>
          )}
        </div>

        <div
          className="qbar"
          role="img"
          aria-label={tiles.map((t) => `${t.value ?? 0} ${t.label.toLowerCase()}`).join(', ')}
        >
          {tiles.map((t) => (
            Number(t.value) > 0 && (
              <span
                key={t.key}
                className={`qseg q-${t.key} ${status === t.key ? 'on' : ''}`}
                style={{ flexGrow: Number(t.value) }}
              />
            )
          ))}
          {!stats && <span className="qseg q-empty" style={{ flexGrow: 1 }} />}
        </div>

        <div className="qlegend">
          {tiles.map((t) => (
            <button
              key={t.key}
              className={`qrow q-${t.key} ${status === t.key ? 'on' : ''}`}
              onClick={() => update({ status: status === t.key ? 'all' : t.key })}
              title={`Show only ${t.label.toLowerCase()}`}
            >
              <span className="qdot" />
              <span className="grow truncate">{t.label}</span>
              <span className="qn">{t.value ?? '—'}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Three measures of how the queue is being worked, not what is in it. */}
      <div className="kpis">
        <div className="kpi">
          <Icon.Check width={14} height={14} />
          <span className="kpi-n">{stats ? `${stats.fixRate}%` : '—'}</span>
          <span className="kpi-l">Fix rate</span>
        </div>
        <div className="kpi">
          <Icon.Clock width={14} height={14} />
          <span className="kpi-n">{stats ? formatHours(stats.avgFixHours) : '—'}</span>
          <span className="kpi-l">Avg to fix</span>
        </div>
        <div className="kpi">
          <Icon.Inbox width={14} height={14} />
          <span className="kpi-n">{stats?.total ?? '—'}</span>
          <span className="kpi-l">Total filed</span>
        </div>
      </div>

      {/* --- analytics --- */}
      {stats && (
        <div className="chart-grid" style={{ marginBottom: 30 }}>
          <TrendCard trend={stats.trend} />
          <div className="col g-4">
            <BreakdownCard
              title="By category"
              rows={stats.byCategory}
              labelKey="category"
              activeValue={category}
              onPick={(v) => update({ category: v })}
            />
            <BreakdownCard
              title="By location"
              rows={stats.byLocation}
              labelKey="location"
              activeValue={location}
              onPick={(v) => update({ location: v })}
            />
          </div>
        </div>
      )}

      {/* --- filters --- */}
      <div className="toolbar" style={{ marginBottom: 22 }}>
        <div className="row wrap-x" style={{ gap: 8 }}>
          <span className="search-wrap" style={{ minWidth: 220 }}>
            <Icon.Search width={15} height={15} />
            <input
              className="input"
              placeholder="Search title, description, location, or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </span>

          <select className="input" style={{ width: 170 }} value={category} onChange={(e) => update({ category: e.target.value })}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <select className="input" style={{ width: 190 }} value={location} onChange={(e) => update({ location: e.target.value })}>
            <option value="all">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}{l.total_count > 0 ? ` (${l.total_count})` : ''}
              </option>
            ))}
          </select>

          <select className="input" style={{ width: 160 }} value={sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Most urgent</option>
            <option value="votes">Most backed</option>
          </select>
        </div>

        <div className="row wrap-x" style={{ gap: 7 }}>
          <button className={`chip ${status === 'all' ? 'on' : ''}`} onClick={() => update({ status: 'all' })}>
            All
          </button>
          <button className={`chip ${status === 'active' ? 'on' : ''}`} onClick={() => update({ status: 'active' })}>
            Still open{stats && <span className="chip-count">{stats.openCount}</span>}
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => update({ status: s })}>
              {STATUS_LABEL[s]}{stats && <span className="chip-count">{stats.counts[s]}</span>}
            </button>
          ))}

          {hasFilters && (
            <button className="btn btn-quiet btn-xs" onClick={clearAll}>
              <Icon.Close width={12} height={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {!loading && (
        <p className="t-sm muted" style={{ marginBottom: 14 }}>
          {data.total === 0 ? 'No matches' : `Showing ${data.reports.length} of ${data.total}`}
          {location !== 'all' && ` at ${location}`}
          {q && ` for “${q}”`}
        </p>
      )}

      {loading && <CardSkeleton count={6} />}

      {!loading && data.reports.length === 0 && (
        <EmptyState
          icon={Icon.Search}
          title="Nothing matches those filters"
          message="Try clearing the search or widening the status filter."
          action={<button className="btn btn-ghost" onClick={clearAll}>Clear filters</button>}
        />
      )}

      {!loading && data.reports.length > 0 && (
        <div className="reports">
          {data.reports.map((r) => <ReportCard key={r.id} report={r} showReporter />)}
        </div>
      )}

      {!loading && data.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="t-sm muted mono">Page {data.page} of {data.pages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
