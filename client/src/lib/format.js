/** The pipeline a report moves along, in order. */
export const PIPELINE = ['reported', 'assigned', 'in_progress', 'fixed']

/** Rejected sits outside the pipeline — a side exit for invalid reports. */
export const STATUSES = [...PIPELINE, 'rejected']

export const STATUS_LABEL = {
  reported: 'Reported',
  assigned: 'Assigned',
  in_progress: 'In progress',
  fixed: 'Fixed',
  rejected: 'Rejected',
}

/** What each stage actually means, shown as help text next to the tracker. */
export const STATUS_BLURB = {
  reported: 'Filed and waiting to be picked up.',
  assigned: 'Someone has been made responsible for it.',
  in_progress: 'Work has started on site.',
  fixed: 'Done and checked.',
  rejected: 'Closed without a fix — the reason is in the history.',
}

export const ACTIVE = ['reported', 'assigned', 'in_progress']
export const CLOSED = ['fixed', 'rejected']

export const PRIORITIES = ['low', 'normal', 'high', 'urgent']

export const PRIORITY_LABEL = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

/** Maps a status to its CSS colour variable, so SVG and CSS stay in step. */
export const STATUS_COLOR_VAR = {
  reported: 'var(--reported)',
  assigned: 'var(--assigned)',
  in_progress: 'var(--progress)',
  fixed: 'var(--fixed)',
  rejected: 'var(--rejected)',
}

/**
 * The categories a student picks from when reporting. Emoji rather than icons:
 * zero bytes to download, instantly recognisable, and they render everywhere.
 * `name` must match a row in the categories table.
 */
/**
 * Categories carry an icon name, not an emoji.
 *
 * Emoji are drawn by the operating system, so the same report looked different
 * on every phone — and on a mid-range Android the set renders inconsistently
 * enough to read as unfinished. A drawn icon is the same everywhere, takes the
 * text colour, and scales with the type.
 */
export const CATEGORY_META = {
  Electricity: { icon: 'Zap',         label: 'Electricity' },
  Water:       { icon: 'Droplets',    label: 'Water' },
  'Wi-Fi':     { icon: 'Wifi',        label: 'Wi-Fi' },
  Cleanliness: { icon: 'Sparkles',    label: 'Cleanliness' },
  Classroom:   { icon: 'Presentation',label: 'Classroom' },
  Hostel:      { icon: 'BedDouble',   label: 'Hostel' },
  Washroom:    { icon: 'ShowerHead',  label: 'Washroom' },
  Furniture:   { icon: 'Armchair',    label: 'Furniture' },
  Safety:      { icon: 'ShieldAlert', label: 'Safety' },
  Other:       { icon: 'Wrench',      label: 'Other' },
}

/** Falls back gracefully for a category an admin added later. */
export const categoryMeta = (name) =>
  CATEGORY_META[name] || { icon: 'Wrench', label: name }

export const ZONE_ICON = {
  Academic: 'School',
  Hostel: 'BedDouble',
  Common: 'Trees',
  Administration: 'Building2',
  Entrance: 'DoorOpen',
  Campus: 'MapPin',
}

export const ROLE_LABEL = {
  student: 'Student',
  admin: 'Admin',
}

/** Postgres returns ISO timestamps; be tolerant of anything date-like. */
export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const iso = typeof value === 'string' && value.includes(' ') && !value.includes('T')
    ? `${value.replace(' ', 'T')}Z`
    : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value) {
  const d = parseDate(value)
  if (!d) return ''
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  const d = parseDate(value)
  if (!d) return ''
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgo(value) {
  const d = parseDate(value)
  if (!d) return ''
  const seconds = Math.round((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const steps = [
    ['minute', 60], ['hour', 60], ['day', 24], ['week', 7], ['month', 4.35], ['year', 12],
  ]
  let amount = seconds / 60
  let unit = 'minute'
  for (let i = 1; i < steps.length; i++) {
    if (amount < steps[i][1]) break
    amount /= steps[i][1]
    unit = steps[i][0]
  }
  const n = Math.floor(amount)
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`
}

export function formatHours(hours) {
  if (hours == null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

/** Short weekday initial, for the trend axis. */
export function dayLabel(isoDay) {
  const d = parseDate(`${isoDay}T00:00:00Z`)
  return d ? d.toLocaleDateString(undefined, { weekday: 'narrow' }) : ''
}

/**
 * Restricts a post-sign-in redirect to somewhere inside this app.
 *
 * The Google callback reads its destination from the URL fragment, which
 * anyone can write. Without this, a crafted sign-in link could hand someone a
 * genuine session and then drop them on a page of somebody else's choosing —
 * the moment they are most likely to trust what they see.
 *
 * Anything that is not a single-slash path is refused, which covers the
 * protocol-relative `//evil.example` and the backslash forms browsers quietly
 * normalise into it.
 */
export function safeNext(value, fallback = '/') {
  if (typeof value !== 'string' || value.length === 0) return fallback
  const path = value.replace(new RegExp('\\\\', 'g'), '/')
  if (!path.startsWith('/')) return fallback
  if (path.startsWith('//')) return fallback
  if (/^\/+[a-zA-Z][a-zA-Z\d+\-.]*:/.test(path)) return fallback
  return path
}
