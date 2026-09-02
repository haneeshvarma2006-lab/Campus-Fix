import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, isStaff } from '../auth.js'

const router = Router()

const EMPTY_COUNTS = { open: 0, in_progress: 0, resolved: 0, rejected: 0 }

/**
 * Overview numbers for the dashboard. Staff see the whole system; a citizen
 * sees the same shape scoped to their own reports, so one component renders both.
 */
router.get('/', requireAuth, (req, res) => {
  const scoped = !isStaff(req.user)
  const where = scoped ? 'WHERE reporter_id = @uid' : ''
  const params = { uid: req.user.id }

  const counts = { ...EMPTY_COUNTS }
  for (const row of db.prepare(`SELECT status, COUNT(*) AS n FROM reports ${where} GROUP BY status`).all(params)) {
    counts[row.status] = row.n
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) AS n FROM reports ${where}
    GROUP BY category ORDER BY n DESC LIMIT 8
  `).all(params).map((r) => ({ category: r.category, count: r.n }))

  // Reports filed per day over the last two weeks, for the trend strip.
  const daily = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS n FROM reports
    ${scoped ? 'WHERE reporter_id = @uid AND' : 'WHERE'} date(created_at) >= date('now', '-13 days')
    GROUP BY day ORDER BY day ASC
  `).all(params)

  const trend = []
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    trend.push({ day, count: daily.find((d) => d.day === day)?.n || 0 })
  }

  // Median-free simple average, in hours, over reports that actually resolved.
  const resolution = db.prepare(`
    SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS hours
    FROM reports ${scoped ? 'WHERE reporter_id = @uid AND' : 'WHERE'} resolved_at IS NOT NULL
  `).get(params).hours

  res.json({
    scope: scoped ? 'mine' : 'all',
    total,
    counts,
    byCategory,
    trend,
    avgResolutionHours: resolution == null ? null : Math.round(resolution * 10) / 10,
    resolutionRate: total ? Math.round((counts.resolved / total) * 100) : 0,
  })
})

export default router
