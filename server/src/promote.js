import 'dotenv/config'
import { query, queryOne, closeDatabase } from './db.js'

/**
 * Makes an existing account an administrator.
 *
 *   npm run promote -- you@college.edu
 *   npm run promote -- you@college.edu --demote
 *
 * Admin cannot be granted through the app itself — the first account on an
 * empty database becomes admin and everyone after is a student, so once real
 * data exists there is no route in. Filling that gap with a seeded admin whose
 * password lived in a public repository is how the live site ended up with an
 * administrator anyone could log in as.
 *
 * This runs against DATABASE_URL, so using it means holding the database
 * credentials. That is the proof of ownership, and it leaves no way in through
 * the running app for anyone who does not.
 */

const args = process.argv.slice(2)
const demote = args.includes('--demote')
const email = args.find((a) => !a.startsWith('--'))

async function main() {
  if (!email) {
    console.error('Usage: npm run promote -- you@college.edu [--demote]')
    process.exit(1)
  }

  const user = await queryOne('SELECT id, name, email, role FROM users WHERE lower(email) = lower($1)', [email])

  if (!user) {
    console.error(`No account found for ${email}.`)
    console.error('Sign up in the app first, then run this again.')
    process.exit(1)
  }

  const role = demote ? 'student' : 'admin'

  if (user.role === role) {
    console.log(`${user.name} <${user.email}> is already ${role}. Nothing to do.`)
    return
  }

  // Demoting the last admin would leave the dashboard unreachable for everyone.
  if (demote) {
    const [{ n }] = await query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'")
    if (n <= 1) {
      console.error('That is the only administrator. Promote someone else first.')
      process.exit(1)
    }
  }

  await query('UPDATE users SET role = $1 WHERE id = $2', [role, user.id])
  console.log(`${user.name} <${user.email}> is now ${role}.`)
}

main()
  .then(closeDatabase)
  .catch(async (err) => {
    console.error(err.message)
    await closeDatabase().catch(() => {})
    process.exit(1)
  })
