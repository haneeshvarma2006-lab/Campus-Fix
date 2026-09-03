import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireAuth, requireRole, asyncRoute } from '../auth.js'
import { validate, locationSchema } from '../validate.js'
import { ACTIVE } from '../domain.js'

const router = Router()

/**
 * Every place on campus, each with a live count of what is still open there.
 * Drives both the location picker and the campus map, so the map needs no
 * second request.
 */
router.get('/', requireAuth, asyncRoute(async (_req, res) => {
  const locations = await query(
    `SELECT l.id, l.name, l.zone, l.x, l.y,
            COUNT(r.id) FILTER (WHERE r.status = ANY($1))::int AS open_count,
            COUNT(r.id) FILTER (WHERE r.status = 'fixed')::int  AS fixed_count,
            COUNT(r.id)::int AS total_count
     FROM locations l
     LEFT JOIN reports r ON r.location = l.name
     GROUP BY l.id
     ORDER BY l.zone, l.name`,
    [ACTIVE]
  )
  res.json({ locations })
}))

router.post('/', requireRole('admin'), validate(locationSchema), asyncRoute(async (req, res) => {
  const { name, zone, x, y } = req.body

  const existing = await queryOne('SELECT id FROM locations WHERE lower(name) = lower($1)', [name])
  if (existing) return res.status(409).json({ error: 'That location already exists.' })

  const location = await queryOne(
    'INSERT INTO locations (name, zone, x, y) VALUES ($1, $2, $3, $4) RETURNING id, name, zone, x, y',
    [name, zone, x, y]
  )
  res.status(201).json({ location: { ...location, open_count: 0, fixed_count: 0, total_count: 0 } })
}))

router.delete('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : null
  const location = id && (await queryOne('SELECT * FROM locations WHERE id = $1', [id]))
  if (!location) return res.status(404).json({ error: 'That location does not exist.' })

  // Reports keep the location name they were filed under, so removing one only
  // stops it being offered on new reports.
  const [{ n }] = await query('SELECT COUNT(*)::int AS n FROM reports WHERE location = $1', [location.name])
  await query('DELETE FROM locations WHERE id = $1', [location.id])

  res.json({ ok: true, reportsKeepingName: n })
}))

export default router
