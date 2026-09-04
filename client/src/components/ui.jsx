import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { STATUS_LABEL, PRIORITY_LABEL } from '../lib/format'

/* --- icons ----------------------------------------------------------------- */
/*
 * Lucide, imported one icon at a time so the bundler only ships what is used.
 *
 * These were hand-drawn SVGs, which was fine for the fourteen we happened to
 * need and a problem for the fifteenth. Categories were emoji, which the
 * operating system draws — so the same report looked different on every phone,
 * and on a mid-range Android the set renders inconsistently enough to read as
 * unfinished. Drawn icons take the text colour, scale with the type, and look
 * the same everywhere.
 */
import {
  Home, Map, List, Plus, MapPin, Camera, MessageSquare, ArrowUp,
  ChevronLeft, ChevronRight, Check, Search, AlertCircle, Clock, Inbox,
  Trash2, Sun, Moon, LogOut, Settings, ExternalLink, X, Sparkles,
  Zap, Droplets, Wifi, Presentation, BedDouble, ShowerHead, Armchair,
  ShieldAlert, Wrench, School, Trees, Building2, DoorOpen, Bell, CircleCheckBig,
} from 'lucide-react'

/** Lucide's own defaults are 24px and stroke 2 — a little heavy next to this
    type. One place to change the weight of every icon in the app. */
const base = { size: 18, strokeWidth: 1.75, absoluteStrokeWidth: false }

const wrap = (C) => {
  const Wrapped = ({ width, height, ...p }) => (
    <C {...base} {...(width ? { size: width } : null)} {...p} />
  )
  Wrapped.displayName = C.displayName || 'Icon'
  return Wrapped
}

export const Icon = {
  Home: wrap(Home),
  Map: wrap(Map),
  List: wrap(List),
  Plus: wrap(Plus),
  Pin: wrap(MapPin),
  Camera: wrap(Camera),
  Chat: wrap(MessageSquare),
  Up: wrap(ArrowUp),
  Back: wrap(ChevronLeft),
  Next: wrap(ChevronRight),
  Check: wrap(Check),
  Search: wrap(Search),
  Alert: wrap(AlertCircle),
  Clock: wrap(Clock),
  Inbox: wrap(Inbox),
  Trash: wrap(Trash2),
  Sun: wrap(Sun),
  Moon: wrap(Moon),
  Logout: wrap(LogOut),
  Settings: wrap(Settings),
  External: wrap(ExternalLink),
  Close: wrap(X),

  // Google's mark is a brand asset, not a UI icon, so it stays hand-drawn.
  Google: (p) => (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...p}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  ),
}

/** Named in CATEGORY_META and ZONE_ICON, resolved here. Unknown names fall
    back rather than rendering nothing, so an admin can add a category the
    frontend has never heard of. */
const BY_NAME = {
  Zap, Droplets, Wifi, Sparkles, Presentation, BedDouble, ShowerHead,
  Armchair, ShieldAlert, Wrench, School, Trees, Building2, DoorOpen, MapPin,
  Camera, Bell, CircleCheckBig,
}

export function NamedIcon({ name, fallback = 'Wrench', ...p }) {
  const C = BY_NAME[name] || BY_NAME[fallback]
  return <C {...base} {...p} />
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
