export const STATUSES = ['open', 'in_progress', 'resolved', 'rejected']

export const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
}

export const PRIORITIES = ['low', 'normal', 'high', 'urgent']

export const PRIORITY_LABEL = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

/** SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; make it a real Date. */
export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const iso = typeof value === 'string' && value.includes(' ') ? `${value.replace(' ', 'T')}Z` : value
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

  const units = [
    ['minute', 60], ['hour', 60], ['day', 24], ['week', 7], ['month', 4.35], ['year', 12],
  ]
  let value_ = seconds / 60
  let unit = 'minute'
  for (let i = 0; i < units.length; i++) {
    const [name, divisor] = units[i]
    if (i === 0) { unit = name; continue }
    if (value_ < divisor) break
    value_ /= divisor
    unit = name
  }
  const n = Math.floor(value_)
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`
}

export function formatHours(hours) {
  if (hours == null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 48) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}
