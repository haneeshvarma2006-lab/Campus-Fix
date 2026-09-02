import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db.js'
import { hashPassword, verifyPassword, signToken, publicUser, requireAuth } from '../auth.js'
import { validate, signupSchema, loginSchema } from '../validate.js'

const router = Router()

// Credential endpoints get their own tighter budget than the global limiter.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
})

const insertUser = db.prepare(
  'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
)
const byEmail = db.prepare('SELECT * FROM users WHERE email = ?')
const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users')

router.post('/signup', authLimiter, validate(signupSchema), async (req, res) => {
  const { name, email, password } = req.body

  if (byEmail.get(email)) {
    return res.status(409).json({ error: 'An account with that email already exists.', field: 'email' })
  }

  // The very first account to register becomes the admin — otherwise a fresh
  // install would have no way to reach the dashboard.
  const role = countUsers.get().n === 0 ? 'admin' : 'citizen'
  const hash = await hashPassword(password)
  const { lastInsertRowid } = insertUser.run(name, email, hash, role)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)

  res.status(201).json({ token: signToken(user), user: publicUser(user) })
})

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body
  const user = byEmail.get(email)

  // Same message either way so the endpoint can't be used to enumerate emails.
  const ok = user && (await verifyPassword(password, user.password_hash))
  if (!ok) return res.status(401).json({ error: 'That email and password do not match.' })

  res.json({ token: signToken(user), user: publicUser(user) })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

export default router
