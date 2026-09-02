import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { PRIORITIES, PRIORITY_LABEL } from '../lib/format'
import { useToast, Icon, Spinner } from '../components/ui'

const STEPS = ['What is wrong', 'Where it is', 'Proof']

export function SubmitReport() {
  const navigate = useNavigate()
  const { notify, error: toastError } = useToast()
  const fileRef = useRef(null)

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', category: '', location: '', priority: 'normal',
  })
  const [coords, setCoords] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [locating, setLocating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    api.listCategories(controller.signal)
      .then((data) => {
        const list = data.categories.length ? data.categories : [{ id: 0, name: 'General' }]
        setCategories(list)
        setForm((f) => ({ ...f, category: f.category || list[0].name }))
      })
      .catch(() => {
        setCategories([{ id: 0, name: 'General' }])
        setForm((f) => ({ ...f, category: f.category || 'General' }))
      })
    return () => controller.abort()
  }, [])

  // Object URLs have to be released or the blob stays alive for the session.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const attach = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toastError('That file is not an image.')
    if (file.size > 8 * 1024 * 1024) return toastError('That photo is larger than the 8 MB limit.')
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

  const useMyLocation = () => {
    if (!navigator.geolocation) return toastError('This browser cannot share a location.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ latitude, longitude })
        setForm((f) => ({
          ...f,
          location: f.location || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        }))
        setLocating(false)
        notify('Location captured.')
      },
      () => {
        setLocating(false)
        toastError('Could not get your location. Type it in instead.')
      },
      { timeout: 9000, enableHighAccuracy: true }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.title.trim().length < 5) return setError('Give the report a title of at least 5 characters.')
    if (form.description.trim().length < 10) return setError('Describe the issue in at least 10 characters.')

    setBusy(true)
    try {
      const data = new FormData()
      data.append('title', form.title.trim())
      data.append('description', form.description.trim())
      data.append('category', form.category || 'General')
      data.append('location', form.location.trim())
      data.append('priority', form.priority)
      if (coords) {
        data.append('latitude', coords.latitude)
        data.append('longitude', coords.longitude)
      }
      if (photo) data.append('photo', photo)

      const { report } = await api.createReport(data)
      notify(`Report #${report.code} submitted.`)
      navigate(`/reports/${report.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell page-tight fade-in">
      <Link to="/dashboard" className="btn btn-quiet btn-sm" style={{ marginBottom: 16, marginLeft: -11 }}>
        <Icon.Back /> Dashboard
      </Link>

      <div className="page-head">
        <h1 className="display" style={{ fontSize: 'clamp(30px, 4vw, 40px)' }}>Report an issue</h1>
        <p className="lede">A clear title, a photo, and a location get things fixed faster.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="stack g-6">
        <section className="stack g-4">
          <span className="overline">1 · {STEPS[0]}</span>

          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title" type="text" required maxLength={140} autoFocus
              value={form.title} onChange={set('title')}
              placeholder="e.g. Overflowing bin outside Block C"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" value={form.category} onChange={set('category')}>
                {categories.map((c) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="priority">How urgent</label>
              <select id="priority" value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description" required maxLength={4000}
              value={form.description} onChange={set('description')}
              placeholder="What is wrong, and where exactly? Anything the team should know before they arrive?"
            />
            <div className="between">
              <span className="field-hint">The more specific, the less back-and-forth.</span>
              <span className="char-count">{form.description.length}/4000</span>
            </div>
          </div>
        </section>

        <section className="stack g-4">
          <span className="overline">2 · {STEPS[1]}</span>

          <div className="field">
            <label htmlFor="location">Location</label>
            <div className="row" style={{ gap: 8, alignItems: 'stretch' }}>
              <input
                id="location" type="text" maxLength={200}
                value={form.location} onChange={set('location')}
                placeholder="Building, block, or landmark"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation} disabled={locating}>
                {locating ? <Spinner /> : <Icon.Pin />}
                {locating ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            {coords ? (
              <span className="field-hint mono">
                Pinned at {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </span>
            ) : (
              <span className="field-hint">Naming the building helps more than exact coordinates.</span>
            )}
          </div>
        </section>

        <section className="stack g-4">
          <span className="overline">3 · {STEPS[2]}</span>

          <div className="field">
            <label>Photo <span className="faint" style={{ fontWeight: 400 }}>· optional, but it helps a lot</span></label>

            {preview ? (
              <div className="stack g-2">
                <img src={preview} alt="Preview of the photo you attached" className="photo-preview" />
                <div className="row">
                  <span className="tiny faint">{photo?.name} · {(photo.size / 1024 / 1024).toFixed(1)} MB</span>
                  <span className="spacer" />
                  <button type="button" className="btn btn-quiet btn-sm" onClick={clearPhoto}>Remove</button>
                </div>
              </div>
            ) : (
              <div
                className={`dropzone ${dragging ? 'dragging' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); attach(e.dataTransfer.files?.[0]) }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
              >
                <Icon.Camera width={22} height={22} style={{ margin: '0 auto' }} />
                <p className="small" style={{ marginTop: 10, fontWeight: 550 }}>Take a photo or drop one here</p>
                <p className="tiny faint" style={{ marginTop: 3 }}>JPG, PNG, WebP or GIF · up to 8 MB</p>
              </div>
            )}

            <input
              ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={(e) => attach(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
          </div>
        </section>

        {error && (
          <div className="form-error">
            <Icon.Alert width={15} height={15} style={{ marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="btn btn-clay btn-block btn-lg" disabled={busy}>
          {busy ? <><Spinner /> Submitting…</> : 'Submit report'}
        </button>

        <p className="tiny faint" style={{ textAlign: 'center', marginTop: -12 }}>
          You will get a reference code you can use to follow it.
        </p>
      </form>
    </div>
  )
}
