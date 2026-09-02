import { z } from 'zod'
import { STATUSES, ROLES, PRIORITIES } from './domain.js'

/**
 * Runs a zod schema against a request property and replaces it with the parsed
 * value, so downstream handlers always see coerced, trimmed data.
 *
 * Uploads are held in memory until a request validates, so a rejected request
 * cannot leave an orphaned file behind.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const first = result.error.issues[0]
      return res.status(400).json({
        error: first?.message || 'That request was not valid.',
        field: first?.path?.join('.') || undefined,
      })
    }
    // Express 5 exposes req.query as a getter, so parsed query params go to
    // their own property rather than being assigned back.
    if (source === 'query') req.validatedQuery = result.data
    else req[source] = result.data
    next()
  }
}

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Your name needs at least 2 characters.').max(80),
  email: z.string().trim().toLowerCase().email('That does not look like a valid email address.'),
  password: z.string().min(8, 'Use a password of at least 8 characters.').max(200),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('That does not look like a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || v === 'null' ? undefined : Number(v)),
  z.number().finite().optional()
)

export const reportSchema = z
  .object({
    title: z.string().trim().min(5, 'Give the report a title of at least 5 characters.').max(140),
    description: z.string().trim().min(10, 'Describe the issue in at least 10 characters.').max(4000),
    category: z.string().trim().min(1).max(60).default('General'),
    location: z.string().trim().max(200).default(''),
    latitude: optionalNumber.refine((v) => v === undefined || (v >= -90 && v <= 90), 'Latitude is out of range.'),
    longitude: optionalNumber.refine((v) => v === undefined || (v >= -180 && v <= 180), 'Longitude is out of range.'),
    priority: z.enum(PRIORITIES).default('normal'),
  })
  .refine(
    // A pin needs both halves — one on its own is a location that can never be shown.
    (v) => (v.latitude === undefined) === (v.longitude === undefined),
    { message: 'A map pin needs both a latitude and a longitude.', path: ['longitude'] }
  )

export const statusSchema = z.object({
  status: z.enum(STATUSES, { errorMap: () => ({ message: 'Pick a valid status.' }) }),
  note: z.string().trim().max(500).optional(),
}).refine(
  // Rejecting a report without saying why leaves the reporter with nothing.
  (v) => v.status !== 'rejected' || (v.note && v.note.length > 0),
  { message: 'Give a reason when rejecting a report.', path: ['note'] }
)

export const prioritySchema = z.object({
  priority: z.enum(PRIORITIES),
})

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write something first.').max(2000),
})

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category names need at least 2 characters.').max(60),
})

export const roleSchema = z.object({
  role: z.enum(ROLES),
})

export const listQuerySchema = z.object({
  scope: z.enum(['mine', 'all']).default('all'),
  // "active" is the working queue: everything not yet fixed or rejected.
  status: z.enum(['all', 'active', ...STATUSES]).default('all'),
  category: z.string().trim().default('all'),
  location: z.string().trim().max(120).default('all'),
  q: z.string().trim().max(120).default(''),
  sort: z.enum(['newest', 'oldest', 'votes', 'priority']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})
