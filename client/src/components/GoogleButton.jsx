import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Icon } from './ui'

/**
 * Starts the server-side OAuth flow with a full-page navigation. The token
 * exchange needs the client secret, so it cannot happen in the browser — the
 * frontend never sees a Google credential.
 *
 * Renders a disabled explanation rather than nothing when Google is not
 * configured, so it is obvious that setup is pending rather than broken.
 */
export function GoogleButton({ label = 'Continue with Google', next = '/' }) {
  const [state, setState] = useState('checking')

  useEffect(() => {
    const c = new AbortController()
    api.providers(c.signal)
      .then((d) => setState(d.google ? 'ready' : 'unconfigured'))
      .catch(() => setState('unconfigured'))
    return () => c.abort()
  }, [])

  if (state === 'checking') {
    return <div className="skel" style={{ height: 48, borderRadius: 12 }} aria-hidden="true" />
  }

  if (state === 'unconfigured') {
    return (
      <div className="panel t-xs muted" style={{ textAlign: 'center' }}>
        Google sign-in isn&rsquo;t set up on this server yet — use email below.
      </div>
    )
  }

  return (
    <a className="btn btn-ghost btn-lg btn-block" href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
      <Icon.Google />
      {label}
    </a>
  )
}
