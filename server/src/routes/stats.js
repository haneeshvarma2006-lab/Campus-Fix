import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth, isStaff, asyncRoute } from '../auth.js'

const router = Router()

const EMPTY_COUNTS = { open: 0, in_progress: 0, resolved: 0, rejected: 0 }

/**
 * Overview numbers for the dashboard. Staff see the whole system; a citizen
 * sees the same shape scoped to their own reports, so one component renders both.
 */
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const scoped = !isStaff(req.user)
  const filter = scoped ? 'WHERE reporter_id = $1' : ''
  const andFilter = scoped ? 'AND reporter_id = $1' : ''
  const params = scoped ? [req.user.id] : []

  const [statusRows, categoryRows, dailyRows, [resolution], [backlog]] = await Promise.all([
    query(`SELECT status, COUNT(*)::int AS n FROM reports ${filter} GROUP BY status`, params),

    query(
      `SELECT category, COUNT(*)::int AS n FROM reports ${filter}
       GROUP BY category ORDER BY n DESC, category ASC LIMIT 8`,
      params
    ),

    query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
       FROM reports
       WHERE created_at >= date_trunc('day', now()) - interval '13 days' ${andFilter}
       GROUP BY 1 ORDER BY 1`,
      params
    ),

    query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0) AS hours
       FROM reports WHERE resolved_at IS NOT NULL ${andFilter}`,
      params
    ),

    // How long the oldest still-unresolved report has been waiting.
    query(
      `SELECT MAX(EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0) AS days
       FROM reports WHERE status IN ('open','in_progress') ${andFilter}`,
      params
    ),
  ])

  const counts = { ...EMPTY_COUNTS }
  for (const row of statusRows) counts[row.status] = row.n
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  // Fill in the days with no reports so the trend strip is always 14 wide.
  const trend = []
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    trend.push({ day, count: dailyRows.find((d) => d.day === day)?.n || 0 })
  }

  const hours = resolution?.hours == null ? null : Number(resolution.hours)
  const oldestDays = backlog?.days == null ? null : Number(backlog.days)
  const closed = counts.resolved + counts.rejected

  res.json({
    scope: scoped ? 'mine' : 'all',
    total,
    counts,
    byCategory: categoryRows.map((r) => ({ category: r.category, count: r.n })),
    trend,
    avgResolutionHours: hours == null ? null : Math.round(hours * 10) / 10,
    resolutionRate: closed ? Math.round((counts.resolved / closed) * 100) : 0,
    openCount: counts.open + counts.in_progress,
    oldestOpenDays: oldestDays == null ? null : Math.floor(oldestDays),
  })
}))

export default router
