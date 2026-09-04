import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ReportCard } from '../components/ReportCard'
import { CardSkeleton, EmptyState, Icon, NamedIcon, useToast } from '../components/ui'
import { ZONE_ICON } from '../lib/format'

/**
 * Every block on campus, grouped the way people talk about them.
 *
 * This used to be a drawn map. A map has to assume one campus layout, and no
 * two colleges share one — so it was decoration everywhere except the campus it
 * was drawn for. A list of blocks is honest about what it knows, works for any
 * college, and answers the question a student actually has faster: where are
 * the problems right now.
 */

const ZONE_ORDER = ['Academic', 'Hostel', 'Common', 'Administration', 'Campus']

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
  const busiest = Math.max(1, ...locations.map((l) => Number(l.open_count || 0)))

  // Grouped by zone, and within a zone the blocks needing attention come first.
  const zones = useMemo(() => {
    const byZone = new Map()
    for (const l of locations) {
      if (!byZone.has(l.zone)) byZone.set(l.zone, [])
      byZone.get(l.zone).push(l)
    }
    for (const list of byZone.values()) {
      list.sort((a, b) => Number(b.open_count || 0) - Number(a.open_count || 0))
    }
    return [...byZone.entries()].sort(
      (a, b) => (ZONE_ORDER.indexOf(a[0]) + 99) % 99 - (ZONE_ORDER.indexOf(b[0]) + 99) % 99
    )
  }, [locations])

  if (selected) {
    return (
      <div className="wrap page">
        <button className="btn btn-quiet btn-sm" onClick={() => setSelected(null)} style={{ marginLeft: -10 }}>
          <Icon.Back /> All blocks
        </button>

        <div className="page-head" style={{ marginTop: 12 }}>
          <h1 className="t-h1">{selected.name}</h1>
          <p className="muted t-sm" style={{ marginTop: 4 }}>
            {selected.zone} &middot;{' '}
            {selected.open_count} open &middot; {selected.fixed_count} fixed
          </p>
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
            {reports.map((r, i) => (
              <div key={r.id} className="rise" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                <ReportCard report={r} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="wrap page">
      <div className="page-head">
        <h1 className="t-h1">Campus</h1>
        <p className="muted t-sm" style={{ marginTop: 4 }}>
          {loading
            ? 'Loading blocks…'
            : totalOpen === 0
              ? `All clear across ${locations.length} blocks.`
              : `${totalOpen} open ${totalOpen === 1 ? 'issue' : 'issues'} across ${locations.length} blocks.`}
        </p>
      </div>

      {loading && (
        <div className="col g-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skel" style={{ height: 58, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {!loading && zones.map(([zone, list]) => (
        <section key={zone} className="col g-2" style={{ marginBottom: 22 }}>
          <span className="overline zone-head">
            <NamedIcon name={ZONE_ICON[zone]} fallback="MapPin" width={14} height={14} />
            {zone}
          </span>

          <div className="place-list">
            {list.map((l, i) => {
              const open = Number(l.open_count || 0)
              return (
                <button
                  key={l.id}
                  className={`place ${open > 0 ? 'has-open' : ''} rise`}
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                  onClick={() => setSelected(l)}
                >
                  <span className="grow" style={{ textAlign: 'left', minWidth: 0 }}>
                    <span className="place-name truncate">{l.name}</span>
                    {/* A bar rather than a second number: the comparison between
                        blocks is the point, and the eye reads length faster. */}
                    <span className="place-bar" aria-hidden="true">
                      <span style={{ width: `${(open / busiest) * 100}%` }} />
                    </span>
                  </span>

                  {open > 0 ? (
                    <span className="badge s-reported"><span className="dot" />{open} open</span>
                  ) : (
                    <span className="badge s-fixed"><span className="dot" />Clear</span>
                  )}
                  <Icon.Next width={16} height={16} />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {!loading && locations.length === 0 && (
        <EmptyState
          title="No blocks set up yet"
          message="An admin adds the blocks for your college under Manage."
        />
      )}
    </div>
  )
}
