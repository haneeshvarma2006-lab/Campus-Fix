/**
 * End-to-end API tests. Runs against a server already listening on BASE
 * (default http://localhost:4000) with the demo data seeded.
 *
 *   npm run seed -- --force && npm start &
 *   npm test
 */
const BASE = process.env.BASE || 'http://localhost:4000'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const group = (title) => console.log(`\n${title}`)

async function api(path, { method = 'GET', token, body, raw } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload = body
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload, redirect: 'manual' })
  if (raw) return res
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  return { status: res.status, data }
}

const login = async (email, password) => {
  const { data } = await api('/auth/login', { method: 'POST', body: { email, password } })
  return data.token
}

/** Set from /auth/providers once the run starts. */
let canAttachPhotos = false

/** A tiny valid PNG, so photo upload is exercised for real. */
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHUlEQVQoU2NkYGD4z0AEYBxVSFRIYRxVSFRIAQAtxwB3xLdSbQAAAABJRU5ErkJggg==',
  'base64'
)
const pngFile = () => new File([pngBytes], 'test.png', { type: 'image/png' })

async function run() {
  console.log(`Testing ${BASE}\n${'='.repeat(52)}`)

  group('Health and configuration')
  {
    const { status, data } = await api('/health')
    check('health responds', status === 200 && data.ok === true)
    check('reports its database', typeof data.database === 'string', data.database)
    const providers = await api('/auth/providers')
    check('advertises auth providers', typeof providers.data.google === 'boolean',
      `google=${providers.data.google}`)
    check('advertises whether photos can be attached',
      typeof providers.data.photoUploads === 'boolean',
      `photoUploads=${providers.data.photoUploads}`)
    canAttachPhotos = providers.data.photoUploads === true
    check('advertises whether email is configured',
      typeof providers.data.email === 'boolean',
      `email=${providers.data.email}`)
  }

  group('Authentication')
  const admin = await login('admin@campusfix.app', 'admin1234')
  const student = await login('student.a@campus.edu', 'demo1234')
  const other = await login('student.b@campus.edu', 'demo1234')
  {
    check('admin logs in', Boolean(admin))
    check('student logs in', Boolean(student))
    check('a second student logs in', Boolean(other))

    const bad = await api('/auth/login', { method: 'POST', body: { email: 'admin@campusfix.app', password: 'wrong' } })
    check('wrong password rejected', bad.status === 401)

    const unknown = await api('/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'whatever1' } })
    check('unknown email gives the same message as a wrong password',
      unknown.data.error === bad.data.error, `${unknown.data.error} vs ${bad.data.error}`)

    const dup = await api('/auth/signup', { method: 'POST', body: { name: 'Dup', email: 'admin@campusfix.app', password: 'password123' } })
    check('duplicate signup rejected', dup.status === 409)

    const shortPw = await api('/auth/signup', { method: 'POST', body: { name: 'Short', email: 'short@example.com', password: 'abc' } })
    check('short password rejected', shortPw.status === 400)

    const noToken = await api('/reports')
    check('unauthenticated request rejected', noToken.status === 401)

    const badToken = await api('/reports', { token: 'not.a.real.token' })
    check('malformed token rejected', badToken.status === 401)

    const me = await api('/auth/me', { token: admin })
    check('me returns the current user', me.data.user.email === 'admin@campusfix.app')
    check('me never leaks the password hash',
      !('password_hash' in me.data.user) && !('passwordHash' in me.data.user))
  }

  group('Role boundaries')
  {
    const asStudent = await api('/reports?scope=all&limit=50', { token: student })
    const reporters = [...new Set(asStudent.data.reports.map((r) => r.reporterName))]
    check('student cannot widen scope to all reports',
      reporters.length === 1 && reporters[0] === 'Student A', reporters.join(', '))

    const asAdmin = await api('/reports?scope=all&limit=50', { token: admin })
    check('admin sees every reporter',
      new Set(asAdmin.data.reports.map((r) => r.reporterName)).size > 1)

    check('student blocked from user list', (await api('/users', { token: student })).status === 403)
    check('admin allowed user list', (await api('/users', { token: admin })).status === 200)

    check('student cannot add a category',
      (await api('/categories', { method: 'POST', token: student, body: { name: 'Sneaky' } })).status === 403)

    const someone = asStudent.data.reports[0]
    check("student cannot read another student's report",
      (await api(`/reports/${someone.id}`, { token: other })).status === 403)
    check('admin can read any report',
      (await api(`/reports/${someone.id}`, { token: admin })).status === 200)
    check('student cannot change status',
      (await api(`/reports/${someone.id}/status`, { method: 'PATCH', token: student, body: { status: 'fixed' } })).status === 403)
  }

  group('Creating reports')
  let created
  {
    const form = new FormData()
    form.append('title', 'Handrail loose on the library stairs')
    form.append('description', 'The metal handrail on the second flight wobbles when weight is put on it.')
    form.append('category', 'Safety')
    form.append('location', 'Library, main staircase')
    form.append('priority', 'high')
    form.append('latitude', '12.9716')
    form.append('longitude', '77.5946')
    form.append('photo', pngFile())

    const res = await api('/reports', { method: 'POST', token: student, body: form })
    created = res.data.report
    check('report created', res.status === 201 && Boolean(created?.id))
    check('gets a reference code', /^[A-Z0-9]{6}$/.test(created.code || ''), created.code)
    // Photo storage is optional. Configured, the photo is stored; unconfigured,
    // the report must still be saved and say the photo could not be attached.
    if (canAttachPhotos) {
      check('photo stored', Boolean(created.photoUrl), String(created.photoUrl))
    } else {
      check('report survives an unconfigured photo store',
        created.photoUrl === null && typeof res.data.warning === 'string',
        `photoUrl=${created.photoUrl} warning=${res.data.warning}`)
    }
    check('coordinates stored', created.coords?.latitude === 12.9716)
    check('priority stored', created.priority === 'high')
    check('starts at reported', created.status === 'reported')

    if (created.photoUrl?.startsWith('/uploads/')) {
      const img = await fetch(`${BASE}${created.photoUrl}`)
      check('photo is served back', img.ok && (img.headers.get('content-type') || '').startsWith('image/'))
    }

    const detail = await api(`/reports/${created.id}`, { token: student })
    check('timeline records creation',
      detail.data.events.length === 1 && detail.data.events[0].type === 'created')
  }

  group('Validation')
  {
    const short = await api('/reports', { method: 'POST', token: student, body: { title: 'ab', description: 'tiny' } })
    check('short title rejected', short.status === 400 && short.data.field === 'title')

    const blank = await api('/reports', { method: 'POST', token: student, body: { title: '          ', description: 'A long enough description here.' } })
    check('whitespace-only title rejected', blank.status === 400)

    const halfCoords = new FormData()
    halfCoords.append('title', 'Half a coordinate pair')
    halfCoords.append('description', 'Only one coordinate supplied, which is not a usable pin.')
    halfCoords.append('latitude', '12.97')
    const half = await api('/reports', { method: 'POST', token: student, body: halfCoords })
    check('BUG FIX: latitude without longitude rejected', half.status === 400, JSON.stringify(half.data))

    const outOfRange = new FormData()
    outOfRange.append('title', 'Coordinates out of range')
    outOfRange.append('description', 'Latitude well outside the valid range for the planet.')
    outOfRange.append('latitude', '999')
    outOfRange.append('longitude', '10')
    check('out-of-range latitude rejected',
      (await api('/reports', { method: 'POST', token: student, body: outOfRange })).status === 400)

    const badStatus = await api('/reports?status=bogus', { token: admin })
    check('invalid status filter rejected', badStatus.status === 400)

    const bigLimit = await api('/reports?limit=9999', { token: admin })
    check('oversized page limit rejected', bigLimit.status === 400)

    const badFile = new FormData()
    badFile.append('title', 'A text file pretending to be a photo')
    badFile.append('description', 'The upload filter should refuse anything that is not an image.')
    badFile.append('photo', new File([Buffer.from('not an image')], 'x.txt', { type: 'text/plain' }))
    check('non-image upload rejected',
      (await api('/reports', { method: 'POST', token: student, body: badFile })).status === 400)
  }

  group('Search and filtering')
  {
    const hit = await api('/reports?q=pothole', { token: admin })
    check('search finds a match', hit.data.total === 1 && /pothole/i.test(hit.data.reports[0].title))

    const upper = await api('/reports?q=POTHOLE', { token: admin })
    check('search is case-insensitive', upper.data.total === 1)

    const pct = await api('/reports?q=%25', { token: admin })
    check('BUG FIX: "%" is not treated as a wildcard', pct.data.total === 0, `total=${pct.data.total}`)

    const underscore = await api('/reports?q=_', { token: admin })
    check('BUG FIX: "_" is not treated as a wildcard', underscore.data.total === 0, `total=${underscore.data.total}`)

    const inject = await api(`/reports?q=${encodeURIComponent("' OR 1=1--")}`, { token: admin })
    check('SQL injection attempt matches nothing', inject.data.total === 0)

    const byCode = await api(`/reports?q=${created.code}`, { token: student })
    check('search by reference code works', byCode.data.total === 1)

    const reported = await api('/reports?status=reported', { token: admin })
    check('status filter applies', reported.data.reports.every((r) => r.status === 'reported'))

    const cat = await api('/reports?category=Sanitation', { token: admin })
    check('category filter applies', cat.data.reports.every((r) => r.category === 'Sanitation'))

    const votes = await api('/reports?sort=votes', { token: admin })
    const v = votes.data.reports.map((r) => r.votes)
    check('sort by votes is descending', v.every((n, i) => i === 0 || v[i - 1] >= n), v.join(','))

    const priority = await api('/reports?sort=priority', { token: admin })
    const rank = { urgent: 0, high: 1, normal: 2, low: 3 }
    const p = priority.data.reports.map((r) => rank[r.priority])
    check('sort by priority is descending', p.every((n, i) => i === 0 || p[i - 1] <= n), p.join(','))

    const page1 = await api('/reports?limit=5&page=1', { token: admin })
    const page2 = await api('/reports?limit=5&page=2', { token: admin })
    const overlap = page1.data.reports.filter((r) => page2.data.reports.some((x) => x.id === r.id))
    check('pages do not overlap', overlap.length === 0)
    check('page count is reported', page1.data.pages === Math.ceil(page1.data.total / 5))
  }

  group('Workflow')
  {
    const assigned = await api(`/reports/${created.id}/status`, {
      method: 'PATCH', token: admin, body: { status: 'assigned', note: 'Assigned to the carpentry team.' },
    })
    check('admin assigns the report', assigned.data.report.status === 'assigned')

    const moved = await api(`/reports/${created.id}/status`, {
      method: 'PATCH', token: admin, body: { status: 'in_progress', note: 'Carpenter booked for Thursday.' },
    })
    check('admin moves the report to in progress', moved.data.report.status === 'in_progress')

    const detail = await api(`/reports/${created.id}`, { token: student })
    const last = detail.data.events.at(-1)
    check('status change is logged with its note', last.toStatus === 'in_progress' && /Carpenter/.test(last.note))
    check('status change is attributed', last.actorName === 'Admin', String(last.actorName))
    check('reporter can see the update', detail.status === 200)

    const fixed = await api(`/reports/${created.id}/status`, { method: 'PATCH', token: admin, body: { status: 'fixed' } })
    check('marking fixed sets fixedAt', Boolean(fixed.data.report.fixedAt))

    const reopened = await api(`/reports/${created.id}/status`, { method: 'PATCH', token: admin, body: { status: 'reported' } })
    check('reopening clears fixedAt', reopened.data.report.fixedAt === null)

    const rejectNoNote = await api(`/reports/${created.id}/status`, { method: 'PATCH', token: admin, body: { status: 'rejected' } })
    check('rejecting without a reason is refused', rejectNoNote.status === 400, JSON.stringify(rejectNoNote.data))

    const rejectWithNote = await api(`/reports/${created.id}/status`, {
      method: 'PATCH', token: admin, body: { status: 'rejected', note: 'Duplicate of an earlier report.' },
    })
    check('rejecting with a reason is accepted', rejectWithNote.data.report.status === 'rejected')
    await api(`/reports/${created.id}/status`, { method: 'PATCH', token: admin, body: { status: 'in_progress' } })

    const prio = await api(`/reports/${created.id}/priority`, { method: 'PATCH', token: admin, body: { priority: 'urgent' } })
    check('priority can be changed', prio.data.report.priority === 'urgent')

    const badTransition = await api(`/reports/${created.id}/status`, { method: 'PATCH', token: admin, body: { status: 'nonsense' } })
    check('invalid status rejected', badTransition.status === 400)
  }

  group('Votes and comments')
  {
    const on = await api(`/reports/${created.id}/vote`, { method: 'POST', token: student })
    check('vote registers', on.data.report.votes === 1 && on.data.report.hasVoted === true)

    const off = await api(`/reports/${created.id}/vote`, { method: 'POST', token: student })
    check('vote toggles off', off.data.report.votes === 0 && off.data.report.hasVoted === false)

    await api(`/reports/${created.id}/vote`, { method: 'POST', token: student })
    const again = await api(`/reports/${created.id}/vote`, { method: 'POST', token: admin })
    check('votes from different people accumulate', again.data.report.votes === 2)

    const comment = await api(`/reports/${created.id}/comments`, {
      method: 'POST', token: admin, body: { body: 'Parts are in stock, this should be quick.' },
    })
    check('comment posts', comment.status === 201 && comment.data.comment.authorRole === 'admin')

    const empty = await api(`/reports/${created.id}/comments`, { method: 'POST', token: admin, body: { body: '   ' } })
    check('empty comment rejected', empty.status === 400)

    check('outsider cannot comment',
      (await api(`/reports/${created.id}/comments`, { method: 'POST', token: other, body: { body: 'hello' } })).status === 403)

    const detail = await api(`/reports/${created.id}`, { token: student })
    check('comment appears on the report', detail.data.comments.length === 1)
    check('comment count reflected in the list', detail.data.report.comments === 1)
  }

  group('Pipeline and location filter')
  {
    const active = await api('/reports?status=active&limit=50', { token: admin })
    check('active filter excludes fixed and rejected',
      active.data.reports.every((r) => ['reported', 'assigned', 'in_progress'].includes(r.status)))

    const assigned = await api('/reports?status=assigned', { token: admin })
    check('assigned is a real stage', assigned.data.reports.every((r) => r.status === 'assigned'))

    const locations = await api('/categories/locations', { token: admin })
    check('locations endpoint lists places', Array.isArray(locations.data.locations) && locations.data.locations.length > 0)

    const place = locations.data.locations[0].location
    const atPlace = await api(`/reports?location=${encodeURIComponent(place)}`, { token: admin })
    check(`location filter narrows to "${place}"`,
      atPlace.data.total > 0 && atPlace.data.reports.every((r) => r.location.includes(place)))

    const both = await api(`/reports?location=${encodeURIComponent(place)}&status=active`, { token: admin })
    check('location and status filters combine',
      both.data.reports.every((r) => r.location.includes(place) && !['fixed', 'rejected'].includes(r.status)))
  }

  group('Statistics')
  {
    const adminStats = await api('/stats', { token: admin })
    check('admin stats cover everything', adminStats.data.scope === 'all' && adminStats.data.total >= 12)
    check('trend is 14 days', adminStats.data.trend.length === 14)
    check('counts add up to the total',
      Object.values(adminStats.data.counts).reduce((a, b) => a + b, 0) === adminStats.data.total)
    check('fix rate is a percentage',
      adminStats.data.fixRate >= 0 && adminStats.data.fixRate <= 100)

    check('admin stats include a location breakdown', Array.isArray(adminStats.data.byLocation))

    const studentStats = await api('/stats', { token: student })
    check('student stats are scoped to them', studentStats.data.scope === 'mine')
    check('student total is smaller than the whole system',
      studentStats.data.total < adminStats.data.total)
  }

  group('Campus locations')
  {
    const list = await api('/locations', { token: student })
    check('students can list locations', list.status === 200 && list.data.locations.length > 0)

    const withCounts = list.data.locations.every(
      (l) => typeof l.open_count === 'number' && typeof l.total_count === 'number'
    )
    check('each location carries live issue counts', withCounts)

    const positioned = list.data.locations.every(
      (l) => typeof l.x === 'number' && typeof l.y === 'number'
    )
    check('each location has map coordinates', positioned)

    check('students cannot add a location',
      (await api('/locations', { method: 'POST', token: student, body: { name: 'Secret Lab' } })).status === 403)

    const created = await api('/locations', {
      method: 'POST', token: admin, body: { name: 'Test Wing', zone: 'Academic', x: 40, y: 40 },
    })
    check('admin adds a location', created.status === 201)

    const dup = await api('/locations', { method: 'POST', token: admin, body: { name: 'test wing' } })
    check('duplicate location rejected case-insensitively', dup.status === 409)

    const offGrid = await api('/locations', {
      method: 'POST', token: admin, body: { name: 'Off Grid', x: 500, y: 40 },
    })
    check('out-of-range coordinates rejected', offGrid.status === 400)

    // Filtering the queue by place is what the campus map is built on.
    const atCanteen = await api('/reports?location=Canteen', { token: admin })
    check('reports filter by location',
      atCanteen.data.reports.length > 0 && atCanteen.data.reports.every((r) => r.location === 'Canteen'))

    check('location removed',
      (await api(`/locations/${created.data.location.id}`, { method: 'DELETE', token: admin })).status === 200)
  }

  group('Admin management')
  {
    const add = await api('/categories', { method: 'POST', token: admin, body: { name: 'Waste segregation' } })
    check('admin adds a category', add.status === 201)

    const dup = await api('/categories', { method: 'POST', token: admin, body: { name: 'waste segregation' } })
    check('duplicate category rejected case-insensitively', dup.status === 409)

    check('category removed', (await api(`/categories/${add.data.category.id}`, { method: 'DELETE', token: admin })).status === 200)

    const users = await api('/users', { token: admin })
    const me = users.data.users.find((u) => u.email === 'admin@campusfix.app')
    const target = users.data.users.find((u) => u.email === 'student.d@campus.edu')

    const selfDemote = await api(`/users/${me.id}/role`, { method: 'PATCH', token: admin, body: { role: 'student' } })
    check('admin cannot demote themselves', selfDemote.status === 400)

    const promote = await api(`/users/${target.id}/role`, { method: 'PATCH', token: admin, body: { role: 'admin' } })
    check('admin can promote a user', promote.data.user.role === 'admin')
    await api(`/users/${target.id}/role`, { method: 'PATCH', token: admin, body: { role: 'student' } })

    const badRole = await api(`/users/${target.id}/role`, { method: 'PATCH', token: admin, body: { role: 'staff' } })
    check('the retired "staff" role is rejected', badRole.status === 400)

    check('user report counts included', users.data.users.every((u) => typeof u.reportCount === 'number'))
  }

  group('Not found and bad input')
  {
    check('missing report is 404', (await api('/reports/999999', { token: admin })).status === 404)
    check('non-numeric id is 404 not a crash', (await api('/reports/abc', { token: admin })).status === 404)
    check('unknown endpoint is 404', (await api('/nope', { token: admin })).status === 404)
    check('missing category is 404', (await api('/categories/999999', { method: 'DELETE', token: admin })).status === 404)
    check('google route is off when unconfigured', [503, 302].includes((await api('/auth/google', { raw: true })).status))
  }

  group('Deletion')
  {
    check('outsider cannot delete', (await api(`/reports/${created.id}`, { method: 'DELETE', token: other })).status === 403)
    check('owner can delete', (await api(`/reports/${created.id}`, { method: 'DELETE', token: student })).status === 200)
    check('deleted report is gone', (await api(`/reports/${created.id}`, { token: student })).status === 404)

    if (created.photoUrl?.startsWith('/uploads/')) {
      const img = await fetch(`${BASE}${created.photoUrl}`)
      check('its photo is cleaned up', img.status === 404, `status ${img.status}`)
    }
  }

  console.log(`\n${'='.repeat(52)}`)
  console.log(`${passed} passed, ${failed} failed`)
  if (failures.length) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  - ${f}`)
  }
  process.exit(failed ? 1 : 0)
}

run().catch((err) => {
  console.error('\nTest run crashed:', err)
  process.exit(1)
})
