import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, useToast } from '../components/ui'
import { STATUSES, STATUS_LABEL } from '../lib/format'

const FILTERS = ['all', ...STATUSES]

export function MyReports() {
  const { user } = useAuth()
  const { error: toastError } = useToast()

  const [data, setData] = useState({ reports: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    api.listReports({ scope: 'mine', status, page, limit: 12 }, controller.signal)
      .then(setData)
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [status, page, toastError])

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="shell-wide page">
      <div className="row-between wrap page-head">
        <div>
          <h1>My reports</h1>
          <p>
            {data.total === 0
              ? `Nothing filed yet, ${firstName}.`
              : `${data.total} report${data.total === 1 ? '' : 's'} filed. Track where each one stands.`}
          </p>
        </div>
        <Link to="/submit" className="btn">Report an issue</Link>
      </div>

      <div className="row wrap" style={{ gap: 7, marginBottom: 22 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`chip ${status === f ? 'active' : ''}`}
            onClick={() => { setStatus(f); setPage(1) }}
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading && <CardSkeleton count={4} />}

      {!loading && data.reports.length === 0 && (
        <EmptyState
          title={status === 'all' ? 'No reports yet' : `No ${STATUS_LABEL[status].toLowerCase()} reports`}
          message={
            status === 'all'
              ? 'When you spot something broken, dirty, or unsafe, file it here and it gets a reference number you can follow.'
              : 'Try a different filter to see the rest of your reports.'
          }
          action={
            status === 'all'
              ? <Link to="/submit" className="btn">Report your first issue</Link>
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
