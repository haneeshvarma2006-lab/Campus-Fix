import { Link } from 'react-router-dom'
import { StatusBadge, PriorityTag, Icon, NamedIcon } from './ui'
import { timeAgo, categoryMeta } from '../lib/format'

export function ReportCard({ report, showReporter = false }) {
  const meta = categoryMeta(report.category)

  return (
    <Link to={`/reports/${report.id}`} className="card card-link rc">
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <span className="row g-2" style={{ minWidth: 0 }}>
          <NamedIcon name={meta.icon} width={18} height={18} aria-hidden="true" />
          <span className="tag">{meta.label}</span>
          <PriorityTag priority={report.priority} />
        </span>
        <StatusBadge status={report.status} />
      </div>

      <div className="row-top" style={{ gap: 12 }}>
        <span className="grow col g-1">
          <span className="rc-title clamp-2">{report.title}</span>
          <span className="t-sm muted clamp-2">{report.description}</span>
        </span>
        {report.photoUrl && (
          <img src={report.photoUrl} alt="" className="rc-thumb" loading="lazy" decoding="async" />
        )}
      </div>

      <div className="rc-meta">
        {report.location && (
          <span className="mi" style={{ maxWidth: '50%' }}>
            <Icon.Pin width={13} height={13} />
            <span className="truncate">{report.location}</span>
          </span>
        )}
        {report.comments > 0 && (
          <span className="mi"><Icon.Chat width={13} height={13} />{report.comments}</span>
        )}
        <span className="grow" />
        {showReporter && <span className="truncate">{report.reporterName}</span>}
        <span className="code">{timeAgo(report.createdAt)}</span>
      </div>
    </Link>
  )
}
