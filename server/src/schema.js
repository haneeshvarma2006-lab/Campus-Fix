import { query } from './db.js'

/**
 * Idempotent schema. Every statement is CREATE ... IF NOT EXISTS or an additive
 * ALTER guarded by IF NOT EXISTS, so this is safe to run on every deploy.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id            SERIAL PRIMARY KEY,
     name          TEXT        NOT NULL,
     email         CITEXT_OR_TEXT NOT NULL UNIQUE,
     password_hash TEXT,
     google_id     TEXT UNIQUE,
     avatar_url    TEXT,
     role          TEXT        NOT NULL DEFAULT 'citizen'
                   CHECK (role IN ('citizen','staff','admin')),
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  // An account must be reachable by at least one method.
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_has_login_method`,
  `ALTER TABLE users ADD CONSTRAINT users_has_login_method
     CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)`,

  `CREATE TABLE IF NOT EXISTS categories (
     id         SERIAL PRIMARY KEY,
     name       TEXT        NOT NULL UNIQUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE IF NOT EXISTS reports (
     id          SERIAL PRIMARY KEY,
     code        TEXT        NOT NULL UNIQUE,
     title       TEXT        NOT NULL,
     description TEXT        NOT NULL,
     category    TEXT        NOT NULL DEFAULT 'General',
     location    TEXT        NOT NULL DEFAULT '',
     latitude    DOUBLE PRECISION,
     longitude   DOUBLE PRECISION,
     photo_url   TEXT,
     status      TEXT        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','in_progress','resolved','rejected')),
     priority    TEXT        NOT NULL DEFAULT 'normal'
                 CHECK (priority IN ('low','normal','high','urgent')),
     reporter_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     resolved_at TIMESTAMPTZ,
     CONSTRAINT reports_coords_paired
       CHECK ((latitude IS NULL) = (longitude IS NULL))
   )`,

  `CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_created  ON reports(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category)`,

  `CREATE TABLE IF NOT EXISTS report_events (
     id          SERIAL PRIMARY KEY,
     report_id   INTEGER     NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
     actor_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
     type        TEXT        NOT NULL,
     from_status TEXT,
     to_status   TEXT,
     note        TEXT,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  `CREATE INDEX IF NOT EXISTS idx_events_report ON report_events(report_id)`,

  `CREATE TABLE IF NOT EXISTS comments (
     id         SERIAL PRIMARY KEY,
     report_id  INTEGER     NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
     author_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     body       TEXT        NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  `CREATE INDEX IF NOT EXISTS idx_comments_report ON comments(report_id)`,

  `CREATE TABLE IF NOT EXISTS votes (
     report_id  INTEGER     NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
     user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (report_id, user_id)
   )`,
]

export async function migrate({ log = false } = {}) {
  // citext gives case-insensitive emails for free, but it needs an extension
  // that some managed hosts do not grant. Fall back to plain text plus a
  // lower(email) unique index, which achieves the same thing.
  let emailType = 'TEXT'
  try {
    await query('CREATE EXTENSION IF NOT EXISTS citext')
    emailType = 'CITEXT'
  } catch {
    if (log) console.log('citext unavailable — using TEXT with a lower(email) index')
  }

  for (const statement of STATEMENTS) {
    await query(statement.replace('CITEXT_OR_TEXT', emailType))
  }

  if (emailType === 'TEXT') {
    await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email))')
  }

  if (log) console.log('Schema is up to date.')
}

// Allow `node src/schema.js` to run migrations on their own.
if (process.argv[1] && process.argv[1].endsWith('schema.js')) {
  migrate({ log: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err.message)
      process.exit(1)
    })
}
