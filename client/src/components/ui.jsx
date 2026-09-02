import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { STATUS_LABEL, PRIORITY_LABEL } from '../lib/format'

/* --- icons ----------------------------------------------------------------- */
// Inline so there is no icon font or sprite sheet to load.

const base = {
  width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
}

export const Icon = {
  Pin: (p) => (
    <svg {...base} {...p}>
      <path d="M13 6.7c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0110 0z" />
      <circle cx="8" cy="6.6" r="1.7" />
    </svg>
  ),
  Chat: (p) => (
    <svg {...base} {...p}>
      <path d="M14 9.3a2 2 0 01-2 2H5l-3 2.7V4a2 2 0 012-2h8a2 2 0 012 2z" />
    </svg>
  ),
  Up: (p) => (
    <svg {...base} {...p}><path d="M8 13V3.5M4 7.5l4-4 4 4" /></svg>
  ),
  Back: (p) => (
    <svg {...base} {...p}><path d="M10 12.5L5.5 8 10 3.5" /></svg>
  ),
  Camera: (p) => (
    <svg {...base} {...p}>
      <path d="M2.5 5.5h2.2l1-1.6h4.6l1 1.6h2.2a1 1 0 011 1v6a1 1 0 01-1 1h-11a1 1 0 01-1-1v-6a1 1 0 011-1z" />
      <circle cx="8" cy="9.4" r="2.3" />
    </svg>
  ),
  Sun: (p) => (
    <svg {...base} {...p}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
    </svg>
  ),
  Moon: (p) => (
    <svg {...base} {...p}><path d="M13.5 9.6A5.8 5.8 0 016.4 2.5a5.8 5.8 0 107.1 7.1z" /></svg>
  ),
  Trash: (p) => (
    <svg {...base} {...p}>
      <path d="M2.8 4.3h10.4M6.2 4.3V3.1a.8.8 0 01.8-.8h2a.8.8 0 01.8.8v1.2M4.2 4.3l.6 8.6a.9.9 0 00.9.8h4.6a.9.9 0 00.9-.8l.6-8.6" />
    </svg>
  ),
  Check: (p) => (
    <svg {...base} {...p}><path d="M3 8.4l3.2 3.1L13 4.6" /></svg>
  ),
  Search: (p) => (
    <svg {...base} {...p}><circle cx="7.2" cy="7.2" r="4.4" /><path d="M10.5 10.5L14 14" /></svg>
  ),
  Alert: (p) => (
    <svg {...base} {...p}><circle cx="8" cy="8" r="6.2" /><path d="M8 5v3.6M8 10.9v.1" /></svg>
  ),
  Clock: (p) => (
    <svg {...base} {...p}><circle cx="8" cy="8" r="6.2" /><path d="M8 4.4V8l2.4 1.5" /></svg>
  ),
  Inbox: (p) => (
    <svg {...base} {...p}>
      <path d="M2 9.5h3l1 2h4l1-2h3M2.6 9.5l1.6-6a1 1 0 011-.7h5.6a1 1 0 011 .7l1.6 6v3a1 1 0 01-1 1H3.6a1 1 0 01-1-1z" />
    </svg>
  ),
  Bolt: (p) => (
    <svg {...base} {...p}><path d="M8.8 1.8L3.5 9h3.8l-.9 5.2L12.5 7H8.6z" /></svg>
  ),
  Shield: (p) => (
    <svg {...base} {...p}><path d="M8 1.8l5 1.9v4c0 3-2 5.5-5 6.5-3-1-5-3.5-5-6.5v-4z" /></svg>
  ),
  Layers: (p) => (
    <svg {...base} {...p}><path d="M8 1.8L1.8 5 8 8.2 14.2 5zM1.8 8.4L8 11.6l6.2-3.2M1.8 11.5L8 14.7l6.2-3.2" /></svg>
  ),
  Plus: (p) => (
    <svg {...base} {...p}><path d="M8 3.4v9.2M3.4 8h9.2" /></svg>
  ),
  External: (p) => (
    <svg {...base} {...p}><path d="M9.5 3h3.5v3.5M12.8 3.2L7.5 8.5M11 9.5v3a1 1 0 01-1 1H3.5a1 1 0 01-1-1V6a1 1 0 011-1h3" /></svg>
  ),
  Close: (p) => (
    <svg {...base} {...p}><path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" /></svg>
  ),
  Chart: (p) => (
    <svg {...base} {...p}><path d="M2.5 13.5h11M4.5 11V7M8 11V3.5M11.5 11V8.5" /></svg>
  ),
  Google: (p) => (
    // Google's brand mark keeps its own colours, so this one is not stroked.
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" {...p}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  ),
}

/* --- status and priority --------------------------------------------------- */

export function StatusBadge({ status = 'open' }) {
  return (
    <span className={`badge s-${status}`}>
      <span className="badge-dot" />
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export function StatusPill({ status }) {
  return <span className={`badge s-${status}`}><span className="badge-dot" />{STATUS_LABEL[status]}</span>
}

export function PriorityTag({ priority = 'normal' }) {
  if (priority === 'normal' || priority === 'low') return null
  return <span className={`tag p-${priority}`}>{PRIORITY_LABEL[priority]}</span>
}

/* --- avatar ---------------------------------------------------------------- */

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

export function Avatar({ name, src, size = '', title }) {
  return (
    <span className={`avatar ${size}`} title={title || name}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  )
}

/* --- toasts ---------------------------------------------------------------- */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000)
  }, [])

  const value = useMemo(() => ({
    notify: push,
    error: (message) => push(message, 'error'),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'error' ? 'error' : ''}`}>
            {t.tone === 'error' ? <Icon.Alert width={15} height={15} /> : <Icon.Check width={15} height={15} />}
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

/* --- loading and empty states ---------------------------------------------- */

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid-reports" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card report-card">
          <div className="between">
            <div className="skeleton" style={{ height: 12, width: 96 }} />
            <div className="skeleton" style={{ height: 22, width: 82, borderRadius: 99 }} />
          </div>
          <div className="skeleton" style={{ height: 17, width: '82%' }} />
          <div className="stack g-2">
            <div className="skeleton" style={{ height: 12, width: '100%' }} />
            <div className="skeleton" style={{ height: 12, width: '58%' }} />
          </div>
          <div className="skeleton" style={{ height: 12, width: '45%', marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: IconComponent = Icon.Inbox, title, message, action }) {
  return (
    <div className="empty fade-in">
      <div className="empty-mark"><IconComponent width={20} height={20} /></div>
      <h3 className="h3">{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}
