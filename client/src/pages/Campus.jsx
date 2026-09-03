import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { CampusMap, MapLegend } from '../components/CampusMap'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, Icon, useToast } from '../components/ui'
import { ZONE_EMOJI } from '../lib/format'

/**
 * The campus at a glance: every location with its open count, and the reports
 * behind whichever one you tap. One request for the map, one for the reports
 * of the selected place — nothing loads until it is needed.
 */
export function Campus() {
  const { error: toastError } = useToast()

  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)

  useEffect(() => {
    const c = new AbortController()
    api.listLocations(c.signal)
      .then((d) => setLocations(d.locations))
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoading(false))
    return () => c.abort()
  }, [toastError])

  useEffect(() => {
    if (!selected) return undefined
    const c = new AbortController()
    setLoadingReports(true)
    api.listReports({ location: selected.name, status: 'active', limit: 20 }, c.signal)
      .then((d) => setReports(d.reports))
      .catch((err) => { if (err.name !== 'AbortError') toastError(err.message) })
      .finally(() => setLoadingReports(false))
    return () => c.abort()
  }, [selected, toastError])

  const totalOpen = locations.reduce((n, l) => n + Number(l.open_count || 0), 0)

  return (
    <div className="wrap page">
      <div className="page-head">
        <h1 className="t-h1">Campus</h1>
        <p className="muted t-sm" style={{ marginTop: 4 }}>
          {loading
            ? 'Loading the map…'
            : `${totalOpen} open ${totalOpen === 1 ? 'issue' : 'issues'} across ${locations.length} places.`}
        </p>
      </div>

      {loading ? (
        <div className="skel" style={{ aspectRatio: '1 / 1', maxHeight: 460, borderRadius: 18 }} />
      ) : (
        <div className="map-frame">
          <CampusMap
            locations={locations}
            selected={selected?.name}
            onSelect={(l) => setSelected((cur) => (cur?.name === l.name ? null : l))}
          />
          <MapLegend />
        </div>
      )}

      {/* Tapping a pin opens what is happening there. */}
      {selected && (
        <div className="col g-3 in" style={{ marginTop: 20 }}>
          <div className="between">
            <div>
              <h2 className="t-h2">
                {ZONE_EMOJI[selected.zone] || '📍'} {selected.name}
              </h2>
              <p className="muted t-sm">
                {selected.open_count} open &middot; {selected.fixed_count} fixed
              </p>
            </div>
            <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close">
              <Icon.Back />
            </button>
          </div>

          {loadingReports && <CardSkeleton count={2} />}

          {!loadingReports && reports.length === 0 && (
            <EmptyState
              icon={Icon.Check}
              title="All clear here"
              message={`Nothing open at ${selected.name} right now.`}
              action={<Link to="/submit" className="btn btn-ghost btn-sm">Report something</Link>}
            />
          )}

          {!loadingReports && reports.length > 0 && (
            <div className="reports">
              {reports.map((r) => <ReportCard key={r.id} report={r} />)}
            </div>
          )}
        </div>
      )}

      {!selected && !loading && (
        <div className="col g-3" style={{ marginTop: 20 }}>
          <h2 className="t-h2">Places</h2>
          <div className="place-list">
            {locations.map((l) => (
              <button key={l.id} className="place" onClick={() => setSelected(l)}>
                <span style={{ fontSize: 18 }}>{ZONE_EMOJI[l.zone] || '📍'}</span>
                <span className="grow truncate" style={{ textAlign: 'left', fontWeight: 600 }}>{l.name}</span>
                {Number(l.open_count) > 0 ? (
                  <span className="badge s-reported"><span className="dot" />{l.open_count}</span>
                ) : (
                  <span className="badge s-fixed"><span className="dot" />Clear</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
