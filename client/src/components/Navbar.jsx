import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Avatar, Icon } from './ui'

/**
 * Navigation differs by role because the jobs differ. A student files reports
 * and follows their own; an admin works a queue and maintains the categories,
 * locations and people behind it. Giving an admin a raised "Report" button and
 * a "My reports" tab that is almost always empty just wastes the two most
 * reachable places on a phone.
 */
function tabsFor(isAdmin) {
  if (isAdmin) {
    return [
      { to: '/admin', label: 'Queue', icon: Icon.Home, end: true },
      { to: '/campus', label: 'Campus', icon: Icon.Map },
      { to: '/admin/settings', label: 'Manage', icon: Icon.Settings },
    ]
  }
  return [
    { to: '/dashboard', label: 'Home', icon: Icon.Home, end: true },
    { to: '/campus', label: 'Campus', icon: Icon.Map },
    { to: '/submit', label: 'Report', icon: Icon.Plus, primary: true },
    { to: '/reports', label: 'My reports', icon: Icon.List },
  ]
}

/**
 * The avatar is the only account control on a phone, so it has to actually open
 * something. Before this it rendered as a bare span, which meant a student had
 * no way to sign out and an admin no way to reach Settings without a desktop.
 */
function ProfileMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const location = useLocation()

  // Navigating away should never leave the menu hanging open behind the page.
  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    const onPointer = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="profile" ref={wrapRef}>
      <button
        className="profile-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${user.name}`}
      >
        <Avatar name={user.name} src={user.avatarUrl} />
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <Avatar name={user.name} src={user.avatarUrl} />
            <span className="col g-1 grow" style={{ minWidth: 0 }}>
              <strong className="t-sm truncate">{user.name}</strong>
              <span className="t-xs muted truncate">{user.email}</span>
            </span>
          </div>

          <span className={`role-tag ${isAdmin ? 'admin' : ''}`}>
            {isAdmin ? 'Administrator' : 'Student'}
          </span>

          <div className="menu-sep" />

          {isAdmin ? (
            <Link to="/admin/settings" className="menu-item" role="menuitem">
              <Icon.List width={16} height={16} /> Categories, places &amp; people
            </Link>
          ) : (
            <Link to="/reports" className="menu-item" role="menuitem">
              <Icon.List width={16} height={16} /> My reports
            </Link>
          )}

          <button className="menu-item danger" role="menuitem" onClick={onLogout}>
            <Icon.Logout width={16} height={16} /> Log out
          </button>
        </div>
      )}
    </div>
  )
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
                {themeBtn}
                <ProfileMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
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
              ? <ProfileMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
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
