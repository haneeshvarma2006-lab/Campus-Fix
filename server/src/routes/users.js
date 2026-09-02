import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireRole, publicUser, asyncRoute } from '../auth.js'
import { validate, roleSchema } from '../validate.js'

const router = Router()

router.get('/', requireRole('admin'), asyncRoute(async (_req, res) => {
  const rows = await query(
    `SELECT u.*, (SELECT COUNT(*)::int FROM reports r WHERE r.reporter_id = u.id) AS report_count
     FROM users u ORDER BY u.created_at DESC`
  )
  res.json({ users: rows.map((u) => ({ ...publicUser(u), reportCount: u.report_count })) })
}))

router.patch('/:id/role', requireRole('admin'), validate(roleSchema), asyncRoute(async (req, res) => {
  const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : null
  const target = id && (await queryOne('SELECT * FROM users WHERE id = $1', [id]))
  if (!target) return res.status(404).json({ error: 'That user does not exist.' })

  if (target.id === req.user.id && req.body.role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin access.' })
  }

  // Never let the last admin be demoted — that would lock everyone out of the
  // dashboard with no way back short of editing the database by hand.
  if (target.role === 'admin' && req.body.role !== 'admin') {
    const [{ n }] = await query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'")
    if (n <= 1) return res.status(400).json({ error: 'This is the only admin account left.' })
  }

  const updated = await queryOne('UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
    [req.body.role, target.id])

  res.json({ user: publicUser(updated) })
}))

export default router
