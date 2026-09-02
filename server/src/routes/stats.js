import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth, isAdmin, asyncRoute } from '../auth.js'
import { STATUSES, ACTIVE } from '../domain.js'

const router = Router()

const EMPTY_COUNTS = Object.fromEntries(STATUSES.map((s) => [s, 0]))

/**
 * Overview numbers for the dashboard. Admins see the whole system; a student
 * sees the same shape scoped to their own reports, so one component renders both.
 */
router.get('/', requireAuth, asyncRoute(async (req, res) => {
  const scoped = !isAdmin(req.user)
  const filter = scoped ? 'WHERE reporter_id = $1' : ''
  const andFilter = scoped ? 'AND reporter_id = $1' : ''
  const params = scoped ? [req.user.id] : []

  const [statusRows, categoryRows, locationRows, dailyRows, [resolution], [backlog]] =
    await Promise.all([
      query(`SELECT status, COUNT(*)::int AS n FROM reports ${filter} GROUP BY status`, params),

      query(
        `SELECT category, COUNT(*)::int AS n FROM reports ${filter}
         GROUP BY category ORDER BY n DESC, category ASC LIMIT 8`,
        params
      ),

      // Where problems cluster — useful for deciding what to fix in one trip.
      query(
        `SELECT location, COUNT(*)::int AS n FROM reports
         WHERE location <> '' ${andFilter}
         GROUP BY location ORDER BY n DESC, location ASC LIMIT 6`,
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
        `SELECT AVG(EXTRACT(EPOCH FROM (fixed_at - created_at)) / 3600.0) AS hours
         FROM reports WHERE fixed_at IS NOT NULL ${andFilter}`,
        params
      ),

      // How long the oldest still-unfixed report has been waiting.
      query(
        `SELECT MAX(EXTRACT(EPOCH FROM (now() - created_at)) / 86400.0) AS days
         FROM reports WHERE status = ANY($${scoped ? 2 : 1}) ${andFilter}`,
        scoped ? [req.user.id, ACTIVE] : [ACTIVE]
      ),
    ])

  const counts = { ...EMPTY_COUNTS }
  for (const row of statusRows) counts[row.status] = row.n
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  // Fill in days with no reports so the trend strip is always 14 wide.
  const trend = []
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    trend.push({ day, count: dailyRows.find((d) => d.day === day)?.n || 0 })
  }

  const hours = resolution?.hours == null ? null : Number(resolution.hours)
  const oldestDays = backlog?.days == null ? null : Number(backlog.days)
  const closed = counts.fixed + counts.rejected
  const openCount = ACTIVE.reduce((sum, s) => sum + counts[s], 0)

  res.json({
    scope: scoped ? 'mine' : 'all',
    total,
    counts,
    openCount,
    byCategory: categoryRows.map((r) => ({ category: r.category, count: r.n })),
    byLocation: locationRows.map((r) => ({ location: r.location, count: r.n })),
    trend,
    avgFixHours: hours == null ? null : Math.round(hours * 10) / 10,
    fixRate: closed ? Math.round((counts.fixed / closed) * 100) : 0,
    oldestOpenDays: oldestDays == null ? null : Math.floor(oldestDays),
  })
}))

export default router
