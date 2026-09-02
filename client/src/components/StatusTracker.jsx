import { PIPELINE, STATUS_LABEL, STATUS_BLURB } from '../lib/format'
import { Icon } from './ui'

/**
 * The four-stage journey a report takes, drawn as a progress rail.
 *
 * A rejected report never reaches "Fixed", so the rail is replaced by a single
 * clear statement rather than a progress bar frozen part-way along.
 */
export function StatusTracker({ status, compact = false }) {
  if (status === 'rejected') {
    return (
      <div className="tracker-rejected">
        <span className="tracker-x"><Icon.Close width={13} height={13} /></span>
        <div className="stack g-1">
          <strong style={{ fontSize: 14 }}>Closed without a fix</strong>
          <span className="tiny muted">{STATUS_BLURB.rejected}</span>
        </div>
      </div>
    )
  }

  const current = Math.max(0, PIPELINE.indexOf(status))

  return (
    <ol className={`tracker ${compact ? 'tracker-compact' : ''}`} aria-label="Progress">
      {PIPELINE.map((stage, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li key={stage} className={`tracker-step is-${state}`} aria-current={state === 'current' || undefined}>
            <span className="tracker-rail" aria-hidden="true" />
            <span className="tracker-node">
              {state === 'done' ? <Icon.Check width={11} height={11} /> : <span className="tracker-pip" />}
            </span>
            <span className="tracker-text">
              <span className="tracker-label">{STATUS_LABEL[stage]}</span>
              {!compact && <span className="tracker-blurb">{STATUS_BLURB[stage]}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
