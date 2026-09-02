/**
 * Seeds a demo dataset: one admin, one staff member, three citizens, a set of
 * categories, and a spread of reports across every status.
 *
 *   npm run seed          add demo data (skips if users already exist)
 *   npm run seed -- --force   wipe everything first, then seed
 */
import { db } from './db.js'
import { hashPassword } from './auth.js'

const force = process.argv.includes('--force')

const CATEGORIES = [
  'Sanitation', 'Electrical', 'Plumbing', 'Road damage',
  'Streetlight', 'Water supply', 'Furniture', 'Safety',
]

const USERS = [
  { name: 'Admin',        email: 'admin@campusfix.app',  password: 'admin1234', role: 'admin' },
  { name: 'Maya Iyer',    email: 'staff@campusfix.app',  password: 'staff1234', role: 'staff' },
  { name: 'Rahul Menon',  email: 'rahul@example.com',    password: 'demo1234',  role: 'citizen' },
  { name: 'Sara Fernandes', email: 'sara@example.com',   password: 'demo1234',  role: 'citizen' },
  { name: 'Dev Kapoor',   email: 'dev@example.com',      password: 'demo1234',  role: 'citizen' },
]

const REPORTS = [
  { title: 'Overflowing bin outside Block C', category: 'Sanitation', location: 'Block C, east entrance', status: 'in_progress', priority: 'high', days: 2,
    description: 'The bin next to the side entrance has not been cleared in about four days. Waste is spilling onto the walkway and there are flies around it in the afternoon.' },
  { title: 'Corridor light flickering on second floor', category: 'Electrical', location: 'Academic block, 2nd floor corridor', status: 'open', priority: 'normal', days: 1,
    description: 'The third tube light from the stairwell flickers constantly and goes fully dark for a few seconds at a time. Hard to read notices on that wall in the evening.' },
  { title: 'Tap leaking continuously in washroom', category: 'Plumbing', location: 'Hostel B, ground floor washroom', status: 'resolved', priority: 'normal', days: 9,
    description: 'The second tap from the left does not shut off completely. It has been running at a steady trickle all week, which is a lot of water over a day.' },
  { title: 'Large pothole near the main gate', category: 'Road damage', location: 'Main gate approach road', status: 'open', priority: 'urgent', days: 3,
    description: 'A pothole roughly two feet across has opened up right where two-wheelers turn in. Someone nearly went down on it this morning during the rain.' },
  { title: 'Streetlight out along the back path', category: 'Streetlight', location: 'Path between library and hostel D', status: 'in_progress', priority: 'high', days: 5,
    description: 'Two consecutive lights on the back path are dead, leaving about forty metres completely dark. It is the route most people take back after evening classes.' },
  { title: 'No water supply in hostel A since morning', category: 'Water supply', location: 'Hostel A, all floors', status: 'resolved', priority: 'urgent', days: 12,
    description: 'Supply stopped around 6am with no notice. Nothing on any of the floors, including the ground-floor washrooms.' },
  { title: 'Broken chair in seminar room', category: 'Furniture', location: 'Seminar room 204', status: 'open', priority: 'low', days: 6,
    description: 'One of the chairs in the second row has a cracked backrest and wobbles badly. It should be pulled out before someone leans back on it.' },
  { title: 'Fire extinguisher missing from its bracket', category: 'Safety', location: 'Lab block, first floor landing', status: 'in_progress', priority: 'urgent', days: 4,
    description: 'The bracket by the landing is empty. The extinguisher has been gone for at least a week and there is no replacement anywhere on that floor.' },
  { title: 'Drain blocked behind the canteen', category: 'Sanitation', location: 'Canteen service area', status: 'open', priority: 'high', days: 2,
    description: 'Water has been pooling behind the canteen for days and smells strongly. The drain cover looks clogged with food waste.' },
  { title: 'Ceiling fan making loud noise', category: 'Electrical', location: 'Classroom 108', status: 'rejected', priority: 'low', days: 15,
    description: 'The fan closest to the window rattles loudly whenever it runs above speed three.' },
  { title: 'Loose paving stone on the walkway', category: 'Road damage', location: 'Walkway near the admin office', status: 'open', priority: 'normal', days: 1,
    description: 'One of the paving stones rocks when you step on it and the edge is raised about an inch. Easy thing to trip on when carrying things.' },
  { title: 'Washroom door latch broken', category: 'Furniture', location: 'Library, first floor washroom', status: 'resolved', priority: 'normal', days: 20,
    description: 'The latch on the second stall does not engage at all, so the door swings open on its own.' },
]

const COMMENTS = [
  { report: 0, by: 'staff@campusfix.app', body: 'Logged with the housekeeping contractor. Their team is scheduled for tomorrow morning.' },
  { report: 3, by: 'staff@campusfix.app', body: 'Flagged to the works department as urgent given the rain. Temporary cones going up today.' },
  { report: 4, by: 'staff@campusfix.app', body: 'Both fittings need replacing rather than just the bulbs. Parts ordered.' },
  { report: 7, by: 'staff@campusfix.app', body: 'Replacement extinguisher installed and the whole floor is being audited this week.' },
]

function iso(daysAgo, hourOffset = 0) {
  return new Date(Date.now() - daysAgo * 86400000 + hourOffset * 3600000)
    .toISOString().slice(0, 19).replace('T', ' ')
}

function randomCode(existing) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  } while (existing.has(code))
  existing.add(code)
  return code
}

async function main() {
  if (force) {
    db.exec('DELETE FROM votes; DELETE FROM comments; DELETE FROM report_events; DELETE FROM reports; DELETE FROM categories; DELETE FROM users;')
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','reports','categories','comments','report_events')")
    console.log('Cleared existing data.')
  }

  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
    console.log('Database already has users — nothing seeded. Use `npm run seed -- --force` to reset.')
    process.exit(0)
  }

  for (const name of CATEGORIES) {
    db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)').run(name)
  }

  const userIds = {}
  for (const u of USERS) {
    const hash = await hashPassword(u.password)
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(u.name, u.email, hash, u.role, iso(30))
    userIds[u.email] = Number(lastInsertRowid)
  }

  const citizens = ['rahul@example.com', 'sara@example.com', 'dev@example.com']
  const codes = new Set()
  const reportIds = []

  REPORTS.forEach((r, i) => {
    const reporter = userIds[citizens[i % citizens.length]]
    const createdAt = iso(r.days)
    const resolvedAt = r.status === 'resolved' ? iso(Math.max(0, r.days - 2)) : null

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO reports
        (code, title, description, category, location, status, priority, reporter_id, created_at, updated_at, resolved_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomCode(codes), r.title, r.description, r.category, r.location,
      r.status, r.priority, reporter, createdAt,
      resolvedAt || iso(Math.max(0, r.days - 1)), resolvedAt
    )

    const id = Number(lastInsertRowid)
    reportIds.push(id)

    db.prepare(`
      INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, created_at)
      VALUES (?, ?, 'created', NULL, 'open', ?)
    `).run(id, reporter, createdAt)

    if (r.status !== 'open') {
      const staff = userIds['staff@campusfix.app']
      if (r.status === 'resolved') {
        db.prepare(`INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, note, created_at)
                    VALUES (?, ?, 'status', 'open', 'in_progress', ?, ?)`)
          .run(id, staff, 'Assigned to the maintenance team.', iso(r.days, 6))
        db.prepare(`INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, note, created_at)
                    VALUES (?, ?, 'status', 'in_progress', 'resolved', ?, ?)`)
          .run(id, staff, 'Work completed and checked on site.', resolvedAt)
      } else {
        const note = r.status === 'rejected'
          ? 'Not a maintenance issue — referred to the department directly.'
          : 'Assigned to the maintenance team.'
        db.prepare(`INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, note, created_at)
                    VALUES (?, ?, 'status', 'open', ?, ?, ?)`)
          .run(id, staff, r.status, note, iso(Math.max(0, r.days - 1)))
      }
    }

    // A scattering of upvotes so the "most supported" sort has something to do.
    const voters = Object.values(userIds).slice(0, 2 + (i % 4))
    for (const v of voters) {
      db.prepare('INSERT OR IGNORE INTO votes (report_id, user_id, created_at) VALUES (?, ?, ?)')
        .run(id, v, iso(Math.max(0, r.days - 1)))
    }
  })

  for (const c of COMMENTS) {
    db.prepare('INSERT INTO comments (report_id, author_id, body, created_at) VALUES (?, ?, ?, ?)')
      .run(reportIds[c.report], userIds[c.by], c.body, iso(REPORTS[c.report].days, 8))
  }

  console.log('\nSeeded CampusFix demo data.\n')
  console.log('  Admin    admin@campusfix.app  /  admin1234')
  console.log('  Staff    staff@campusfix.app  /  staff1234')
  console.log('  Citizen  rahul@example.com    /  demo1234')
  console.log(`\n  ${REPORTS.length} reports, ${CATEGORIES.length} categories, ${USERS.length} users.\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
