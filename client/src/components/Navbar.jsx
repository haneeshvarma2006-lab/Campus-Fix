import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Avatar, Icon } from './ui'

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const { theme, moods, cycle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // The landing hero is a full-bleed sky; the header floats over it until the
  // page scrolls, then picks up its own background so the links stay readable.
  const onLanding = location.pathname === '/' && !user
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!onLanding) return undefined
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onLanding])

  const overSky = onLanding && !scrolled

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const links = !user
    ? []
    : isAdmin
      ? [
          { to: '/admin', label: 'Dashboard' },
          { to: '/reports', label: 'My reports' },
          { to: '/submit', label: 'Report an issue' },
          { to: '/admin/settings', label: 'Settings' },
        ]
      : [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/reports', label: 'My reports' },
          { to: '/submit', label: 'Report an issue' },
        ]

  const nextMood = moods[(moods.findIndex((m) => m.id === theme) + 1) % moods.length]

  const themeButton = (
    <button
      className="icon-btn"
      onClick={cycle}
      title={`Switch to ${nextMood.label.toLowerCase()}`}
      aria-label={`Colour mood: ${theme}. Switch to ${nextMood.label}.`}
    >
      {theme === 'night' ? <Icon.Sun /> : <Icon.Moon />}
    </button>
  )

  const navLinks = links.map((l) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.to === '/admin'}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
    >
      {l.label}
    </NavLink>
  ))

  return (
    <>
      <header className={`header ${overSky ? 'over-sky' : ''}`}>
        <div className="shell-wide header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 12.5v-9h5M4.5 8h4" />
                <circle cx="11.5" cy="11" r="1.6" fill="currentColor" stroke="none" />
              </svg>
            </span>
            CampusFix
          </Link>

          {/* Wide screens: everything lives in the bar. */}
          <nav className="nav nav-desktop">
            {navLinks}
            {user && <span className="nav-divider" />}
            {themeButton}

            {user ? (
              <>
                <Avatar name={user.name} src={user.avatarUrl} title={`${user.name} · ${user.role}`} />
                <button className="btn btn-quiet btn-sm" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Log in</Link>
                <Link to="/signup" className="btn btn-sm">Get started</Link>
              </>
            )}
          </nav>

          {/* Narrow screens: only the essentials stay up top. */}
          <nav className="nav-compact">
            {themeButton}
            {user
              ? <Avatar name={user.name} src={user.avatarUrl} size="avatar-sm" />
              : <Link to="/login" className="btn btn-sm">Log in</Link>}
          </nav>
        </div>
      </header>

      {/* Narrow screens: page links become a scrollable strip below the bar. */}
      {user && (
        <div className="nav-mobile">
          {navLinks}
          <button className="nav-link" onClick={handleLogout}>Log out</button>
        </div>
      )}
    </>
  )
}
