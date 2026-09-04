import { Link } from 'react-router-dom'
import { Icon, NamedIcon } from '../components/ui'
import { categoryMeta } from '../lib/format'

/**
 * A snapshot of a board, so the hero has something true to show before anyone
 * signs in. Deliberately static: the landing page makes no API calls, so it
 * renders instantly on a cold visit over mobile data.
 *
 * This replaced a drawn campus map. A map has to assume one campus layout, and
 * no two colleges share one — blocks are what students actually say.
 */
const DEMO_BLOCKS = [
  { name: '10th Block — CSE',  open: 3, status: 'reported' },
  { name: '6th Block — MCA',   open: 2, status: 'in_progress' },
  { name: 'Girls Hostel',      open: 2, status: 'assigned' },
  { name: '4th Block — Mech',  open: 1, status: 'reported' },
  { name: '2nd Block — Admin', open: 0, status: 'fixed' },
  { name: 'Cafeteria',         open: 0, status: 'fixed' },
]

const QUICK_CATEGORIES = [
  'Electricity', 'Water', 'Wi-Fi', 'Cleanliness',
  'Classroom', 'Hostel', 'Washroom', 'Furniture',
]

const STEPS = [
  { icon: 'Camera', title: 'Snap it', body: 'Photo, place, one line. Under a minute.' },
  { icon: 'Bell', title: 'Track it', body: 'Watch it move from reported to fixed.' },
  { icon: 'CircleCheckBig', title: 'Done', body: 'Closed with a note saying what happened.' },
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

          <div className="board" aria-label="Example board of campus blocks">
            <div className="board-head">
              <span className="overline">Live on campus</span>
              <span className="t-xs faint">example</span>
            </div>

            {DEMO_BLOCKS.map((b, i) => (
              <div key={b.name} className="board-row rise" style={{ animationDelay: `${i * 55}ms` }}>
                <span className="board-dot" style={{ background: `var(--${b.status})` }} />
                <span className="grow truncate">{b.name}</span>
                <span className={`badge s-${b.status}`}>
                  {b.open > 0 ? `${b.open} open` : 'Clear'}
                </span>
              </div>
            ))}
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
                <span className="choice-icon"><NamedIcon name={meta.icon} width={22} height={22} /></span>
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
                <span className="step-icon"><NamedIcon name={s.icon} width={20} height={20} /></span>
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
