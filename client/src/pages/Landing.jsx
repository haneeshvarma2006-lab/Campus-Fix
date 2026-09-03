import { Link } from 'react-router-dom'
import { CampusMap } from '../components/CampusMap'
import { Icon } from '../components/ui'
import { categoryMeta } from '../lib/format'

/**
 * A snapshot of a campus, so the map has something to show before anyone signs
 * in. Deliberately static: the landing page makes no API calls, so it renders
 * instantly on a cold visit over mobile data.
 */
const DEMO_PINS = [
  { id: 1, name: 'Main Gate',      x: 50, y: 88, open_count: 2 },
  { id: 2, name: 'Academic Block', x: 34, y: 44, open_count: 3 },
  { id: 3, name: 'Lab Block',      x: 62, y: 38, open_count: 1 },
  { id: 4, name: 'Library',        x: 48, y: 22, open_count: 0 },
  { id: 5, name: 'Canteen',        x: 72, y: 62, open_count: 2 },
  { id: 6, name: 'Sports Ground',  x: 20, y: 72, open_count: 0 },
  { id: 7, name: 'Auditorium',     x: 68, y: 78, open_count: 0 },
  { id: 8, name: 'Hostel A',       x: 14, y: 26, open_count: 1 },
  { id: 9, name: 'Hostel B',       x: 14, y: 46, open_count: 1 },
]

const QUICK_CATEGORIES = [
  'Electricity', 'Water', 'Wi-Fi', 'Cleanliness',
  'Classroom', 'Hostel', 'Washroom', 'Furniture',
]

const STEPS = [
  { emoji: '📸', title: 'Snap it', body: 'Photo, place, one line. Under a minute.' },
  { emoji: '🔔', title: 'Track it', body: 'Watch it move from reported to fixed.' },
  { emoji: '✅', title: 'Done', body: 'Closed with a note saying what happened.' },
]

export function Landing() {
  return (
    <>
      {/* --- hero --- */}
      <section className="wrap" style={{ paddingBlock: '28px 40px' }}>
        <div className="landing-hero">
          <div className="col g-4">
            <span className="tag" style={{ alignSelf: 'flex-start' }}>
              🎓 For your campus
            </span>

            <h1 className="t-hero">
              Something broken<br />on campus?
            </h1>

            <p className="lede" style={{ maxWidth: '38ch' }}>
              Report it in under a minute. Then actually see it get fixed —
              no group chats, no chasing the office.
            </p>

            <div className="row wrap-x g-3" style={{ marginTop: 4 }}>
              <Link to="/signup" className="btn btn-lg">
                <Icon.Plus /> Report a problem
              </Link>
              <Link to="/campus" className="btn btn-ghost btn-lg">
                <Icon.Map /> Explore campus
              </Link>
            </div>

            <p className="t-xs faint" style={{ marginTop: 2 }}>
              Sign in with your college Google account.
            </p>
          </div>

          <div className="map-frame landing-map">
            <CampusMap locations={DEMO_PINS} compact />
            <div className="map-legend">
              <span className="k">
                <span className="sw" style={{ background: 'var(--reported)' }} />
                Open
              </span>
              <span className="k">
                <span className="sw" style={{ background: 'var(--fixed)' }} />
                All clear
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- what you can report --- */}
      <section className="wrap" style={{ paddingBottom: 40 }}>
        <h2 className="t-h2" style={{ marginBottom: 4 }}>What can you report?</h2>
        <p className="muted t-sm" style={{ marginBottom: 16 }}>
          Pick one, say where, done.
        </p>

        <div className="choices">
          {QUICK_CATEGORIES.map((name) => {
            const meta = categoryMeta(name)
            return (
              <Link key={name} to="/signup" className="choice">
                <span className="choice-emoji">{meta.emoji}</span>
                {meta.label}
              </Link>
            )
          })}
        </div>
      </section>

      {/* --- how it works --- */}
      <section className="wrap" style={{ paddingBottom: 40 }}>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card col g-2">
              <div className="row g-2">
                <span style={{ fontSize: 22 }}>{s.emoji}</span>
                <span className="overline">Step {i + 1}</span>
              </div>
              <h3 className="t-h3">{s.title}</h3>
              <p className="t-sm muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- close --- */}
      <section className="wrap" style={{ paddingBottom: 48 }}>
        <div className="card cta-card">
          <h2 className="t-h1">Your campus, fixed faster.</h2>
          <p className="lede" style={{ margin: '8px 0 20px', maxWidth: '34ch' }}>
            Every report gets a reference code and a status you can check.
          </p>
          <Link to="/signup" className="btn btn-lg">Get started</Link>
        </div>
      </section>
    </>
  )
}
