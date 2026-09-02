import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge, PriorityTag, Avatar, useToast, Icon, Spinner } from '../components/ui'
import { StatusTracker } from '../components/StatusTracker'
import {
  STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL, formatDateTime, timeAgo,
} from '../lib/format'

function EventLine({ event }) {
  const label = event.type === 'created'
    ? 'Report filed'
    : event.type === 'priority'
      ? `Priority changed from ${PRIORITY_LABEL[event.fromStatus] || event.fromStatus} to ${PRIORITY_LABEL[event.toStatus] || event.toStatus}`
      : `Moved to ${STATUS_LABEL[event.toStatus] || event.toStatus}`

  return (
    <div className="timeline-item">
      <span className={`timeline-dot t-${event.toStatus || 'reported'}`}>
        {event.toStatus === 'fixed' && <Icon.Check width={9} height={9} />}
      </span>
      <div className="stack g-2" style={{ flex: 1, minWidth: 0 }}>
        <div className="row wrap" style={{ gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 550 }}>{label}</span>
          <span className="tiny faint mono">{formatDateTime(event.createdAt)}</span>
        </div>
        {event.actorName && <span className="tiny faint">by {event.actorName}</span>}
        {event.note && <p className="timeline-note">{event.note}</p>}
      </div>
    </div>
  )
}

export function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { notify, error: toastError } = useToast()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState('')
  const [comment, setComment] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback((signal) => {
    setLoading(true)
    return api.getReport(id, signal)
      .then(setData)
      .catch((err) => { if (err.name !== 'AbortError') setNotFound(err.message) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  if (loading) {
    return (
      <div className="shell-wide page">
        <div className="stack g-3">
          <div className="skeleton" style={{ height: 14, width: 130 }} />
          <div className="skeleton" style={{ height: 32, width: '55%' }} />
          <div className="skeleton" style={{ height: 220, width: '100%' }} />
        </div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="shell page">
        <div className="empty">
          <div className="empty-mark"><Icon.Alert width={20} height={20} /></div>
          <h3 className="h3">Report unavailable</h3>
          <p>{notFound || 'That report could not be loaded.'}</p>
          <Link to="/reports" className="btn btn-ghost">Back to my reports</Link>
        </div>
      </div>
    )
  }

  const { report, events, comments } = data
  const canDelete = report.reporterId === user?.id || isAdmin
  const backTo = isAdmin ? '/admin' : '/reports'

  const changeStatus = async (status) => {
    if (status === 'rejected' && !statusNote.trim()) {
      return toastError('Give a reason before rejecting a report.')
    }
    setBusy(true)
    try {
      await api.setStatus(report.id, { status, note: statusNote.trim() || undefined })
      setStatusNote('')
      await load()
      notify(`Moved to ${STATUS_LABEL[status].toLowerCase()}.`)
    } catch (err) {
      toastError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const changePriority = async (priority) => {
    setBusy(true)
    try {
      await api.setPriority(report.id, { priority })
      await load()
      notify(`Priority set to ${PRIORITY_LABEL[priority].toLowerCase()}.`)
    } catch (err) {
      toastError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleVote = async () => {
    try {
      const { report: updated } = await api.vote(report.id)
      setData((d) => ({ ...d, report: updated }))
    } catch (err) {
      toastError(err.message)
    }
  }

  const addComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setBusy(true)
    try {
      const { comment: created } = await api.comment(report.id, { body: comment.trim() })
      setData((d) => ({ ...d, comments: [...d.comments, created] }))
      setComment('')
    } catch (err) {
      toastError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this report permanently? This cannot be undone.')) return
    setBusy(true)
    try {
      await api.deleteReport(report.id)
      notify('Report deleted.')
      navigate(backTo, { replace: true })
    } catch (err) {
      toastError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="shell-wide page fade-in">
      <Link to={backTo} className="btn btn-quiet btn-sm" style={{ marginBottom: 16, marginLeft: -11 }}>
        <Icon.Back /> {isAdmin ? 'Dashboard' : 'My reports'}
      </Link>

      <div className="detail-grid">
        {/* --- main column --- */}
        <div className="stack g-6">
          <div>
            <div className="row wrap" style={{ gap: 9, marginBottom: 12 }}>
              <span className="code">#{report.code}</span>
              <StatusBadge status={report.status} />
              <span className="tag">{report.category}</span>
              <PriorityTag priority={report.priority} />
            </div>

            <h1 className="display" style={{ fontSize: 'clamp(28px, 3.8vw, 40px)', marginBottom: 12 }}>
              {report.title}
            </h1>

            <p className="small muted">
              Filed by {report.reporterName} · {timeAgo(report.createdAt)}
              {report.updatedAt !== report.createdAt && ` · updated ${timeAgo(report.updatedAt)}`}
            </p>
          </div>

          {/* The four-stage journey, front and centre. */}
          <div className="card">
            <StatusTracker status={report.status} />
          </div>

          {report.photoUrl && (
            <img src={report.photoUrl} alt={report.title} className="detail-photo" />
          )}

          <div className="card">
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.68 }}>{report.description}</p>
          </div>

          <div>
            <h2 className="h2" style={{ marginBottom: 16 }}>History</h2>
            <div className="card">
              <div className="timeline">
                {events.map((e) => <EventLine key={e.id} event={e} />)}
              </div>
            </div>
          </div>

          <div>
            <h2 className="h2" style={{ marginBottom: 16 }}>
              Comments {comments.length > 0 && <span className="faint" style={{ fontWeight: 400 }}>· {comments.length}</span>}
            </h2>

            <div className="stack g-4">
              {comments.length === 0 && (
                <p className="small muted">
                  No comments yet. The reporter and the maintenance team can talk here.
                </p>
              )}

              {comments.map((c) => (
                <div key={c.id} className="row-top" style={{ gap: 12 }}>
                  <Avatar name={c.authorName} src={c.authorAvatar} size="avatar-sm" />
                  <div className="stack g-2" style={{ flex: 1, minWidth: 0 }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <strong style={{ fontSize: 13.5 }}>{c.authorName}</strong>
                      {c.authorRole === 'admin' && <span className="role-pill">Admin</span>}
                      <span className="tiny faint mono">{timeAgo(c.createdAt)}</span>
                    </div>
                    <div className="comment-body">{c.body}</div>
                  </div>
                </div>
              ))}

              <form onSubmit={addComment} className="stack g-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  maxLength={2000}
                  className="input"
                  style={{ minHeight: 84, resize: 'vertical' }}
                />
                <div className="row">
                  <span className="char-count">{comment.length}/2000</span>
                  <span className="spacer" />
                  <button type="submit" className="btn btn-sm" disabled={busy || !comment.trim()}>
                    Post comment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* --- side column --- */}
        <aside className="stack g-4 sticky-side">
          <div className="card">
            <h3 className="h3" style={{ marginBottom: 12 }}>Details</h3>
            <dl style={{ margin: 0 }}>
              <div className="kv"><dt>Reference</dt><dd className="mono">#{report.code}</dd></div>
              <div className="kv"><dt>Stage</dt><dd>{STATUS_LABEL[report.status]}</dd></div>
              <div className="kv"><dt>Priority</dt><dd>{PRIORITY_LABEL[report.priority]}</dd></div>
              <div className="kv"><dt>Category</dt><dd>{report.category}</dd></div>
              <div className="kv"><dt>Location</dt><dd>{report.location || '—'}</dd></div>
              <div className="kv"><dt>Filed</dt><dd>{formatDateTime(report.createdAt)}</dd></div>
              {report.fixedAt && (
                <div className="kv"><dt>Fixed</dt><dd>{formatDateTime(report.fixedAt)}</dd></div>
              )}
            </dl>

            {report.coords && (
              <a
                className="btn btn-ghost btn-sm btn-block"
                style={{ marginTop: 14 }}
                href={`https://www.openstreetmap.org/?mlat=${report.coords.latitude}&mlon=${report.coords.longitude}#map=18/${report.coords.latitude}/${report.coords.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon.Pin /> Open on a map <Icon.External width={12} height={12} />
              </a>
            )}

            <button
              className={`btn btn-sm btn-block ${report.hasVoted ? '' : 'btn-ghost'}`}
              style={{ marginTop: 8 }}
              onClick={toggleVote}
            >
              <Icon.Up />
              {report.hasVoted ? 'Backed' : 'Back this'} · {report.votes}
            </button>
          </div>

          {isAdmin && (
            <div className="card">
              <h3 className="h3" style={{ marginBottom: 4 }}>Update</h3>
              <p className="tiny faint" style={{ marginBottom: 14 }}>
                Visible to the reporter as soon as you save it.
              </p>

              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="note">
                  Note <span className="faint" style={{ fontWeight: 400 }}>· required to reject</span>
                </label>
                <textarea
                  id="note"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Assigned to the maintenance team."
                  maxLength={500}
                  style={{ minHeight: 68 }}
                />
              </div>

              <span className="label" style={{ display: 'block', marginBottom: 8 }}>Move to</span>
              <div className="row wrap" style={{ gap: 6, marginBottom: 16 }}>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    className={`chip ${report.status === s ? 'active' : ''}`}
                    disabled={busy}
                    onClick={() => changeStatus(s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <label htmlFor="priority" className="label" style={{ display: 'block', marginBottom: 8 }}>
                Priority
              </label>
              <select
                id="priority"
                className="input"
                value={report.priority}
                disabled={busy}
                onChange={(e) => changePriority(e.target.value)}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
          )}

          {canDelete && (
            <button className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
              <Icon.Trash /> Delete report
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
