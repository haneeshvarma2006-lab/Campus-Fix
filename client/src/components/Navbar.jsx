import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Icon } from './ui'

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
}

export function Navbar() {
  const { user, isStaff, isAdmin, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const links = user
    ? [
        { to: '/submit', label: 'Report an issue' },
        { to: '/reports', label: 'My reports' },
        ...(isStaff ? [{ to: '/admin', label: 'Dashboard' }] : []),
        ...(isAdmin ? [{ to: '/admin/settings', label: 'Settings' }] : []),
      ]
    : [
        { to: '/login', label: 'Log in' },
        { to: '/signup', label: 'Sign up' },
      ]

  const themeButton = (
    <button
      className="icon-btn"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle colour theme"
    >
      {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
    </button>
  )

  return (
    <>
      <header className="header">
        <div className="shell-wide header-inner">
          <Link to={user ? '/reports' : '/'} className="brand">
            <span className="brand-mark">CF</span>
            CampusFix
          </Link>

          {/* Wide screens: everything lives in the bar. */}
          <nav className="nav nav-desktop">
            {user && links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/admin'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}

            {user && <span className="nav-divider" />}
            {themeButton}

            {user ? (
              <>
                <span className="avatar" title={`${user.name} · ${user.role}`}>{initials(user.name)}</span>
                <button className="btn btn-quiet btn-sm" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Log in</Link>
                <Link to="/signup" className="btn btn-sm">Get started</Link>
              </>
            )}
          </nav>

          {/* Narrow screens: only the theme toggle stays up top. */}
          <nav className="nav nav-compact" style={{ marginLeft: 'auto' }}>
            {themeButton}
          </nav>
        </div>
      </header>

      {/* Narrow screens: page links become a scrollable strip below the bar. */}
      <div className="nav-mobile">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/admin'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {l.label}
          </NavLink>
        ))}
        {user && (
          <button className="nav-link" onClick={handleLogout} style={{ border: 'none', background: 'none' }}>
            Log out
          </button>
        )}
      </div>
    </>
  )
}
