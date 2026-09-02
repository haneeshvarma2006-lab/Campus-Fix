import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { StatusBadge, Icon } from '../components/ui'

const CONTENTS = [
  { n: 1, label: 'What it does',      href: '#what' },
  { n: 2, label: 'How a report moves', href: '#how' },
  { n: 3, label: 'Inside the dashboard', href: '#dashboard' },
  { n: 4, label: 'Who sees what',      href: '#roles' },
  { n: 5, label: 'Get started',        href: '#start' },
]

const FEATURES = [
  {
    icon: Icon.Camera,
    title: 'One minute to file',
    body: 'A title, a photo, and where it is. Location fills in automatically, and the camera opens straight from the form on a phone.',
  },
  {
    icon: Icon.Layers,
    title: 'One queue, not a group chat',
    body: 'Every report lands in the same place with a reference code. Sort by status, category, priority, or how many people have backed it.',
  },
  {
    icon: Icon.Clock,
    title: 'A trail you can point at',
    body: 'Each status change is timestamped, attributed, and kept. When someone asks what happened to a report, the answer is on the page.',
  },
  {
    icon: Icon.Up,
    title: 'Weight behind a problem',
    body: 'Anyone can back a report. What affects the most people rises, instead of the loudest complaint winning.',
  },
  {
    icon: Icon.Shield,
    title: 'Roles that actually hold',
    body: 'Students see their own reports and nothing else. Access is enforced on the server for every request, not hidden in the interface.',
  },
  {
    icon: Icon.Bolt,
    title: 'Numbers worth reading',
    body: 'Resolution rate, average time to close, a fortnight of activity, and where the backlog sits — on the dashboard, not in a spreadsheet.',
  },
]

const STEPS = [
  { n: 'Reported', body: 'A student files it with a photo, a location, and a sentence about what is wrong. It gets a reference code immediately.' },
  { n: 'Assigned', body: 'An admin picks it up and makes someone responsible, leaving a note about who and when.' },
  { n: 'In progress', body: 'Work has actually started on site. The reporter can see that without having to ask anyone.' },
  { n: 'Fixed', body: 'Closed out and timestamped. Anything invalid is rejected instead, with the reason recorded.' },
]

const ROLES = [
  { name: 'Student', body: 'Files reports and tracks their own. Reads every note the team leaves and can back other issues they are affected by.' },
  { name: 'Admin',   body: 'Sees the entire queue, moves reports through the stages, sets priority, and manages the category list and who holds which role.' },
]

function MoodSwitcher() {
  const { theme, moods, setTheme } = useTheme()
  return (
    <div className="moods" role="group" aria-label="Colour mood">
      {moods.map((m) => (
        <button
          key={m.id}
          className="mood-dot"
          style={{ background: m.swatch }}
          aria-label={m.label}
          aria-pressed={theme === m.id}
          title={m.label}
          onClick={() => setTheme(m.id)}
        />
      ))}
    </div>
  )
}

/** A small non-interactive mock of the dashboard, to show rather than tell. */
function Preview() {
  const rows = [
    { code: 'K2HDF6', title: 'Overflowing bin outside Block C', cat: 'Sanitation', status: 'in_progress' },
    { code: '8H2B24', title: 'Large pothole near the main gate', cat: 'Road damage', status: 'reported' },
    { code: 'QM47XZ', title: 'Streetlight out along the back path', cat: 'Streetlight', status: 'assigned' },
    { code: 'T9WCB4', title: 'Tap leaking continuously in washroom', cat: 'Plumbing', status: 'fixed' },
  ]
  const bars = [2, 0, 1, 3, 1, 0, 2, 4, 3, 1, 2, 5, 4, 2]

  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-bar">
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="code" style={{ marginLeft: 8 }}>campusfix — dashboard</span>
      </div>

      <div style={{ padding: 22 }}>
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          {[
            { v: '4', l: 'Reported', t: 'reported' },
            { v: '3', l: 'Assigned', t: 'assigned' },
            { v: '3', l: 'In progress', t: 'in_progress' },
            { v: '2d', l: 'Avg to fix', t: '' },
          ].map((s) => (
            <div key={s.l} className={`stat t-${s.t}`}>
              <div className="stat-value">{s.v}</div>
              <div className="stat-label">{s.t && <span className="badge-dot" />}{s.l}</div>
            </div>
          ))}
        </div>

        <div className="chart-grid" style={{ marginBottom: 16 }}>
          <div className="card chart-card">
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 className="h3" style={{ fontSize: 14 }}>Reports filed</h3>
              <span className="tiny faint">last 14 days</span>
            </div>
            <div className="trend">
              {bars.map((n, i) => (
                <div key={i} className="trend-col" data-has={n > 0}>
                  <span className="trend-bar" style={{ height: `${Math.max(6, (n / 5) * 100)}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="h3" style={{ fontSize: 14, marginBottom: 14 }}>By category</h3>
            <div className="stack g-3">
              {[['Sanitation', 100], ['Road damage', 100], ['Electrical', 50], ['Safety', 50]].map(([label, pct]) => (
                <div key={label} className="bar-row">
                  <span className="bar-label small">{label}</span>
                  <span className="bar-track"><span className="bar-fill" style={{ width: `${pct}%` }} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stack g-2">
          {rows.map((r) => (
            <div key={r.code} className="panel row" style={{ gap: 12 }}>
              <span className="code">#{r.code}</span>
              <span className="small truncate" style={{ fontWeight: 550, flex: 1 }}>{r.title}</span>
              <span className="tag">{r.cat}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Landing() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return null

  return (
    <>
      <section className="sky">
        <div className="moon" aria-hidden="true" />

        <div className="shell-wide sky-inner">
          <span className="sky-eyebrow">Sanitation &amp; maintenance reporting</span>

          <h1 className="sky-title">
            Report it. Track it.<br />
            See it <em>fixed</em>.
          </h1>

          <p className="sky-lede">
            CampusFix turns “someone should really fix that” into a tracked ticket with a
            reference number, a photo, and a status anyone involved can check.
          </p>

          <nav className="contents" aria-label="On this page">
            {CONTENTS.map((c) => (
              <a key={c.n} href={c.href} className="contents-row">
                <span className="contents-num">[{c.n}]</span>
                <span className="contents-leader" aria-hidden="true" />
                <span className="contents-label">{c.label}</span>
              </a>
            ))}
          </nav>

          <div className="sky-actions">
            <Link to="/signup" className="btn btn-lg btn-sky">Create an account</Link>
            <Link to="/login" className="btn btn-lg btn-sky-ghost">See the demo</Link>
          </div>
        </div>

        <MoodSwitcher />
        <span className="sky-caption">Built for campuses and neighbourhoods</span>
      </section>

      <section id="what" className="shell-wide" style={{ paddingBlock: '96px 0' }}>
        <div className="page-head" style={{ textAlign: 'center' }}>
          <span className="overline">[1] What it does</span>
          <h2 className="display" style={{ fontSize: 'clamp(30px, 4.4vw, 46px)', marginTop: 14 }}>
            Reporting a problem is easy.<br />Knowing what happened next is not.
          </h2>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card feature">
              <span className="feature-mark"><f.icon width={17} height={17} /></span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="shell-wide" style={{ paddingBlock: '96px 0' }}>
        <span className="overline">[2] How a report moves</span>
        <hr className="section-rule" style={{ marginTop: 14, marginBottom: 34 }} />

        <div className="feature-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} className="feature">
              <span className="step-num">0{i + 1}</span>
              <h3>{s.n}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="dashboard" className="shell-wide" style={{ paddingBlock: '96px 0' }}>
        <span className="overline">[3] Inside the dashboard</span>
        <hr className="section-rule" style={{ marginTop: 14, marginBottom: 34 }} />
        <Preview />
      </section>

      <section id="roles" className="shell-wide" style={{ paddingBlock: '96px 0' }}>
        <span className="overline">[4] Who sees what</span>
        <hr className="section-rule" style={{ marginTop: 14, marginBottom: 34 }} />

        <div className="feature-grid">
          {ROLES.map((r) => (
            <div key={r.name} className="card feature">
              <span className="role-pill" style={{ alignSelf: 'flex-start' }}>{r.name}</span>
              <p style={{ marginTop: 4 }}>{r.body}</p>
            </div>
          ))}
        </div>

        <p className="small muted" style={{ marginTop: 20, maxWidth: '68ch' }}>
          New accounts are always students. The one exception: on a brand-new install the first
          account to register becomes the admin, because otherwise nobody could ever reach the
          dashboard.
        </p>
      </section>

      <section id="start" className="shell-wide" style={{ paddingBlock: '96px 96px' }}>
        <div className="cta">
          <h2>Stop losing track of what needs fixing.</h2>
          <p className="lede" style={{ margin: '0 auto 28px', maxWidth: '46ch' }}>
            Sign up and file your first report in about a minute.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-lg">Get started</Link>
            <Link to="/login" className="btn btn-ghost btn-lg">Log in</Link>
          </div>
        </div>
      </section>
    </>
  )
}
