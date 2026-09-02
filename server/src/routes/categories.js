import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireAuth, requireRole, asyncRoute } from '../auth.js'
import { validate, categorySchema } from '../validate.js'

const router = Router()

// Any signed-in user needs the list to fill the submit form's dropdown.
router.get('/', requireAuth, asyncRoute(async (_req, res) => {
  const categories = await query(
    `SELECT c.id, c.name,
            (SELECT COUNT(*)::int FROM reports r WHERE r.category = c.name) AS report_count
     FROM categories c ORDER BY c.name`
  )
  res.json({ categories })
}))

router.post('/', requireRole('admin'), validate(categorySchema), asyncRoute(async (req, res) => {
  const existing = await queryOne('SELECT id FROM categories WHERE lower(name) = lower($1)', [req.body.name])
  if (existing) return res.status(409).json({ error: 'That category already exists.' })

  const category = await queryOne(
    'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
    [req.body.name]
  )
  res.status(201).json({ category: { ...category, report_count: 0 } })
}))

router.delete('/:id', requireRole('admin'), asyncRoute(async (req, res) => {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : null
  const category = id && (await queryOne('SELECT * FROM categories WHERE id = $1', [id]))
  if (!category) return res.status(404).json({ error: 'That category does not exist.' })

  // Reports keep the category name they were filed under, so removing a
  // category only stops it being offered on new reports.
  const [{ n }] = await query('SELECT COUNT(*)::int AS n FROM reports WHERE category = $1', [category.name])
  await query('DELETE FROM categories WHERE id = $1', [category.id])

  res.json({ ok: true, reportsKeepingName: n })
}))

export default router
