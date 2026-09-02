import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { STATUS_LABEL, PRIORITY_LABEL } from '../lib/format'

/* --- status + priority ----------------------------------------------------- */

export function StatusBadge({ status = 'open' }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="badge-dot" />
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export function PriorityTag({ priority = 'normal' }) {
  if (priority === 'normal') return null
  return <span className={`tag priority-${priority}`}>{PRIORITY_LABEL[priority]}</span>
}

/* --- toasts ---------------------------------------------------------------- */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, message, tone }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800)
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
          <div key={t.id} className={`toast ${t.tone === 'error' ? 'error' : ''}`}>{t.message}</div>
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

/* --- loading + empty states ------------------------------------------------ */

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid-reports">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card report-card" aria-hidden="true">
          <div className="row-between">
            <div className="skeleton" style={{ height: 12, width: 90 }} />
            <div className="skeleton" style={{ height: 22, width: 78, borderRadius: 999 }} />
          </div>
          <div className="skeleton" style={{ height: 17, width: '85%' }} />
          <div className="skeleton" style={{ height: 13, width: '100%' }} />
          <div className="skeleton" style={{ height: 13, width: '60%' }} />
          <div className="skeleton" style={{ height: 12, width: '45%', marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

/* --- icons ----------------------------------------------------------------- */
// Inline so there is no icon-font or SVG-sprite dependency to load.

const iconProps = {
  width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
}

export const Icon = {
  Pin: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M13 6.7c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0110 0z" />
      <circle cx="8" cy="6.6" r="1.8" />
    </svg>
  ),
  Chat: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M14 9.3a2 2 0 01-2 2H5l-3 2.7V4a2 2 0 012-2h8a2 2 0 012 2z" />
    </svg>
  ),
  Arrow: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M8 13V3M4 7l4-4 4 4" />
    </svg>
  ),
  Back: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M10 12L6 8l4-4" />
    </svg>
  ),
  Camera: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M2.5 5.5h2.2l1-1.6h4.6l1 1.6h2.2a1 1 0 011 1v6a1 1 0 01-1 1h-11a1 1 0 01-1-1v-6a1 1 0 011-1z" />
      <circle cx="8" cy="9.4" r="2.4" />
    </svg>
  ),
  Sun: (p) => (
    <svg {...iconProps} {...p}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
    </svg>
  ),
  Moon: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M13.5 9.6A5.8 5.8 0 016.4 2.5a5.8 5.8 0 107.1 7.1z" />
    </svg>
  ),
  Trash: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M2.8 4.3h10.4M6.2 4.3V3.1a.8.8 0 01.8-.8h2a.8.8 0 01.8.8v1.2M4.2 4.3l.6 8.6a.9.9 0 00.9.8h4.6a.9.9 0 00.9-.8l.6-8.6" />
    </svg>
  ),
  Check: (p) => (
    <svg {...iconProps} {...p}>
      <path d="M3 8.4l3.2 3.1L13 4.6" />
    </svg>
  ),
  Search: (p) => (
    <svg {...iconProps} {...p}>
      <circle cx="7.2" cy="7.2" r="4.4" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
}
