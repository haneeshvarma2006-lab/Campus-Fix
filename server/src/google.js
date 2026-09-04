import crypto from 'node:crypto'

/**
 * Google Sign-In using the OAuth 2.0 authorization-code flow, implemented
 * directly against Google's endpoints so there is no extra SDK to keep current.
 *
 * The whole feature stays dormant until GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET are set — `isConfigured` gates both the routes and the
 * button in the UI, so an unconfigured install simply does not offer it.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export const isConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)

/**
 * Where Google sends the browser back to. Must match a redirect URI registered
 * in the Google Cloud console exactly, including scheme and port.
 */
export function redirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI
  const proto = req.get('x-forwarded-proto') || req.protocol
  return `${proto}://${req.get('host')}/api/auth/google/callback`
}

/** Where the SPA lives, for the final redirect back with a token. */
export function appOrigin(req) {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN
  const proto = req.get('x-forwarded-proto') || req.protocol
  return `${proto}://${req.get('host')}`
}

/**
 * Builds the consent-screen URL.
 *
 * `state` is a signed, expiring value rather than a session lookup, because a
 * serverless deployment has no shared memory between the request that starts
 * the flow and the one that finishes it. It carries CSRF protection and the
 * path to return to.
 */
export function buildAuthUrl({ redirect_uri, state }) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params}`
}

const stateSecret = () =>
  process.env.JWT_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'campusfix-oauth-state'

export function signState(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60_000 })).toString('base64url')
  const mac = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verifyState(state) {
  if (typeof state !== 'string' || !state.includes('.')) return null
  const [body, mac] = state.split('.')

  const expected = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url')
  const a = Buffer.from(mac || '')
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/** Exchanges the one-time code for an access token. */
export async function exchangeCode({ code, redirect_uri }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw Object.assign(new Error('Google rejected the sign-in attempt.'), {
      status: 502,
      detail,
    })
  }
  return res.json()
}

/** Fetches the signed-in person's profile. */
export async function fetchProfile(accessToken) {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw Object.assign(new Error('Could not read your Google profile.'), { status: 502 })
  }

  const profile = await res.json()
  if (!profile.email) {
    throw Object.assign(new Error('That Google account has no email address attached.'), { status: 400 })
  }
  if (profile.email_verified === false) {
    throw Object.assign(new Error('That Google account’s email is not verified.'), { status: 400 })
  }

  return {
    googleId: profile.sub,
    email: String(profile.email).toLowerCase(),
    name: profile.name || profile.given_name || profile.email.split('@')[0],
    avatarUrl: profile.picture || null,
  }
}

/**
 * Restricts the post-sign-in destination to a path inside this app.
 *
 * `startsWith('/')` was not enough: `//evil.example` and the backslash forms
 * browsers normalise into it both begin with a slash and both leave the site.
 * The value is signed into the OAuth state and reflected back to the browser,
 * so it has to be safe before it is trusted, not after.
 */
export function safeNext(value, fallback = '/reports') {
  if (typeof value !== 'string' || value.length === 0) return fallback
  const path = value.replace(new RegExp('\\\\', 'g'), '/')
  if (!path.startsWith('/') || path.startsWith('//')) return fallback
  if (/^\/+[a-zA-Z][a-zA-Z\d+\-.]*:/.test(path)) return fallback
  return path
}
