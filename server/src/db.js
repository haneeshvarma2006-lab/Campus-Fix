import { registerCheck } from './health.js'

/**
 * Postgres access layer.
 *
 * One path: a managed Postgres reached over the wire with node-postgres.
 * There is no embedded fallback. Carrying one meant shipping PGlite — 25 MB of
 * WebAssembly, 62% of the server's dependencies — to every production build,
 * for an engine production never runs. Every environment now points at a real
 * database, so what runs locally is what runs live.
 */

const rawConnectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()

/**
 * Managed Postgres dashboards offer several different snippets and it is easy
 * to copy the wrong one. Catching that here with an explanation beats letting
 * node-postgres fail later with "getaddrinfo ENOTFOUND base".
 */
function validateConnectionString(value) {
  if (!value) {
    throw new Error([
      'DATABASE_URL is not set.',
      '  CampusFix needs a Postgres connection string — there is no local fallback.',
      '  Create a free database at neon.tech, copy its "Connection string" (URI),',
      '  and put it in server/.env as DATABASE_URL=postgresql://…',
    ].join('\n'))
  }

  const unquoted = value.replace(/^['"]|['"]$/g, '').trim()

  if (/^psql\b/i.test(unquoted)) {
    throw new Error([
      'DATABASE_URL looks like a psql command, not a connection string.',
      '  In your database dashboard pick the "Connection string" (URI) option —',
      '  it starts with postgresql:// and includes a username, password and host.',
    ].join('\n'))
  }

  if (!/^postgres(ql)?:\/\//.test(unquoted)) {
    const preview = unquoted.slice(0, 24) + (unquoted.length > 24 ? '…' : '')
    throw new Error(`DATABASE_URL must start with postgresql:// — got "${preview}".`)
  }

  let url
  try {
    url = new URL(unquoted)
  } catch {
    throw new Error('DATABASE_URL is not a valid URL. Check for stray spaces or line breaks.')
  }

  if (!url.username || !url.password) {
    throw new Error([
      'DATABASE_URL is missing a username or password.',
      '  Copy the whole connection string, including the credentials before the @.',
    ].join('\n'))
  }

  return unquoted
}

let connectionString = ''
let connectionProblem = null

try {
  connectionString = validateConnectionString(rawConnectionString)
} catch (err) {
  // Recorded rather than thrown: a missing or malformed connection string must
  // still let the app boot far enough to say so on /api/health.
  connectionProblem = err.message
  console.error(`Configuration error: ${err.message}`)
}

registerCheck(() => connectionProblem)

export const describeDatabase = () =>
  connectionString ? 'Postgres (DATABASE_URL)' : 'not configured'

let backend = null

async function connect() {
  if (backend) return backend

  if (!connectionString) {
    throw Object.assign(new Error(connectionProblem || 'DATABASE_URL is not set.'), { status: 503 })
  }

  const { default: pg } = await import('pg')

  // Managed Postgres requires TLS; a server on this machine normally has none.
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)

  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    // Serverless containers are short-lived and numerous — keep one connection
    // each and let the provider's pooler do the multiplexing.
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  })

  pool.on('error', (err) => console.error('Postgres pool error:', err.message))

  backend = {
    query: (text, params) => pool.query(text, params).then((r) => r.rows),
    transaction: async (fn) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn({ query: (t, p) => client.query(t, p).then((r) => r.rows) })
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
  return backend
}

/** Runs a query and returns the rows. */
export async function query(text, params = []) {
  const db = await connect()
  return db.query(text, params)
}

/** Runs a query expected to match at most one row. */
export async function queryOne(text, params = []) {
  const rows = await query(text, params)
  return rows[0] || null
}

/** Runs a set of statements atomically. The callback receives `{ query }`. */
export async function transaction(fn) {
  const db = await connect()
  return db.transaction(fn)
}

export async function closeDatabase() {
  if (!backend) return
  await backend.close()
  backend = null
}

export default { query, queryOne, transaction, closeDatabase }
