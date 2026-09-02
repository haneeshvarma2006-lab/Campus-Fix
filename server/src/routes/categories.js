import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'
import { validate, categorySchema } from '../validate.js'

const router = Router()

// Any signed-in user needs the list to fill the submit form's dropdown.
router.get('/', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT id, name FROM categories ORDER BY name COLLATE NOCASE').all()
  res.json({ categories: rows })
})

router.post('/', requireRole('admin'), validate(categorySchema), (req, res) => {
  const existing = db.prepare('SELECT id, name FROM categories WHERE name = ?').get(req.body.name)
  if (existing) return res.status(409).json({ error: 'That category already exists.' })

  const { lastInsertRowid } = db.prepare('INSERT INTO categories (name) VALUES (?)').run(req.body.name)
  res.status(201).json({ category: { id: lastInsertRowid, name: req.body.name } })
})

router.delete('/:id', requireRole('admin'), (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!category) return res.status(404).json({ error: 'That category does not exist.' })

  // Reports keep the category name they were filed under, so removing a
  // category only stops it being offered on new reports.
  db.prepare('DELETE FROM categories WHERE id = ?').run(category.id)
  const inUse = db.prepare('SELECT COUNT(*) AS n FROM reports WHERE category = ?').get(category.name).n
  res.json({ ok: true, reportsKeepingName: inUse })
})

export default router
