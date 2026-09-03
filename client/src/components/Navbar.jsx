import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Avatar, Icon } from './ui'

/** The four places a signed-in student actually goes. */
function tabsFor(isAdmin) {
  return [
    { to: isAdmin ? '/admin' : '/dashboard', label: 'Home', icon: Icon.Home, end: true },
    { to: '/campus', label: 'Campus', icon: Icon.Map },
    { to: '/submit', label: 'Report', icon: Icon.Plus, primary: true },
    { to: '/reports', label: 'My reports', icon: Icon.List },
  ]
}

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const tabs = user ? tabsFor(isAdmin) : []

  const themeBtn = (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
    </button>
  )

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-in">
          <Link to={user ? (isAdmin ? '/admin' : '/dashboard') : '/'} className="brand">
            <span className="brand-mark">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8.4c0 4.3-6 9.6-6 9.6s-6-5.3-6-9.6a6 6 0 0 1 12 0z" />
                <path d="M7.8 8.3l1.6 1.6 3-3.2" />
              </svg>
            </span>
            CampusFix
          </Link>

          <nav className="nav nav-desktop">
            {user ? (
              <>
                {tabs.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) => `nav-a ${isActive ? 'on' : ''}`}
                  >
                    {t.label}
                  </NavLink>
                ))}
                {isAdmin && (
                  <NavLink to="/admin/settings" className={({ isActive }) => `nav-a ${isActive ? 'on' : ''}`}>
                    Settings
                  </NavLink>
                )}
                {themeBtn}
                <Avatar name={user.name} src={user.avatarUrl} title={`${user.name} · ${user.role}`} />
                <button className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
                  <Icon.Logout />
                </button>
              </>
            ) : (
              <>
                {themeBtn}
                <Link to="/login" className="nav-a">Log in</Link>
                <Link to="/signup" className="btn btn-sm">Get started</Link>
              </>
            )}
          </nav>

          {/* Phone: the tab bar carries navigation, so the header stays minimal. */}
          <nav className="nav nav-mobile-only">
            {themeBtn}
            {user
              ? <Avatar name={user.name} src={user.avatarUrl} />
              : <Link to="/login" className="btn btn-sm">Log in</Link>}
          </nav>
        </div>
      </header>

      {user && (
        <nav className="tabbar" aria-label="Main">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `tab ${t.primary ? 'tab-primary' : ''} ${isActive ? 'on' : ''}`}
            >
              {t.primary ? (
                <span className="tab-fab"><t.icon /></span>
              ) : (
                <t.icon />
              )}
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}
