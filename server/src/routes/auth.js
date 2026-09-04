import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { query, queryOne, transaction } from '../db.js'
import {
  hashPassword, verifyPassword, signToken, publicUser, requireAuth, asyncRoute,
} from '../auth.js'
import { validate, signupSchema, loginSchema } from '../validate.js'
import * as google from '../google.js'
import { photoStorageAvailable } from '../storage.js'
import * as mail from '../mail.js'

const router = Router()

// Credential endpoints get a tighter budget than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
})

const findByEmail = (email) => queryOne('SELECT * FROM users WHERE lower(email) = lower($1)', [email])

/**
 * The first account on a fresh install becomes the admin — otherwise nobody
 * could ever reach the dashboard. Everyone after that is a student until an
 * admin promotes them.
 */
async function nextRole(client = { query }) {
  const [{ n }] = await client.query('SELECT COUNT(*)::int AS n FROM users')
  return n === 0 ? 'admin' : 'student'
}

// --- email + password -------------------------------------------------------

router.post('/signup', authLimiter, validate(signupSchema), asyncRoute(async (req, res) => {
  const { name, email, password } = req.body

  if (await findByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists.', field: 'email' })
  }

  const hash = await hashPassword(password)

  const user = await transaction(async (client) => {
    const role = await nextRole(client)
    const [row] = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, hash, role]
    )
    return row
  })

  res.status(201).json({ token: signToken(user), user: publicUser(user) })
}))

router.post('/login', authLimiter, validate(loginSchema), asyncRoute(async (req, res) => {
  const { email, password } = req.body
  const user = await findByEmail(email)

  // Same message either way, so this cannot be used to discover which emails
  // are registered.
  const ok = user && (await verifyPassword(password, user.password_hash))
  if (!ok) {
    if (user && !user.password_hash) {
      return res.status(401).json({
        error: 'That account signs in with Google. Use the “Continue with Google” button.',
      })
    }
    return res.status(401).json({ error: 'That email and password do not match.' })
  }

  res.json({ token: signToken(user), user: publicUser(user) })
}))

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// --- Google sign-in ---------------------------------------------------------

/** Lets the frontend show or hide optional features without guessing. */
router.get('/providers', (_req, res) => {
  res.json({
    google: google.isConfigured,
    photoUploads: photoStorageAvailable,
    email: mail.isConfigured,
  })
})

router.get('/google', asyncRoute(async (req, res) => {
  if (!google.isConfigured) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server.' })
  }

  // The state is signed and self-contained: a serverless deployment has no
  // shared memory between the request that starts the flow and the one that
  // completes it.
  const state = google.signState({
    nonce: Math.random().toString(36).slice(2),
    next: typeof req.query.next === 'string' && req.query.next.startsWith('/') ? req.query.next : '/reports',
  })

  res.redirect(google.buildAuthUrl({ redirect_uri: google.redirectUri(req), state }))
}))

router.get('/google/callback', asyncRoute(async (req, res) => {
  const origin = google.appOrigin(req)
  const fail = (reason) =>
    res.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`)

  if (!google.isConfigured) return fail('Google sign-in is not configured.')
  if (req.query.error) return fail('Google sign-in was cancelled.')

  const state = google.verifyState(req.query.state)
  if (!state) return fail('That sign-in link expired. Please try again.')
  if (!req.query.code) return fail('Google did not return an authorization code.')

  let profile
  try {
    const tokens = await google.exchangeCode({
      code: String(req.query.code),
      redirect_uri: google.redirectUri(req),
    })
    profile = await google.fetchProfile(tokens.access_token)
  } catch (err) {
    console.error('Google sign-in failed:', err.message, err.detail || '')
    return fail(err.message || 'Google sign-in failed.')
  }

  const user = await transaction(async (client) => {
    // Already linked — refresh the profile picture and sign in.
    const [byGoogle] = await client.query('SELECT * FROM users WHERE google_id = $1', [profile.googleId])
    if (byGoogle) {
      const [updated] = await client.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *',
        [profile.avatarUrl, byGoogle.id]
      )
      return updated
    }

    // Same verified email as an existing password account — link the two
    // rather than creating a duplicate person.
    const [byEmail] = await client.query('SELECT * FROM users WHERE lower(email) = lower($1)', [profile.email])
    if (byEmail) {
      const [linked] = await client.query(
        `UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3 RETURNING *`,
        [profile.googleId, profile.avatarUrl, byEmail.id]
      )
      return linked
    }

    const [{ n }] = await client.query('SELECT COUNT(*)::int AS n FROM users')
    const [created] = await client.query(
      `INSERT INTO users (name, email, google_id, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [profile.name, profile.email, profile.googleId, profile.avatarUrl, n === 0 ? 'admin' : 'student']
    )
    return created
  })

  // The SPA reads the token out of the URL fragment and cleans it up, so it
  // never lands in browser history or a server log.
  res.redirect(`${origin}/auth/callback#token=${signToken(user)}&next=${encodeURIComponent(state.next)}`)
}))

export default router
