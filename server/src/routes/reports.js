import { Router } from 'express'
import { query, queryOne, transaction } from '../db.js'
import { requireAuth, requireRole, isStaff, asyncRoute } from '../auth.js'
import { photoUpload, savePhoto, deletePhoto } from '../storage.js'
import {
  validate, reportSchema, statusSchema, prioritySchema, commentSchema, listQuerySchema,
} from '../validate.js'

const router = Router()

// --- helpers ----------------------------------------------------------------

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 — easier to read aloud

/** Six-character human-quotable reference, e.g. #7QK2FD. */
async function generateCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    const clash = await queryOne('SELECT 1 FROM reports WHERE code = $1', [code])
    if (!clash) return code
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
    reporterAvatar: row.reporter_avatar || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    votes: Number(row.votes ?? 0),
    comments: Number(row.comment_count ?? 0),
    hasVoted: Boolean(row.has_voted),
  }
}

/**
 * The viewer placeholder is passed in rather than fixed at $1, because the
 * list query builds its filters first and appends the viewer afterwards.
 * Postgres rejects a statement that declares a parameter it never uses, so the
 * numbering has to line up exactly with what each caller binds.
 */
const selectReport = (viewerParam) => `
  SELECT r.*,
         u.name       AS reporter_name,
         u.avatar_url AS reporter_avatar,
         (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id)    AS votes,
         (SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id) AS comment_count,
         EXISTS (SELECT 1 FROM votes v WHERE v.report_id = r.id AND v.user_id = ${viewerParam}) AS has_voted
  FROM reports r
  JOIN users u ON u.id = r.reporter_id
`

const getReport = (id, viewer) =>
  queryOne(`${selectReport('$1')} WHERE r.id = $2`, [viewer, id])

const logEvent = (client, { reportId, actorId, type, from = null, to = null, note = null }) =>
  client.query(
    `INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [reportId, actorId, type, from, to, note]
  )

/**
 * Escapes LIKE metacharacters so a search for "50%" or "block_c" matches that
 * text literally instead of becoming a wildcard that matches every row.
 */
const escapeLike = (term) => term.replace(/[\\%_]/g, (ch) => `\\${ch}`)

/** An id that is not a positive integer can never match a SERIAL primary key. */
const asId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null)

// --- list -------------------------------------------------------------------

router.get('/', requireAuth, validate(listQuerySchema, 'query'), asyncRoute(async (req, res) => {
  const { scope, status, category, q, sort, page, limit } = req.validatedQuery
  const viewer = req.user.id

  const where = []
  const params = []
  const bind = (value) => {
    params.push(value)
    return `$${params.length}`
  }

  // Citizens can only ever list their own reports; staff and admins choose.
  if (scope === 'mine' || !isStaff(req.user)) where.push(`r.reporter_id = ${bind(viewer)}`)
  if (status !== 'all') where.push(`r.status = ${bind(status)}`)
  if (category !== 'all' && category !== '') where.push(`r.category = ${bind(category)}`)

  if (q) {
    const p = bind(`%${escapeLike(q)}%`)
    where.push(
      `(r.title ILIKE ${p} ESCAPE '\\' OR r.description ILIKE ${p} ESCAPE '\\'` +
      ` OR r.location ILIKE ${p} ESCAPE '\\' OR r.code ILIKE ${p} ESCAPE '\\')`
    )
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const orderBy = {
    oldest: 'r.created_at ASC',
    votes: 'votes DESC, r.created_at DESC',
    priority: `CASE r.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, r.created_at DESC`,
    newest: 'r.created_at DESC',
  }[sort]

  // Counted before the viewer/limit/offset params are appended, so this
  // statement binds exactly the filter parameters it references.
  const [{ n }] = await query(`SELECT COUNT(*)::int AS n FROM reports r ${clause}`, [...params])

  const viewerParam = bind(viewer)
  const limitParam = bind(limit)
  const offsetParam = bind((page - 1) * limit)
  const rows = await query(
    `${selectReport(viewerParam)} ${clause} ORDER BY ${orderBy} LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  )

  res.json({
    reports: rows.map(toReport),
    page,
    limit,
    total: n,
    pages: Math.max(1, Math.ceil(n / limit)),
  })
}))

// --- create -----------------------------------------------------------------

router.post('/', requireAuth, photoUpload, validate(reportSchema), asyncRoute(async (req, res) => {
  const { title, description, category, location, latitude, longitude, priority } = req.body

  const photoUrl = await savePhoto(req.file)
  const code = await generateCode()

  const id = await transaction(async (client) => {
    const [row] = await client.query(
      `INSERT INTO reports
         (code, title, description, category, location, latitude, longitude, photo_url, priority, reporter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [code, title, description, category, location,
       latitude ?? null, longitude ?? null, photoUrl, priority, req.user.id]
    )
    await logEvent(client, { reportId: row.id, actorId: req.user.id, type: 'created', to: 'open' })
    return row.id
  })

  res.status(201).json({ report: toReport(await getReport(id, req.user.id)) })
}))

// --- detail -----------------------------------------------------------------

router.get('/:id', requireAuth, asyncRoute(async (req, res) => {
  const id = asId(req.params.id)
  const row = id && (await getReport(id, req.user.id))
  if (!row) return res.status(404).json({ error: 'That report does not exist.' })

  if (row.reporter_id !== req.user.id && !isStaff(req.user)) {
    return res.status(403).json({ error: 'That report belongs to someone else.' })
  }

  const [events, comments] = await Promise.all([
    query(
      `SELECT e.*, u.name AS actor_name
       FROM report_events e LEFT JOIN users u ON u.id = e.actor_id
       WHERE e.report_id = $1 ORDER BY e.created_at ASC, e.id ASC`,
      [row.id]
    ),
    query(
      `SELECT c.*, u.name AS author_name, u.role AS author_role, u.avatar_url AS author_avatar
       FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.report_id = $1 ORDER BY c.created_at ASC, c.id ASC`,
      [row.id]
    ),
  ])

  res.json({
    report: toReport(row),
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      note: e.note,
      actorName: e.actor_name,
      createdAt: e.created_at,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.author_name,
      authorRole: c.author_role,
      authorAvatar: c.author_avatar || null,
      authorId: c.author_id,
      createdAt: c.created_at,
    })),
  })
}))

// --- status / priority (staff and admins) -----------------------------------

router.patch('/:id/status', requireRole('admin', 'staff'), validate(statusSchema),
  asyncRoute(async (req, res) => {
    const id = asId(req.params.id)
    const report = id && (await queryOne('SELECT * FROM reports WHERE id = $1', [id]))
    if (!report) return res.status(404).json({ error: 'That report does not exist.' })

    const { status, note } = req.body
    if (status === report.status && !note) {
      return res.json({ report: toReport(await getReport(report.id, req.user.id)) })
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE reports
         SET status = $1,
             updated_at = now(),
             resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE NULL END
         WHERE id = $2`,
        [status, report.id]
      )
      await logEvent(client, {
        reportId: report.id, actorId: req.user.id, type: 'status',
        from: report.status, to: status, note: note || null,
      })
    })

    res.json({ report: toReport(await getReport(report.id, req.user.id)) })
  })
)

router.patch('/:id/priority', requireRole('admin', 'staff'), validate(prioritySchema),
  asyncRoute(async (req, res) => {
    const id = asId(req.params.id)
    const report = id && (await queryOne('SELECT * FROM reports WHERE id = $1', [id]))
    if (!report) return res.status(404).json({ error: 'That report does not exist.' })

    await transaction(async (client) => {
      await client.query('UPDATE reports SET priority = $1, updated_at = now() WHERE id = $2',
        [req.body.priority, report.id])
      await logEvent(client, {
        reportId: report.id, actorId: req.user.id, type: 'priority',
        from: report.priority, to: req.body.priority,
      })
    })

    res.json({ report: toReport(await getReport(report.id, req.user.id)) })
  })
)

// --- delete -----------------------------------------------------------------

router.delete('/:id', requireAuth, asyncRoute(async (req, res) => {
  const id = asId(req.params.id)
  const report = id && (await queryOne('SELECT * FROM reports WHERE id = $1', [id]))
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })

  if (report.reporter_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the reporter or an admin can delete this.' })
  }

  await query('DELETE FROM reports WHERE id = $1', [report.id])
  await deletePhoto(report.photo_url)
  res.json({ ok: true })
}))

// --- votes ------------------------------------------------------------------

router.post('/:id/vote', requireAuth, asyncRoute(async (req, res) => {
  const id = asId(req.params.id)
  const report = id && (await queryOne('SELECT id FROM reports WHERE id = $1', [id]))
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })

  // One statement each way, so two rapid clicks cannot double-insert.
  const removed = await query(
    'DELETE FROM votes WHERE report_id = $1 AND user_id = $2 RETURNING report_id',
    [report.id, req.user.id]
  )
  if (removed.length === 0) {
    await query(
      'INSERT INTO votes (report_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [report.id, req.user.id]
    )
  }

  res.json({ report: toReport(await getReport(report.id, req.user.id)) })
}))

// --- comments ---------------------------------------------------------------

router.post('/:id/comments', requireAuth, validate(commentSchema), asyncRoute(async (req, res) => {
  const id = asId(req.params.id)
  const report = id && (await queryOne('SELECT * FROM reports WHERE id = $1', [id]))
  if (!report) return res.status(404).json({ error: 'That report does not exist.' })

  if (report.reporter_id !== req.user.id && !isStaff(req.user)) {
    return res.status(403).json({ error: 'That report belongs to someone else.' })
  }

  const comment = await transaction(async (client) => {
    const [row] = await client.query(
      'INSERT INTO comments (report_id, author_id, body) VALUES ($1, $2, $3) RETURNING id, body, created_at',
      [report.id, req.user.id, req.body.body]
    )
    await client.query('UPDATE reports SET updated_at = now() WHERE id = $1', [report.id])
    return row
  })

  res.status(201).json({
    comment: {
      id: comment.id,
      body: comment.body,
      authorName: req.user.name,
      authorRole: req.user.role,
      authorAvatar: req.user.avatar_url || null,
      authorId: req.user.id,
      createdAt: comment.created_at,
    },
  })
}))

export default router
