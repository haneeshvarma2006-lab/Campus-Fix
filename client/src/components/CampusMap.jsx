import { STATUS_COLOR_VAR } from '../lib/format'

/**
 * A flat campus plan drawn as inline SVG.
 *
 * Buildings are static shapes on a 100x100 grid; locations arrive from the API
 * with their own x/y, so an admin can add a building without touching this file.
 * No images, no map library, no tiles to fetch — the whole thing is a few KB of
 * markup that scales to any screen.
 */

/** Decorative ground: paths and blocks that read as a site plan. */
function Ground() {
  return (
    <g aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" fill="var(--ground)" />

      {/* green space */}
      <circle cx="24" cy="70" r="13" fill="var(--ground-2)" />
      <rect x="40" y="4" width="34" height="12" rx="4" fill="var(--ground-2)" />

      {/* paths */}
      <g stroke="var(--path)" strokeLinecap="round" fill="none">
        <path d="M50 96 L50 60 L50 30" strokeWidth="5" />
        <path d="M14 36 L50 36" strokeWidth="4" />
        <path d="M50 60 L76 60" strokeWidth="4" />
        <path d="M50 78 L70 78" strokeWidth="3.5" />
        <path d="M26 72 L50 66" strokeWidth="3" />
      </g>

      {/* buildings */}
      <g fill="var(--building)" stroke="var(--building-l)" strokeWidth="0.6">
        <rect x="24" y="38" width="21" height="13" rx="2" />
        <rect x="54" y="31" width="17" height="12" rx="2" />
        <rect x="40" y="16" width="17" height="11" rx="2" />
        <rect x="65" y="55" width="15" height="12" rx="2" />
        <rect x="60" y="72" width="17" height="11" rx="2" />
        <rect x="6"  y="20" width="16" height="11" rx="2" />
        <rect x="6"  y="40" width="16" height="11" rx="2" />
        <rect x="74" y="83" width="15" height="9"  rx="2" />
      </g>

      {/* gate */}
      <g stroke="var(--building-l)" strokeWidth="1.2" strokeLinecap="round">
        <path d="M42 92 L42 97" />
        <path d="M58 92 L58 97" />
      </g>
    </g>
  )
}

/**
 * @param locations  rows from /api/locations, each with x, y, name and counts
 * @param onSelect   called with a location when its pin is tapped
 * @param selected   name of the currently highlighted location
 * @param compact    hides labels, for the small hero version
 */
export function CampusMap({ locations = [], onSelect, selected, compact = false }) {
  return (
    <svg
      className="map-svg"
      viewBox="0 0 100 100"
      role="img"
      aria-label="Campus map showing reported issues by location"
      preserveAspectRatio="xMidYMid meet"
    >
      <Ground />

      {locations.map((l) => {
        const open = Number(l.open_count) || 0
        const isSelected = selected === l.name

        // A location with nothing open reads as settled; anything open takes
        // the colour of the work still outstanding.
        const color = open > 0 ? 'var(--reported)' : 'var(--fixed)'
        const r = open > 0 ? 3.4 : 2.4

        return (
          <g
            key={l.id}
            className="map-pin"
            onClick={onSelect ? () => onSelect(l) : undefined}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(l)
                    }
                  }
                : undefined
            }
            aria-label={`${l.name}: ${open} open ${open === 1 ? 'issue' : 'issues'}`}
          >
            {isSelected && <circle cx={l.x} cy={l.y} r={r + 2.6} fill={color} opacity="0.22" />}

            <circle cx={l.x} cy={l.y} r={r} fill={color} stroke="var(--surface)" strokeWidth="1" />

            {open > 0 && (
              <text
                x={l.x}
                y={l.y + 1.15}
                textAnchor="middle"
                fontSize="3.1"
                fontWeight="700"
                fill="#fff"
                style={{ pointerEvents: 'none' }}
              >
                {open > 9 ? '9+' : open}
              </text>
            )}

            {!compact && (
              <text
                x={l.x}
                y={l.y - r - 1.6}
                textAnchor="middle"
                fontSize="2.9"
                fontWeight="600"
                fill="var(--ink-3)"
                style={{ pointerEvents: 'none' }}
              >
                {l.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function MapLegend() {
  return (
    <div className="map-legend">
      <span className="k">
        <span className="sw" style={{ background: 'var(--reported)' }} />
        Open issues
      </span>
      <span className="k">
        <span className="sw" style={{ background: 'var(--fixed)' }} />
        All clear
      </span>
      <span className="k faint">Tap a pin to see what is happening there</span>
    </div>
  )
}

export { STATUS_COLOR_VAR }
