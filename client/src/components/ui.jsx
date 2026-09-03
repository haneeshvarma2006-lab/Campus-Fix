import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { STATUS_LABEL, PRIORITY_LABEL } from '../lib/format'

/* --- icons ----------------------------------------------------------------- */
/* Inline strokes rather than an icon font: nothing to download, and they
   inherit colour and size from the surrounding text. */

const s = {
  width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
}

export const Icon = {
  Home: (p) => <svg {...s} {...p}><path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1h-3.5v-5h-5v5H4a1 1 0 0 1-1-1z" /></svg>,
  Map: (p) => <svg {...s} {...p}><path d="M7.5 3 3 5v12l4.5-2 5 2L17 15V3l-4.5 2z" /><path d="M7.5 3v12M12.5 5v12" /></svg>,
  List: (p) => <svg {...s} {...p}><path d="M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01" /></svg>,
  Plus: (p) => <svg {...s} {...p}><path d="M10 4.5v11M4.5 10h11" /></svg>,
  Pin: (p) => <svg {...s} {...p}><path d="M16 8.4c0 4.3-6 9.6-6 9.6s-6-5.3-6-9.6a6 6 0 0 1 12 0z" /><circle cx="10" cy="8.3" r="2.1" /></svg>,
  Camera: (p) => <svg {...s} {...p}><path d="M3 7h2.7l1.2-2h6.2l1.2 2H17a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="10" cy="11.5" r="2.8" /></svg>,
  Chat: (p) => <svg {...s} {...p}><path d="M17.5 11.6a2.4 2.4 0 0 1-2.4 2.4H6.5L3 17V4.9a2.4 2.4 0 0 1 2.4-2.4h9.7a2.4 2.4 0 0 1 2.4 2.4z" /></svg>,
  Up: (p) => <svg {...s} {...p}><path d="M10 16V4.5M5 9.5l5-5 5 5" /></svg>,
  Back: (p) => <svg {...s} {...p}><path d="M12.5 15.5 7 10l5.5-5.5" /></svg>,
  Next: (p) => <svg {...s} {...p}><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>,
  Check: (p) => <svg {...s} {...p}><path d="M4 10.5 8 14.5 16 6" /></svg>,
  Search: (p) => <svg {...s} {...p}><circle cx="9" cy="9" r="5.5" /><path d="M13.2 13.2 17 17" /></svg>,
  Alert: (p) => <svg {...s} {...p}><circle cx="10" cy="10" r="7.6" /><path d="M10 6.2v4.4M10 13.4v.1" /></svg>,
  Clock: (p) => <svg {...s} {...p}><circle cx="10" cy="10" r="7.6" /><path d="M10 5.5V10l3 1.9" /></svg>,
  Inbox: (p) => <svg {...s} {...p}><path d="M2.5 12h4l1.2 2.4h4.6L13.5 12h4M3.2 12l2-7.4a1.2 1.2 0 0 1 1.2-.9h7.2a1.2 1.2 0 0 1 1.2.9l2 7.4v3.6a1.2 1.2 0 0 1-1.2 1.2H4.4a1.2 1.2 0 0 1-1.2-1.2z" /></svg>,
  Trash: (p) => <svg {...s} {...p}><path d="M3.5 5.4h13M7.8 5.4V4a1 1 0 0 1 1-1h2.4a1 1 0 0 1 1 1v1.4M5.3 5.4l.8 10.8a1.1 1.1 0 0 0 1.1 1h5.6a1.1 1.1 0 0 0 1.1-1l.8-10.8" /></svg>,
  Sun: (p) => <svg {...s} {...p}><circle cx="10" cy="10" r="3.6" /><path d="M10 1.4v2M10 16.6v2M18.6 10h-2M3.4 10h-2M16.1 3.9l-1.4 1.4M5.3 14.7l-1.4 1.4M16.1 16.1l-1.4-1.4M5.3 5.3 3.9 3.9" /></svg>,
  Moon: (p) => <svg {...s} {...p}><path d="M16.9 12a7.2 7.2 0 0 1-8.9-8.9 7.2 7.2 0 1 0 8.9 8.9z" /></svg>,
  Logout: (p) => <svg {...s} {...p}><path d="M12.5 6V4.2a1.2 1.2 0 0 0-1.2-1.2H4.7a1.2 1.2 0 0 0-1.2 1.2v11.6a1.2 1.2 0 0 0 1.2 1.2h6.6a1.2 1.2 0 0 0 1.2-1.2V14M8 10h9.5M15 7.5 17.5 10 15 12.5" /></svg>,
  Settings: (p) => <svg {...s} {...p}><circle cx="10" cy="10" r="2.6" /><path d="M15.9 12.2a1.3 1.3 0 0 0 .3 1.4l.1.1a1.6 1.6 0 1 1-2.2 2.2l-.1-.1a1.3 1.3 0 0 0-2.2.9v.2a1.6 1.6 0 1 1-3.2 0v-.1a1.3 1.3 0 0 0-2.2-.9l-.1.1a1.6 1.6 0 1 1-2.2-2.2l.1-.1a1.3 1.3 0 0 0-.9-2.2H3.2a1.6 1.6 0 1 1 0-3.2h.1a1.3 1.3 0 0 0 .9-2.2l-.1-.1a1.6 1.6 0 1 1 2.2-2.2l.1.1a1.3 1.3 0 0 0 2.2-.9V3a1.6 1.6 0 1 1 3.2 0v.1a1.3 1.3 0 0 0 2.2.9l.1-.1a1.6 1.6 0 1 1 2.2 2.2l-.1.1a1.3 1.3 0 0 0 .9 2.2h.2a1.6 1.6 0 1 1 0 3.2h-.1a1.3 1.3 0 0 0-1.2.8z" /></svg>,
  External: (p) => <svg {...s} {...p}><path d="M12 3.5h4.5V8M16 4 9.5 10.5M14 12v3.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H8" /></svg>,
  Google: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...p}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  ),
}

/* --- status ---------------------------------------------------------------- */

export function StatusBadge({ status = 'reported' }) {
  return (
    <span className={`badge s-${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export function PriorityTag({ priority = 'normal' }) {
  if (priority !== 'urgent' && priority !== 'high') return null
  return <span className="tag" style={{ color: 'var(--danger)' }}>{PRIORITY_LABEL[priority]}</span>
}

/* --- avatar ---------------------------------------------------------------- */

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

export function Avatar({ name, src, title }) {
  return (
    <span className="avatar" title={title || name}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" /> : initials(name)}
    </span>
  )
}

/* --- toasts ---------------------------------------------------------------- */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, bad = false) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, message, bad }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3600)
  }, [])

  const value = useMemo(() => ({
    notify: (m) => push(m, false),
    error: (m) => push(m, true),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>
            {t.bad ? <Icon.Alert width={16} height={16} /> : <Icon.Check width={16} height={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/* --- states ---------------------------------------------------------------- */

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="reports" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card rc">
          <div className="between">
            <div className="skel" style={{ height: 11, width: 80 }} />
            <div className="skel" style={{ height: 20, width: 74, borderRadius: 99 }} />
          </div>
          <div className="skel" style={{ height: 16, width: '78%' }} />
          <div className="skel" style={{ height: 11, width: '52%' }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: I = Icon.Inbox, title, message, action }) {
  return (
    <div className="empty in">
      <div className="empty-mark"><I width={21} height={21} /></div>
      <h3 className="t-h3">{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

export const Spinner = () => <span className="spin" aria-hidden="true" />

/** Full-page fallback while a lazily loaded route arrives. */
export function RouteFallback() {
  return (
    <div className="wrap page">
      <div className="col g-3">
        <div className="skel" style={{ height: 26, width: 190 }} />
        <div className="skel" style={{ height: 14, width: 280 }} />
        <div className="skel" style={{ height: 120, width: '100%', marginTop: 8 }} />
      </div>
    </div>
  )
}
