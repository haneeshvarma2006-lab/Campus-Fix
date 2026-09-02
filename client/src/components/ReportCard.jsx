import { Link } from 'react-router-dom'
import { StatusBadge, PriorityTag, Icon } from './ui'
import { timeAgo } from '../lib/format'

export function ReportCard({ report, showReporter = false }) {
  return (
    <Link to={`/reports/${report.id}`} className="card card-link report-card">
      <div className="report-card-head">
        <div className="stack stack-2" style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="mono tiny muted">#{report.code}</span>
            <span className="tag">{report.category}</span>
            <PriorityTag priority={report.priority} />
          </div>
          <h3 className="report-title">{report.title}</h3>
        </div>

        {report.photoUrl
          ? <img src={report.photoUrl} alt="" className="report-thumb" loading="lazy" />
          : <StatusBadge status={report.status} />}
      </div>

      <p className="report-desc">{report.description}</p>

      <div className="report-meta">
        {report.photoUrl && <StatusBadge status={report.status} />}

        {report.location && (
          <span className="row" style={{ gap: 5, minWidth: 0 }}>
            <Icon.Pin width={13} height={13} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {report.location}
            </span>
          </span>
        )}

        {report.comments > 0 && (
          <span className="row" style={{ gap: 5 }}>
            <Icon.Chat width={13} height={13} />
            {report.comments}
          </span>
        )}

        {report.votes > 0 && (
          <span className="row" style={{ gap: 5 }}>
            <Icon.Arrow width={13} height={13} />
            {report.votes}
          </span>
        )}

        <span className="spacer" />

        {showReporter && <span>{report.reporterName}</span>}
        <span className="mono">{timeAgo(report.createdAt)}</span>
      </div>
    </Link>
  )
}
