import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, useToast, Icon } from '../components/ui'
import { STATUSES, STATUS_LABEL } from '../lib/format'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Still open' },
  ...STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s] })),
]

export function MyReports() {
  const { error: toastError } = useToast()

  // The status filter lives in the URL, so dashboard tiles can deep-link into
  // a filtered list and the browser's back button behaves.
  const [searchParams, setSearchParams] = useSearchParams()
  const status = FILTERS.some((f) => f.id === searchParams.get('status'))
    ? searchParams.get('status')
    : 'all'

  const [data, setData] = useState({ reports: [], total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [status])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api.listReports({ scope: 'mine', status, page, limit: 12 }, controller.signal)
      .then(setData)
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [status, page, toastError])

  const setStatus = (id) => {
    setSearchParams(id === 'all' ? {} : { status: id }, { replace: true })
  }

  return (
    <div className="shell-wide page fade-in">
      <div className="between wrap page-head">
        <div>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 3.6vw, 38px)' }}>My reports</h1>
          <p className="lede">
            {data.total === 0 ? 'Nothing here yet.' : `${data.total} report${data.total === 1 ? '' : 's'} filed. Track where each one stands.`}
          </p>
        </div>
        <Link to="/submit" className="btn btn-clay">
          <Icon.Plus width={15} height={15} /> Report an issue
        </Link>
      </div>

      <div className="row wrap" style={{ gap: 7, marginBottom: 22 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${status === f.id ? 'active' : ''}`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <CardSkeleton count={4} />}

      {!loading && data.reports.length === 0 && (
        <EmptyState
          icon={status === 'all' ? Icon.Camera : Icon.Search}
          title={status === 'all' ? 'No reports yet' : `Nothing ${(FILTERS.find((f) => f.id === status)?.label || '').toLowerCase()}`}
          message={
            status === 'all'
              ? 'When you spot something broken, dirty, or unsafe, file it here and it gets a reference number you can follow.'
              : 'Try a different filter to see the rest of your reports.'
          }
          action={
            status === 'all'
              ? <Link to="/submit" className="btn btn-clay">Report your first issue</Link>
              : <button className="btn btn-ghost" onClick={() => setStatus('all')}>Show all</button>
          }
        />
      )}

      {!loading && data.reports.length > 0 && (
        <div className="grid-reports">
          {data.reports.map((r) => <ReportCard key={r.id} report={r} />)}
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
