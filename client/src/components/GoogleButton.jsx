import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Icon } from './ui'

/**
 * Starts the server-side OAuth flow with a full-page navigation — the token
 * exchange needs the client secret, so it cannot happen in the browser.
 *
 * The button renders nothing at all until the server confirms Google is
 * configured, so an install without credentials simply does not offer it.
 */
export function GoogleButton({ label = 'Continue with Google', next = '/dashboard' }) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api.providers(controller.signal)
      .then((d) => setAvailable(Boolean(d.google)))
      .catch(() => setAvailable(false))
    return () => controller.abort()
  }, [])

  if (!available) return null

  return (
    <>
      <a
        className="btn btn-google btn-block"
        href={`/api/auth/google?next=${encodeURIComponent(next)}`}
      >
        <Icon.Google />
        {label}
      </a>
      <div className="or">or</div>
    </>
  )
}
