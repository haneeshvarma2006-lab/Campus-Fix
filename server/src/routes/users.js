import { Router } from 'express'
import { db } from '../db.js'
import { requireRole, publicUser } from '../auth.js'
import { validate, roleSchema } from '../validate.js'

const router = Router()

router.get('/', requireRole('admin'), (_req, res) => {
  const rows = db.prepare(`
    SELECT u.*, (SELECT COUNT(*) FROM reports r WHERE r.reporter_id = u.id) AS report_count
    FROM users u ORDER BY u.created_at DESC
  `).all()

  res.json({
    users: rows.map((u) => ({ ...publicUser(u), reportCount: u.report_count })),
  })
})

router.patch('/:id/role', requireRole('admin'), validate(roleSchema), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!target) return res.status(404).json({ error: 'That user does not exist.' })

  if (target.id === req.user.id && req.body.role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin access.' })
  }

  // Never let the last admin be demoted — that would lock everyone out of the
  // dashboard with no way back in short of editing the database by hand.
  if (target.role === 'admin' && req.body.role !== 'admin') {
    const admins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n
    if (admins <= 1) return res.status(400).json({ error: 'This is the only admin account left.' })
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, target.id)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(target.id)) })
})

export default router
