/**
 * The shared vocabulary of the app. Defined once here and imported everywhere
 * so the database constraints, the validators, and the API can never drift.
 */

/** The pipeline a report moves along, in order. */
export const PIPELINE = ['reported', 'assigned', 'in_progress', 'fixed']

/** Rejected sits outside the pipeline — a side exit for invalid or duplicate reports. */
export const TERMINAL = ['rejected']

export const STATUSES = [...PIPELINE, ...TERMINAL]

export const STATUS_LABEL = {
  reported: 'Reported',
  assigned: 'Assigned',
  in_progress: 'In progress',
  fixed: 'Fixed',
  rejected: 'Rejected',
}

/** A report is off the queue once it reaches one of these. */
export const CLOSED = ['fixed', 'rejected']

/** Open work, in the order a queue should be worked. */
export const ACTIVE = ['reported', 'assigned', 'in_progress']

export const ROLES = ['student', 'admin']

export const PRIORITIES = ['low', 'normal', 'high', 'urgent']

/** Rank used to sort a queue by urgency. */
export const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 }
