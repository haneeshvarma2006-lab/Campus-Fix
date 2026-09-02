import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'campusfix.theme'

/**
 * Three moods rather than a light/dark switch. Each one is a complete palette —
 * the sky behind the hero and the interface colours move together, so the whole
 * product changes character rather than just inverting.
 */
export const MOODS = [
  { id: 'day',   label: 'Day',   swatch: '#8FB3E8', dark: false },
  { id: 'dusk',  label: 'Dusk',  swatch: '#E4C9B4', dark: false },
  { id: 'night', label: 'Night', swatch: '#1B2440', dark: true },
]

const IDS = MOODS.map((m) => m.id)

function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (IDS.includes(saved)) return saved
  } catch { /* storage blocked — fall through to the system preference */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const value = useMemo(() => ({
    theme,
    moods: MOODS,
    isDark: MOODS.find((m) => m.id === theme)?.dark ?? false,
    setTheme: (id) => IDS.includes(id) && setTheme(id),
    // Cycles through the moods, for the compact control in the app header.
    cycle: () => setTheme((t) => IDS[(IDS.indexOf(t) + 1) % IDS.length]),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
