import { Link } from 'react-router-dom'
import { StatusBadge, PriorityTag, Icon } from './ui'
import { timeAgo } from '../lib/format'

export function ReportCard({ report, showReporter = false }) {
  return (
    <Link to={`/reports/${report.id}`} className={`card card-link report-card s-${report.status}`}>
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <span className="code">#{report.code}</span>
          <span className="tag">{report.category}</span>
          <PriorityTag priority={report.priority} />
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="row-top" style={{ gap: 14 }}>
        <div className="stack g-2" style={{ minWidth: 0, flex: 1 }}>
          <h3 className="report-title clamp-2">{report.title}</h3>
          <p className="small muted clamp-2">{report.description}</p>
        </div>
        {report.photoUrl && (
          <img src={report.photoUrl} alt="" className="report-thumb" loading="lazy" />
        )}
      </div>

      <div className="report-meta">
        {report.location && (
          <span className="meta-item" style={{ maxWidth: '46%' }}>
            <Icon.Pin width={13} height={13} />
            <span className="truncate">{report.location}</span>
          </span>
        )}

        {report.comments > 0 && (
          <span className="meta-item"><Icon.Chat width={13} height={13} />{report.comments}</span>
        )}

        {report.votes > 0 && (
          <span className="meta-item"><Icon.Up width={13} height={13} />{report.votes}</span>
        )}

        <span className="spacer" />

        {showReporter && <span className="truncate">{report.reporterName}</span>}
        <span className="mono">{timeAgo(report.createdAt)}</span>
      </div>
    </Link>
  )
}
