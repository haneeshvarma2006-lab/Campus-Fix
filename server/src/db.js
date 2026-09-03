import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Postgres access layer.
 *
 * Production (Vercel + Neon, or any managed Postgres) connects over the wire
 * with node-postgres. Local development, when no DATABASE_URL is set, runs
 * PGlite — the real Postgres engine compiled to WebAssembly, storing its data
 * in server/.pgdata. Same engine and same SQL either way, so nothing behaves
 * differently between the two beyond latency.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')

const rawConnectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()

/**
 * Managed Postgres dashboards offer several different snippets and it is easy
 * to copy the wrong one. Catching that here with an explanation beats letting
 * node-postgres fail later with "getaddrinfo ENOTFOUND base".
 */
function validateConnectionString(value) {
  if (!value) return ''

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
    throw new Error([
      `DATABASE_URL must start with postgresql:// — got "${preview}".`,
      '  Leave it empty to use the built-in local database instead.',
    ].join('\n'))
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

const connectionString = validateConnectionString(rawConnectionString)

export const usingRemote = Boolean(connectionString)
export const describeDatabase = () =>
  usingRemote ? 'Postgres (DATABASE_URL)' : 'PGlite — local embedded Postgres'

let backend = null

async function connect() {
  if (backend) return backend

  if (usingRemote) {
    const { default: pg } = await import('pg')

    // Managed Postgres requires TLS; a local server normally has none.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)

    const pool = new pg.Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      // Serverless containers are short-lived and numerous — keep one
      // connection each and let the provider's pooler do the multiplexing.
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

  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = process.env.PGLITE_DIR || path.join(ROOT, '.pgdata')
  const lite = await PGlite.create({ dataDir })

  backend = {
    query: (text, params) => lite.query(text, params).then((r) => r.rows),
    transaction: (fn) =>
      lite.transaction((tx) => fn({ query: (t, p) => tx.query(t, p).then((r) => r.rows) })),
    close: () => lite.close(),
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
