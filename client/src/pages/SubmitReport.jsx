import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { categoryMeta, ZONE_EMOJI } from '../lib/format'
import { useToast, Icon, Spinner } from '../components/ui'

/**
 * Reporting, as four short questions instead of one long form.
 *
 * Each step asks a single thing and most are answered with one tap, so the
 * whole flow is thumb-work on a phone. Nothing is submitted until the last
 * step, and the answers survive going back.
 */

const STEPS = ['What', 'Where', 'Details', 'Photo']

export function SubmitReport() {
  const navigate = useNavigate()
  const { notify, error: toastError } = useToast()
  const fileRef = useRef(null)

  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const c = new AbortController()
    Promise.all([
      api.listCategories(c.signal).then((d) => d.categories),
      api.listLocations(c.signal).then((d) => d.locations),
    ])
      .then(([cats, locs]) => {
        setCategories(cats.length ? cats : [{ id: 0, name: 'Other' }])
        setLocations(locs)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') toastError('Could not load the options. Pull down to retry.')
      })
      .finally(() => setLoadingOptions(false))
    return () => c.abort()
  }, [toastError])

  // Object URLs hold a reference to the file until released.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const attach = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toastError('That file is not an image.')
    if (file.size > 8 * 1024 * 1024) return toastError('That photo is over the 8 MB limit.')
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const go = (next) => {
    setError('')
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const submit = async () => {
    setError('')
    if (title.trim().length < 5) {
      setError('Give it a short title — at least 5 characters.')
      return go(2)
    }
    if (description.trim().length < 10) {
      setError('Add a little more detail — at least 10 characters.')
      return go(2)
    }

    setBusy(true)
    try {
      const form = new FormData()
      form.append('title', title.trim())
      form.append('description', description.trim())
      form.append('category', category || 'Other')
      form.append('location', location)
      form.append('priority', urgent ? 'urgent' : 'normal')
      if (photo) form.append('photo', photo)

      const { report } = await api.createReport(form)
      notify(`Reported. Your reference is #${report.code}.`)
      navigate(`/reports/${report.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const zones = [...new Set(locations.map((l) => l.zone))]

  return (
    <div className="wrap-s page">
      <div className="between" style={{ marginBottom: 14 }}>
        <button
          className="btn btn-quiet btn-sm"
          onClick={() => (step === 0 ? navigate(-1) : go(step - 1))}
          style={{ marginLeft: -10 }}
        >
          <Icon.Back /> {step === 0 ? 'Back' : STEPS[step - 1]}
        </button>
        <span className="t-xs faint">Step {step + 1} of {STEPS.length}</span>
      </div>

      <div className="steps" aria-hidden="true">
        {STEPS.map((label, i) => (
          <div key={label} className={`step-bar ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`}>
            <span />
          </div>
        ))}
      </div>

      {/* --- 1. what is wrong --- */}
      {step === 0 && (
        <div className="col g-4 in">
          <div>
            <h1 className="t-h1">What&rsquo;s wrong?</h1>
            <p className="muted t-sm" style={{ marginTop: 4 }}>Pick the closest match.</p>
          </div>

          {loadingOptions ? (
            <div className="choices">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skel" style={{ height: 92, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <div className="choices">
              {categories.map((c) => {
                const meta = categoryMeta(c.name)
                return (
                  <button
                    key={c.id || c.name}
                    className={`choice ${category === c.name ? 'on' : ''}`}
                    onClick={() => { setCategory(c.name); go(1) }}
                  >
                    <span className="choice-emoji">{meta.emoji}</span>
                    {meta.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* --- 2. where --- */}
      {step === 1 && (
        <div className="col g-4 in">
          <div>
            <h1 className="t-h1">Where is it?</h1>
            <p className="muted t-sm" style={{ marginTop: 4 }}>
              {categoryMeta(category).emoji} {categoryMeta(category).label} &middot; pick the place.
            </p>
          </div>

          {zones.map((zone) => (
            <div key={zone} className="col g-2">
              <span className="overline">{ZONE_EMOJI[zone] || '📍'} {zone}</span>
              <div className="choices choices-wide">
                {locations.filter((l) => l.zone === zone).map((l) => (
                  <button
                    key={l.id}
                    className={`choice ${location === l.name ? 'on' : ''}`}
                    onClick={() => { setLocation(l.name); go(2) }}
                  >
                    <Icon.Pin width={16} height={16} />
                    <span className="grow truncate" style={{ textAlign: 'left' }}>{l.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {locations.length === 0 && !loadingOptions && (
            <p className="muted t-sm">No locations set up yet. Ask an admin to add them.</p>
          )}
        </div>
      )}

      {/* --- 3. details --- */}
      {step === 2 && (
        <div className="col g-4 in">
          <div>
            <h1 className="t-h1">What happened?</h1>
            <p className="muted t-sm" style={{ marginTop: 4 }}>
              {categoryMeta(category).emoji} {categoryMeta(category).label} &middot; 📍 {location}
            </p>
          </div>

          <div className="field">
            <label htmlFor="title">Short title</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fan not working in room 204"
              maxLength={140}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="desc">A bit more detail</label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where exactly, and what is happening?"
              maxLength={4000}
            />
            <div className="between">
              <span className="hint">The clearer it is, the faster it gets sorted.</span>
              <span className="count">{description.length}</span>
            </div>
          </div>

          <button
            className={`card row ${urgent ? 'urgent-on' : ''}`}
            onClick={() => setUrgent((u) => !u)}
            style={{ textAlign: 'left', gap: 12 }}
          >
            <span style={{ fontSize: 22 }}>⚠️</span>
            <span className="grow">
              <span className="t-h3" style={{ display: 'block' }}>Is this urgent?</span>
              <span className="t-xs muted">Safety risk, no water, or nobody can use the room.</span>
            </span>
            <span className={`toggle ${urgent ? 'on' : ''}`} aria-hidden="true"><span /></span>
          </button>

          {error && <div className="form-err"><Icon.Alert width={16} height={16} />{error}</div>}

          <button
            className="btn btn-lg btn-block"
            disabled={title.trim().length < 5 || description.trim().length < 10}
            onClick={() => go(3)}
          >
            Continue <Icon.Next />
          </button>
        </div>
      )}

      {/* --- 4. photo + submit --- */}
      {step === 3 && (
        <div className="col g-4 in">
          <div>
            <h1 className="t-h1">Add a photo?</h1>
            <p className="muted t-sm" style={{ marginTop: 4 }}>Optional, but it helps a lot.</p>
          </div>

          {preview ? (
            <div className="col g-2">
              <img src={preview} alt="The photo you attached" className="photo-preview" />
              <button className="btn btn-ghost btn-sm" onClick={clearPhoto}>
                <Icon.Trash /> Remove photo
              </button>
            </div>
          ) : (
            <button className="dropzone" onClick={() => fileRef.current?.click()}>
              <Icon.Camera width={26} height={26} />
              <span className="t-h3" style={{ marginTop: 8, display: 'block' }}>Take a photo</span>
              <span className="t-xs muted">or choose one from your gallery</span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => attach(e.target.files?.[0])}
            style={{ display: 'none' }}
          />

          <div className="panel col g-2">
            <span className="overline">Summary</span>
            <div className="kv"><dt>Problem</dt><dd>{categoryMeta(category).emoji} {categoryMeta(category).label}</dd></div>
            <div className="kv"><dt>Where</dt><dd>{location}</dd></div>
            <div className="kv"><dt>Title</dt><dd style={{ textAlign: 'right' }}>{title}</dd></div>
            {urgent && <div className="kv"><dt>Priority</dt><dd style={{ color: 'var(--danger)' }}>Urgent</dd></div>}
          </div>

          {error && <div className="form-err"><Icon.Alert width={16} height={16} />{error}</div>}

          <button className="btn btn-lg btn-block" onClick={submit} disabled={busy}>
            {busy ? <><Spinner /> Sending…</> : <>Submit report <Icon.Check /></>}
          </button>

          <button className="btn btn-quiet btn-block" onClick={submit} disabled={busy}>
            Skip photo and submit
          </button>
        </div>
      )}
    </div>
  )
}
