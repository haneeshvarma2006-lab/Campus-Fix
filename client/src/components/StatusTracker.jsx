import { PIPELINE, STATUS_LABEL, STATUS_BLURB } from '../lib/format'
import { Icon } from './ui'

/**
 * The four-stage journey a report takes, drawn as a horizontal rail.
 *
 * A rejected report never reaches "Fixed", so the rail is replaced by a single
 * clear statement rather than a progress bar frozen part-way along.
 */
export function StatusTracker({ status, compact = false }) {
  if (status === 'rejected') {
    return (
      <div className="track-rejected">
        <span className="track-x" aria-hidden="true">✕</span>
        <span className="col g-1">
          <strong className="t-sm">Closed without a fix</strong>
          <span className="t-xs muted">{STATUS_BLURB.rejected}</span>
        </span>
      </div>
    )
  }

  const current = Math.max(0, PIPELINE.indexOf(status))

  return (
    <div className="col g-1" aria-label={`Progress: ${STATUS_LABEL[status]}`}>
      <div className="track">
        {PIPELINE.map((stage, i) => {
          const done = i < current
          const now = i === current
          return (
            <span key={stage} style={{ display: 'contents' }}>
              {i > 0 && <span className={`track-line ${i <= current ? 'done' : ''}`} />}
              <span
                className={`track-node ${done ? 'done' : ''} ${now ? 'now' : ''}`}
                title={STATUS_LABEL[stage]}
              >
                {done ? <Icon.Check width={12} height={12} /> : <span className="track-pip" />}
              </span>
            </span>
          )
        })}
      </div>

      <div className="track-labels">
        {PIPELINE.map((stage, i) => (
          <span key={stage} className={i <= current ? 'on' : ''}>{STATUS_LABEL[stage]}</span>
        ))}
      </div>

      {!compact && (
        <p className="t-sm muted" style={{ marginTop: 6 }}>{STATUS_BLURB[status]}</p>
      )}
    </div>
  )
}
