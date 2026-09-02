import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireRole, isStaff } from '../auth.js'
import { photoUpload, removeUpload } from '../upload.js'
import {
  validate, reportSchema, statusSchema, prioritySchema, commentSchema, listQuerySchema,
} from '../validate.js'

const router = Router()

// --- helpers ----------------------------------------------------------------

/** Six-character human-quotable reference, e.g. #7QK2FD. */
function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 — easier to read aloud
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
    if (!db.prepare('SELECT 1 FROM reports WHERE code = ?').get(code)) return code
  }
  return `R${Date.now().toString(36).toUpperCase()}`
}

function toReport(row) {
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    coords: row.latitude != null && row.longitude != null
      ? { latitude: row.latitude, longitude: row.longitude }
      : null,
    photoUrl: row.photo_url,
    status: row.status,
    priority: row.priority,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    votes: row.votes ?? 0,
    comments: row.comment_count ?? 0,
    hasVoted: !!row.has_voted,
  }
}

const SELECT_REPORT = `
  SELECT r.*,
         u.name AS reporter_name,
         (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id)    AS votes,
         (SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id) AS comment_count,
         (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id AND v.user_id = @viewer) AS has_voted
  FROM reports r
  JOIN users u ON u.id = r.reporter_id
`

const logEvent = db.prepare(`
  INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, note)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const getReport = (id, viewer) =>
  db.prepare(`${SELECT_REPORT} WHERE r.id = @id`).get({ id, viewer })

// --- list -------------------------------------------------------------------

router.get('/', requireAuth, validate(listQuerySchema, 'query'), (req, res) => {
  const { scope, status, category, q, sort, page, limit } = req.validatedQuery
  const viewer = req.user.id

  const where = []
  const params = { viewer }

  // Citizens can only ever list their own reports; staff and admins choose.
  if (scope === 'mine' || !isStaff(req.user)) {
    where.push('r.reporter_id = @reporter')
    params.reporter = viewer
  }
  if (status !== 'all') {
    where.push('r.status = @status')
    params.status = status
  }
  if (category !== 'all' && category !== '') {
    where.push('r.category = @category')
    params.category = category
  }
  if (q) {
    where.push('(r.title LIKE @q OR r.description LIKE @q OR r.location LIKE @q OR r.code LIKE @q)')
    params.q = `%${q}%`
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderBy = sort === 'oldest' ? 'r.created_at ASC'
    : sort === 'votes' ? 'votes DESC, r.created_at DESC'
    : 'r.created_at DESC'

  const total = db.prepare(`SELECT COUNT(*) AS n FROM reports r ${clause}`).get(params).n
  const rows = db.prepare(
    `${SELECT_REPORT} ${clause} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`
  ).all({ ...params, limit, offset: (page - 1) * limit })

  res.json({
    reports: rows.map(toReport),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  })
})

// --- create -----------------------------------------------------------------

router.post('/', requireAuth, photoUpload, validate(reportSchema), (req, res) => {
  const { title, description, category, location, latitude, longitude, priority } = req.body
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null
  const code = generateCode()

  const result = db.prepare(`
    INSERT INTO reports
      (code, title, description, category, location, latitude, longitude, photo_url, priority, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, title, description, category, location,
    latitude ?? null, longitude ?? null, photoUrl, priority, req.user.id
  )

  logEvent.run(result.lastInsertRowid, req.user.id, 'created', null, 'open', null)
  res.status(201).json({ report: toReport(getReport(result.lastInsertRowid, req.user.id)) })
})

// --- detail -----------------------------------------------------------------

router.get('/:id', requireAuth, (req, res) => {
  const row = getReport(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: 'That report does not exist.' })
  if (row.reporter_id !== req.user.id && !isStaff(req.user)) {
    return res.status(403).json({ error: 'That report belongs to someone else.' })
  }

  const events = db.prepare(`
    SELECT e.*, u.name AS actor_name
    FROM report_events e LEFT JOIN users u ON u.id = e.actor_id
    WHERE e.report_id = ? ORDER BY e.created_at ASC, e.id ASC
  `).all(row.id).map((e) => ({
    id: e.id,
    type: e.type,
    fromStatus: e.from_status,
    toStatus: e.to_status,
    note: e.note,
    actorName: e.actor_name,
    createdAt: e.created_at,
  }))

  const comments = db.prepare(`
    SELECT c.*, u.name AS author_name, u.role AS author_role
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.report_id = ? ORDER BY c.created_at ASC, c.id ASC
  `).all(row.id).map((c) => ({
    id: c.id,
    body: c.body,
    authorName: c.author_name,
    authorRole: c.author_role,
    authorId: c.author_id,
    createdAt: c.created_at,
  }))

  res.json({ report: toReport(row), events, comments })
})

// --- status / priority (staff and admins) -----------------------------------

router.patch('/:id/status', requireRole('admin', 'staff'), validate(statusSchema), (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id)
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })

  const { status, note } = req.body
  if (status === report.status && !note) {
    return res.json({ report: toReport(getReport(report.id, req.user.id)) })
  }

  db.prepare(`
    UPDATE reports
    SET status = ?,
        updated_at = datetime('now'),
        resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `).run(status, status, report.id)

  logEvent.run(report.id, req.user.id, 'status', report.status, status, note || null)
  res.json({ report: toReport(getReport(report.id, req.user.id)) })
})

router.patch('/:id/priority', requireRole('admin', 'staff'), validate(prioritySchema), (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id)
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })

  db.prepare("UPDATE reports SET priority = ?, updated_at = datetime('now') WHERE id = ?")
    .run(req.body.priority, report.id)
  logEvent.run(report.id, req.user.id, 'priority', report.priority, req.body.priority, null)

  res.json({ report: toReport(getReport(report.id, req.user.id)) })
})

// --- delete -----------------------------------------------------------------

router.delete('/:id', requireAuth, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id)
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })
  if (report.reporter_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the reporter or an admin can delete this.' })
  }

  db.prepare('DELETE FROM reports WHERE id = ?').run(report.id)
  removeUpload(report.photo_url)
  res.json({ ok: true })
})

// --- votes ------------------------------------------------------------------

router.post('/:id/vote', requireAuth, (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id)
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })

  const voted = db.prepare('SELECT 1 FROM votes WHERE report_id = ? AND user_id = ?')
    .get(report.id, req.user.id)

  if (voted) db.prepare('DELETE FROM votes WHERE report_id = ? AND user_id = ?').run(report.id, req.user.id)
  else db.prepare('INSERT INTO votes (report_id, user_id) VALUES (?, ?)').run(report.id, req.user.id)

  res.json({ report: toReport(getReport(report.id, req.user.id)) })
})

// --- comments ---------------------------------------------------------------

router.post('/:id/comments', requireAuth, validate(commentSchema), (req, res) => {
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id)
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })
  if (report.reporter_id !== req.user.id && !isStaff(req.user)) {
    return res.status(403).json({ error: 'That report belongs to someone else.' })
  }

  const { lastInsertRowid } = db
    .prepare('INSERT INTO comments (report_id, author_id, body) VALUES (?, ?, ?)')
    .run(report.id, req.user.id, req.body.body)
  db.prepare("UPDATE reports SET updated_at = datetime('now') WHERE id = ?").run(report.id)

  const c = db.prepare(`
    SELECT c.*, u.name AS author_name, u.role AS author_role
    FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?
  `).get(lastInsertRowid)

  res.status(201).json({
    comment: {
      id: c.id,
      body: c.body,
      authorName: c.author_name,
      authorRole: c.author_role,
      authorId: c.author_id,
      createdAt: c.created_at,
    },
  })
})

export default router
