import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryOne } from './db.js'
import { registerCheck } from './health.js'

const TOKEN_TTL = '7d'

/**
 * The JWT secret must be stable across restarts and across serverless
 * instances, or tokens die unpredictably. In production it is required; in
 * development a throwaway one is generated so the app still starts.
 *
 * A missing secret is recorded rather than thrown at import. Throwing here
 * takes down the whole serverless function before it can serve anything —
 * including the health endpoint that would have explained the problem.
 */
function resolveSecret() {
  if (process.env.JWT_SECRET) return { secret: process.env.JWT_SECRET, problem: null }

  if (process.env.NODE_ENV === 'production') {
    const problem =
      'JWT_SECRET is not set. Add it to the environment and redeploy — ' +
      'without it, sign-in cannot be trusted across restarts.'
    console.error(`Configuration error: ${problem}`)
    return { secret: null, problem }
  }

  console.warn('JWT_SECRET is not set — generating a temporary one for this process.')
  return { secret: crypto.randomBytes(48).toString('hex'), problem: null }
}

const { secret: SECRET, problem: secretProblem } = resolveSecret()

registerCheck(() => secretProblem)

function requireSecret() {
  if (!SECRET) {
    throw Object.assign(new Error(secretProblem), { status: 503, expose: true })
  }
  return SECRET
}

export const hashPassword = (plain) => bcrypt.hash(plain, 10)
export const verifyPassword = (plain, hash) => (hash ? bcrypt.compare(plain, hash) : Promise.resolve(false))

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, requireSecret(), { expiresIn: TOKEN_TTL })
}

export function publicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url || null,
    hasPassword: Boolean(user.password_hash),
    hasGoogle: Boolean(user.google_id),
    createdAt: user.created_at,
  }
}

function readToken(req) {
  const header = req.get('authorization') || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  return null
}

/** Attaches req.user when a valid token is present; never rejects. */
export async function optionalAuth(req, _res, next) {
  const token = readToken(req)
  if (!token) return next()

  try {
    const payload = jwt.verify(token, requireSecret())
    // Re-read the user rather than trusting the token's claims, so a role
    // change or a deleted account takes effect on the very next request.
    req.user = (await queryOne('SELECT * FROM users WHERE id = $1', [payload.sub])) || undefined
  } catch {
    // Expired or malformed tokens simply mean "not logged in".
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'You need to be logged in to do that.' })
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'You need to be logged in to do that.' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that." })
    }
    next()
  }
}

export const isAdmin = (user) => !!user && user.role === 'admin'

/** Wraps an async route so a rejected promise reaches the error handler. */
export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
