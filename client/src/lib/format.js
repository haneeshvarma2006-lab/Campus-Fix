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
export const CATEGORY_META = {
  Electricity: { emoji: '🔌', label: 'Electricity' },
  Water:       { emoji: '🚰', label: 'Water' },
  'Wi-Fi':     { emoji: '📶', label: 'Wi-Fi' },
  Cleanliness: { emoji: '🧹', label: 'Cleanliness' },
  Classroom:   { emoji: '🏫', label: 'Classroom' },
  Hostel:      { emoji: '🛏️', label: 'Hostel' },
  Washroom:    { emoji: '🚿', label: 'Washroom' },
  Furniture:   { emoji: '🪑', label: 'Furniture' },
  Safety:      { emoji: '🦺', label: 'Safety' },
  Other:       { emoji: '🔧', label: 'Other' },
}

/** Falls back gracefully for a category an admin added later. */
export const categoryMeta = (name) =>
  CATEGORY_META[name] || { emoji: '🔧', label: name }

export const ZONE_EMOJI = {
  Academic: '🏫',
  Hostel: '🛏️',
  Common: '🌳',
  Administration: '🗂️',
  Entrance: '🚪',
  Campus: '📍',
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
