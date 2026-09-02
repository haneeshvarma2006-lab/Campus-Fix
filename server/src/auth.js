import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db, DATA_DIR } from './db.js'

const TOKEN_TTL = '7d'

// A JWT secret must survive restarts or every token dies on reload. Prefer the
// env var; otherwise generate one once and keep it beside the database.
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const file = path.join(DATA_DIR, '.jwt-secret')
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim()
  const generated = crypto.randomBytes(48).toString('hex')
  fs.writeFileSync(file, generated, { mode: 0o600 })
  return generated
}

const SECRET = resolveSecret()

export const hashPassword = (plain) => bcrypt.hash(plain, 10)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: TOKEN_TTL })
}

export function publicUser(user) {
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.created_at }
}

const findUser = db.prepare('SELECT * FROM users WHERE id = ?')

function readToken(req) {
  const header = req.get('authorization') || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  return null
}

/** Attaches req.user when a valid token is present; never rejects. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req)
  if (!token) return next()
  try {
    const payload = jwt.verify(token, SECRET)
    req.user = findUser.get(payload.sub) || undefined
  } catch {
    // An expired or malformed token is treated as "not logged in".
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

export const isStaff = (user) => !!user && (user.role === 'admin' || user.role === 'staff')
