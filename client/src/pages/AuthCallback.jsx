import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast, Spinner } from '../components/ui'

/**
 * Lands here after Google sends the browser back. The token arrives in the URL
 * fragment rather than the query string, so it is never sent to a server or
 * written into an access log — and it is stripped from the address bar as soon
 * as it has been read.
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const { adoptToken } = useAuth()
  const { notify, error: toastError } = useToast()
  const [message, setMessage] = useState('Signing you in…')
  const handled = useRef(false)

  useEffect(() => {
    // React 18 runs effects twice in development; the token is consumed once.
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = params.get('token')
    const next = params.get('next') || '/'

    window.history.replaceState(null, '', window.location.pathname)

    if (!token) {
      setMessage('That sign-in link was missing its token.')
      toastError('Sign-in failed. Please try again.')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
      return
    }

    adoptToken(token)
      .then((user) => {
        notify(`Signed in as ${user.name.split(' ')[0]}.`)
        navigate(next, { replace: true })
      })
      .catch(() => {
        setMessage('That sign-in could not be completed.')
        toastError('Sign-in failed. Please try again.')
        setTimeout(() => navigate('/login', { replace: true }), 1200)
      })
  }, [adoptToken, navigate, notify, toastError])

  return (
    <div className="wrap-s auth-wrap">
      <div className="card row" style={{ justifyContent: 'center', gap: 12, padding: 34 }}>
        <Spinner />
        <span className="muted">{message}</span>
      </div>
    </div>
  )
}
