import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Icon } from '../components/ui'
import '../styles/landing.css'

/* --- the report that plays out on the live card ----------------------------- */

const STAGES = [
  { id: 'reported',    label: 'Reported',    tint: '#F0A45A' },
  { id: 'assigned',    label: 'Assigned',    tint: '#7AA7F5' },
  { id: 'in_progress', label: 'In progress', tint: '#57C7F0' },
  { id: 'fixed',       label: 'Fixed',       tint: '#4ADE9B' },
]

const CHIPS = [
  { label: 'Sanitation',  top: '-9%',    left: '-24%',  depth: 96,  delay: '0s' },
  { label: 'Electrical',  top: '30%',    right: '-30%', depth: 140, delay: '1.1s' },
  { label: 'Plumbing',    bottom: '18%', left: '-34%',  depth: 64,  delay: '2.3s' },
  { label: 'Streetlight', bottom: '-8%', right: '-20%', depth: 116, delay: '3.4s' },
]

/** Live signals scattered around the deck, in the pipeline's colours. */
const PINS = [
  { top: '6%',   left: '-16%',  depth: 170, color: '#F0A45A', delay: '0s' },
  { top: '62%',  left: '-9%',   depth: 200, color: '#57C7F0', delay: '.9s' },
  { top: '18%',  right: '-13%', depth: 190, color: '#4ADE9B', delay: '1.8s' },
  { bottom: '8%', right: '-6%', depth: 150, color: '#7AA7F5', delay: '2.5s' },
]

const TICKER = [
  'Overflowing bin outside Block C',
  'Corridor light flickering',
  'Pothole near the main gate',
  'Tap leaking in the washroom',
  'Streetlight out on the back path',
  'Broken window pane in the stairwell',
  'Drain blocked behind the canteen',
  'Water cooler not cooling',
]

const BEATS = [
  { n: '01', title: 'Snap it', body: 'Photo, place, one line. The camera opens straight from the form.' },
  { n: '02', title: 'Watch it', body: 'A reference code, a live status, and every note the team leaves.' },
  { n: '03', title: 'Back it', body: 'Others hit the same problem? It rises up the queue on its own.' },
]

/* --- helpers ---------------------------------------------------------------- */

/** Reveals elements once as they scroll into view. */
function useReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal')
    if (!targets.length) return undefined

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'))
      return undefined
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/** A button that leans a few pixels toward the pointer. */
function Magnet({ as: As = 'button', className = '', children, ...rest }) {
  const ref = useRef(null)

  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * 0.22
    const y = (e.clientY - (r.top + r.height / 2)) * 0.3
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  return (
    <As ref={ref} className={className} onMouseMove={onMove} onMouseLeave={reset} {...rest}>
      {children}
    </As>
  )
}

/* --- the live card ---------------------------------------------------------- */

function LiveCard({ step }) {
  const stage = STAGES[step]
  const progress = ((step + 1) / STAGES.length) * 100

  return (
    <div className="glass card-live">
      <div className="card-top">
        <span className="card-code">#K2HDF6</span>
        <span className="stage-pill" style={{ color: stage.tint, background: `${stage.tint}1a` }}>
          <span className="badge-dot" />
          {stage.label}
        </span>
      </div>

      <div className="card-photo">
        <Icon.Camera width={22} height={22} />
      </div>

      <div>
        <p className="card-title">Overflowing bin outside Block C</p>
        <div className="card-meta" style={{ marginTop: 7 }}>
          <Icon.Pin width={12} height={12} />
          Block C
          <span aria-hidden="true">·</span>
          <Icon.Up width={12} height={12} />
          14
        </div>
      </div>

      <div className="rail">
        <div className="rail-track">
          <div className="rail-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="rail-steps">
          {STAGES.map((s, i) => (
            <span key={s.id} className="rail-step" data-on={i <= step}>{s.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* --- page ------------------------------------------------------------------- */

/** True when the visitor has asked the system for less animation. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Landing() {
  const { theme, moods, setTheme } = useTheme()
  const stageRef = useRef(null)
  const rigRef = useRef(null)
  const frame = useRef(0)
  const [step, setStep] = useState(0)

  useReveal()

  // Advance the demo report along the pipeline, pausing on "Fixed" before
  // looping so the payoff actually registers.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined

    const delay = step === STAGES.length - 1 ? 2600 : 1700
    const timer = setTimeout(() => setStep((s) => (s + 1) % STAGES.length), delay)
    return () => clearTimeout(timer)
  }, [step])

  // One pointer handler drives both the cursor light and the rig's tilt, and
  // writes through rAF so a fast mouse cannot outrun the frame budget.
  const onPointerMove = useCallback((e) => {
    const stage = stageRef.current
    if (!stage) return

    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const r = stage.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height

      stage.style.setProperty('--mx', `${px * 100}%`)
      stage.style.setProperty('--my', `${py * 100}%`)

      // Written straight to the inline transform rather than through custom
      // properties, so no stylesheet rule can override the tilt.
      const rig = rigRef.current
      if (rig && !prefersReducedMotion()) {
        const ry = (px - 0.5) * 16
        const rx = (0.5 - py) * 12
        rig.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`
      }
    })
  }, [])

  const onPointerLeave = useCallback(() => {
    const rig = rigRef.current
    if (rig) rig.style.transform = 'rotateX(0deg) rotateY(0deg)'
  }, [])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <div
      className="stage"
      data-mood={theme}
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <section className="stage-hero">
      <div className="aurora" aria-hidden="true"><span /><span /><span /></div>
      <div className="beams" aria-hidden="true"><span /><span /></div>
      <div className="horizon" aria-hidden="true" />
      <div className="floor" aria-hidden="true"><div className="floor-grid" /></div>
      <div className="stage-vignette" aria-hidden="true" />
      <div className="stage-light" aria-hidden="true" />

      <div className="shell-wide stage-inner">
        <div>
          <span className="stage-badge">
            <span className="live-dot" />
            Live on campus
          </span>

          <h1 className="stage-title">
            Your campus,<br />
            <em>fixed</em>.
          </h1>

          <p className="stage-sub">
            Snap the problem. Follow it from reported to fixed. No group chats,
            no chasing anyone.
          </p>

          <div className="stage-actions">
            <Magnet as={Link} to="/signup" className="magnet magnet-solid">
              Start reporting
            </Magnet>
            <Magnet as={Link} to="/login" className="magnet magnet-glass">
              Try the demo
            </Magnet>
          </div>
        </div>

        <div className="scene">
          <div className="scene-rig" ref={rigRef}>
            <div className="card-ghost g2" aria-hidden="true" />
            <div className="card-ghost g1" aria-hidden="true" />
            <LiveCard step={step} />

            {/* The same card again, mirrored onto the floor. */}
            <div className="reflection" aria-hidden="true">
              <LiveCard step={step} />
            </div>

            {PINS.map((p, i) => (
              <span
                key={i}
                className="pin"
                aria-hidden="true"
                style={{
                  top: p.top,
                  left: p.left,
                  right: p.right,
                  bottom: p.bottom,
                  '--pin': p.color,
                  transform: `translateZ(${p.depth}px)`,
                  animationDelay: p.delay,
                }}
              />
            ))}

            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="chip-3d"
                aria-hidden="true"
                style={{
                  top: c.top,
                  left: c.left,
                  right: c.right,
                  bottom: c.bottom,
                  transform: `translateZ(${c.depth}px)`,
                  animationDelay: c.delay,
                }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span className="scroll-rail" />
        Scroll
      </div>

      <div className="stage-moods" role="group" aria-label="Colour mood">
        {moods.map((m) => (
          <button
            key={m.id}
            className="stage-mood"
            style={{ background: m.swatch }}
            aria-label={m.label}
            aria-pressed={theme === m.id}
            title={m.label}
            onClick={() => setTheme(m.id)}
          />
        ))}
      </div>
      </section>

      {/* --- what's moving right now --- */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-run">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="ticker-item">
              <Icon.Pin width={12} height={12} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* --- three beats, no paragraphs --- */}
      <div className="beats">
        {BEATS.map((b, i) => (
          <div key={b.n} className="beat reveal" style={{ transitionDelay: `${i * 90}ms` }}>
            <span className="beat-num">{b.n}</span>
            <h3>{b.title}</h3>
            <p>{b.body}</p>
          </div>
        ))}
      </div>

      <section className="stage-close reveal">
        <h2>Something broken?</h2>
        <div className="stage-actions">
          <Magnet as={Link} to="/signup" className="magnet magnet-solid">
            Create an account
          </Magnet>
          <Magnet as={Link} to="/product" className="magnet magnet-glass">
            How it works
          </Magnet>
        </div>
      </section>

      <div className="stage-foot">
        <div className="shell-wide between wrap">
          <span>CampusFix</span>
          <Link to="/product" style={{ color: 'inherit' }}>What it does →</Link>
        </div>
      </div>
    </div>
  )
}
