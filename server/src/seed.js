/**
 * Seeds a demo dataset: one admin, four students, a set of categories, and a
 * spread of reports across every stage of the pipeline.
 *
 *   npm run seed              add demo data (skips if users already exist)
 *   npm run seed -- --force   wipe everything first, then seed
 *
 * Names here are deliberately generic placeholders — this is throwaway data for
 * a public repository, not anybody's real account.
 */
import 'dotenv/config'
import { query, transaction, closeDatabase, describeDatabase } from './db.js'
import { migrate } from './schema.js'
import { hashPassword } from './auth.js'

const force = process.argv.includes('--force')

const CATEGORIES = [
  'Sanitation', 'Electrical', 'Plumbing', 'Road damage',
  'Streetlight', 'Water supply', 'Furniture', 'Safety',
]

const USERS = [
  { name: 'Admin',     email: 'admin@campusfix.app',   password: 'admin1234', role: 'admin' },
  { name: 'Student A', email: 'student.a@campus.edu',  password: 'demo1234',  role: 'student' },
  { name: 'Student B', email: 'student.b@campus.edu',  password: 'demo1234',  role: 'student' },
  { name: 'Student C', email: 'student.c@campus.edu',  password: 'demo1234',  role: 'student' },
  { name: 'Student D', email: 'student.d@campus.edu',  password: 'demo1234',  role: 'student' },
]

const REPORTS = [
  { title: 'Overflowing bin outside Block C', category: 'Sanitation', location: 'Block C', status: 'in_progress', priority: 'high', days: 2,
    description: 'The bin next to the side entrance has not been cleared in about four days. Waste is spilling onto the walkway and there are flies around it in the afternoon.' },
  { title: 'Corridor light flickering on second floor', category: 'Electrical', location: 'Academic Block', status: 'reported', priority: 'normal', days: 1,
    description: 'The third tube light from the stairwell flickers constantly and goes fully dark for a few seconds at a time. Hard to read notices on that wall in the evening.' },
  { title: 'Tap leaking continuously in washroom', category: 'Plumbing', location: 'Hostel B', status: 'fixed', priority: 'normal', days: 9,
    description: 'The second tap from the left does not shut off completely. It has been running at a steady trickle all week, which is a lot of water over a day.' },
  { title: 'Large pothole near the main gate', category: 'Road damage', location: 'Main Gate', status: 'assigned', priority: 'urgent', days: 3,
    description: 'A pothole roughly two feet across has opened up right where two-wheelers turn in. Someone nearly went down on it this morning during the rain.' },
  { title: 'Streetlight out along the back path', category: 'Streetlight', location: 'Library', status: 'in_progress', priority: 'high', days: 5,
    description: 'Two consecutive lights on the back path are dead, leaving about forty metres completely dark. It is the route most people take back after evening classes.' },
  { title: 'No water supply in hostel since morning', category: 'Water supply', location: 'Hostel A', status: 'fixed', priority: 'urgent', days: 12,
    description: 'Supply stopped around 6am with no notice. Nothing on any of the floors, including the ground-floor washrooms.' },
  { title: 'Broken chair in seminar room', category: 'Furniture', location: 'Academic Block', status: 'reported', priority: 'low', days: 6,
    description: 'One of the chairs in the second row has a cracked backrest and wobbles badly. It should be pulled out before someone leans back on it.' },
  { title: 'Fire extinguisher missing from its bracket', category: 'Safety', location: 'Lab Block', status: 'assigned', priority: 'urgent', days: 4,
    description: 'The bracket by the landing is empty. The extinguisher has been gone for at least a week and there is no replacement anywhere on that floor.' },
  { title: 'Drain blocked behind the canteen', category: 'Sanitation', location: 'Canteen', status: 'in_progress', priority: 'high', days: 2,
    description: 'Water has been pooling behind the canteen for days and smells strongly. The drain cover looks clogged with food waste.' },
  { title: 'Ceiling fan making loud noise', category: 'Electrical', location: 'Academic Block', status: 'rejected', priority: 'low', days: 15,
    description: 'The fan closest to the window rattles loudly whenever it runs above speed three.' },
  { title: 'Loose paving stone on the walkway', category: 'Road damage', location: 'Main Gate', status: 'reported', priority: 'normal', days: 1,
    description: 'One of the paving stones rocks when you step on it and the edge is raised about an inch. Easy thing to trip on when carrying things.' },
  { title: 'Washroom door latch broken', category: 'Furniture', location: 'Library', status: 'fixed', priority: 'normal', days: 20,
    description: 'The latch on the second stall does not engage at all, so the door swings open on its own.' },
  { title: 'Water cooler not cooling on third floor', category: 'Water supply', location: 'Hostel B', status: 'assigned', priority: 'normal', days: 3,
    description: 'The cooler runs but the water comes out at room temperature. It has been like this since the weekend.' },
  { title: 'Broken window pane in the stairwell', category: 'Safety', location: 'Hostel A', status: 'reported', priority: 'high', days: 1,
    description: 'A pane on the half-landing is cracked right through and a piece has already fallen out. Glass edges are at hand height.' },
]

const COMMENTS = [
  { report: 0, by: 'admin@campusfix.app', body: 'Logged with the housekeeping contractor. Their team is scheduled for tomorrow morning.' },
  { report: 3, by: 'admin@campusfix.app', body: 'Flagged to the works department as urgent given the rain. Temporary cones going up today.' },
  { report: 4, by: 'admin@campusfix.app', body: 'Both fittings need replacing rather than just the bulbs. Parts ordered.' },
  { report: 7, by: 'admin@campusfix.app', body: 'Replacement extinguisher installed and the whole floor is being audited this week.' },
]

/** Notes an admin would leave when moving a report to each stage. */
const STAGE_NOTE = {
  assigned: 'Assigned to the maintenance team.',
  in_progress: 'Work has started on site.',
  fixed: 'Work completed and checked on site.',
  rejected: 'Not a maintenance issue — referred to the department directly.',
}

const ago = (days, hours = 0) => new Date(Date.now() - days * 86_400_000 + hours * 3_600_000)

function makeCode(taken) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  } while (taken.has(code))
  taken.add(code)
  return code
}

/**
 * The history a report would have accumulated getting to its current status —
 * every stage it passed through on the way, so timelines look real.
 */
function historyFor(status, days) {
  const path = {
    reported: [],
    assigned: ['assigned'],
    in_progress: ['assigned', 'in_progress'],
    fixed: ['assigned', 'in_progress', 'fixed'],
    rejected: ['rejected'],
  }[status]

  // Spread the transitions evenly across the report's lifetime.
  return path.map((stage, i) => ({
    stage,
    from: i === 0 ? 'reported' : path[i - 1],
    at: ago(Math.max(0, days - ((i + 1) * days) / (path.length + 1))),
  }))
}

async function main() {
  console.log(`Database: ${describeDatabase()}`)
  await migrate()

  if (force) {
    // Truncating in one statement handles the foreign keys for us.
    await query('TRUNCATE votes, comments, report_events, reports, categories, users RESTART IDENTITY CASCADE')
    console.log('Cleared existing data.')
  }

  const [{ n }] = await query('SELECT COUNT(*)::int AS n FROM users')
  if (n > 0) {
    console.log('Database already has users — nothing seeded. Use `npm run seed -- --force` to reset.')
    return
  }

  // Hash outside the transaction: bcrypt is deliberately slow and there is no
  // reason to hold a transaction open through it.
  const hashes = Object.fromEntries(
    await Promise.all(USERS.map(async (u) => [u.email, await hashPassword(u.password)]))
  )

  await transaction(async (client) => {
    for (const name of CATEGORIES) {
      await client.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [name])
    }

    const userIds = {}
    for (const u of USERS) {
      const [row] = await client.query(
        `INSERT INTO users (name, email, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [u.name, u.email, hashes[u.email], u.role, ago(30)]
      )
      userIds[u.email] = row.id
    }

    const students = USERS.filter((u) => u.role === 'student').map((u) => u.email)
    const adminId = userIds['admin@campusfix.app']
    const taken = new Set()
    const reportIds = []

    for (const [i, r] of REPORTS.entries()) {
      const reporter = userIds[students[i % students.length]]
      const createdAt = ago(r.days)
      const history = historyFor(r.status, r.days)
      const fixedAt = r.status === 'fixed' ? history.at(-1).at : null
      const updatedAt = history.length ? history.at(-1).at : createdAt

      const [row] = await client.query(
        `INSERT INTO reports
           (code, title, description, category, location, status, priority, reporter_id,
            created_at, updated_at, fixed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [makeCode(taken), r.title, r.description, r.category, r.location, r.status, r.priority,
         reporter, createdAt, updatedAt, fixedAt]
      )

      const id = row.id
      reportIds.push(id)

      await client.query(
        `INSERT INTO report_events (report_id, actor_id, type, to_status, created_at)
         VALUES ($1, $2, 'created', 'reported', $3)`,
        [id, reporter, createdAt]
      )

      for (const step of history) {
        await client.query(
          `INSERT INTO report_events (report_id, actor_id, type, from_status, to_status, note, created_at)
           VALUES ($1,$2,'status',$3,$4,$5,$6)`,
          [id, adminId, step.from, step.stage, STAGE_NOTE[step.stage], step.at]
        )
      }

      // A scattering of upvotes so "most supported" has something to sort.
      for (const voter of Object.values(userIds).slice(0, 2 + (i % 4))) {
        await client.query(
          'INSERT INTO votes (report_id, user_id, created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [id, voter, ago(Math.max(0, r.days - 1))]
        )
      }
    }

    for (const c of COMMENTS) {
      await client.query(
        'INSERT INTO comments (report_id, author_id, body, created_at) VALUES ($1,$2,$3,$4)',
        [reportIds[c.report], userIds[c.by], c.body, ago(REPORTS[c.report].days, 8)]
      )
    }
  })

  console.log('\nSeeded CampusFix demo data.\n')
  console.log('  Admin    admin@campusfix.app   /  admin1234')
  console.log('  Student  student.a@campus.edu  /  demo1234')
  console.log(`\n  ${REPORTS.length} reports, ${CATEGORIES.length} categories, ${USERS.length} users.\n`)
}

main()
  .then(closeDatabase)
  .catch(async (err) => {
    console.error(err)
    await closeDatabase().catch(() => {})
    process.exit(1)
  })
