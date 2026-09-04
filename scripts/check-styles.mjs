/**
 * Catch class names the JSX asks for that the stylesheet has never heard of.
 *
 * A missing rule is silent: the element renders, it just renders unstyled, and
 * nothing in the build or the browser console says so. That is how three
 * separate cases survived a rebuild — selected filter chips that looked
 * unselected, timeline dots with no colour, and skeletons that were invisible.
 *
 * Run with `npm run check:styles`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const stylesheet = join(root, 'client/src/styles/index.css')
const source = join(root, 'client/src')

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const css = readFileSync(stylesheet, 'utf8')
const defined = new Set([...css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]))

/**
 * `className={`badge s-${status}`}` leaves the fragment `s-` once the
 * interpolation is stripped. That is a prefix, not a class, so it counts as
 * satisfied when the stylesheet defines anything beginning with it.
 */
const satisfied = (name) =>
  name.endsWith('-') ? [...defined].some((d) => d.startsWith(name)) : defined.has(name)

const used = new Map()
for (const file of walk(source).filter((f) => f.endsWith('.jsx'))) {
  const jsx = readFileSync(file, 'utf8')
  for (const match of jsx.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const literal = (match[1] ?? match[2]).replace(/\$\{[^}]*\}/g, ' ')
    for (const name of literal.split(/\s+/).filter(Boolean)) {
      if (!used.has(name)) used.set(name, new Set())
      used.get(name).add(file.slice(root.length + 1))
    }
  }
}

const missing = [...used].filter(([name]) => !satisfied(name))

/**
 * `.wrap` is the page container — a max width, centred, with side padding.
 * `.wrap-x` is the flex-wrap utility. Writing `className="row wrap"` when you
 * meant `wrap-x` passes every check above, because both classes exist; the row
 * simply never wraps, overflows, and drags the whole page sideways with it.
 * That mistake was in eight places across five files before anyone noticed.
 */
const FLEX_ROWS = ['row', 'row-top', 'between']

// Report the container/utility confusion separately: both classes exist, so it
// is not a missing rule, but it is always a bug.
const suspect = []
for (const file of walk(source).filter((f) => f.endsWith('.jsx'))) {
  const jsx = readFileSync(file, 'utf8')
  for (const match of jsx.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const literal = (match[1] ?? match[2]).replace(/\$\{[^}]*\}/g, ' ')
    const names = literal.split(/\s+/).filter(Boolean)
    // `wrap` alongside an explicit `wrap-x` is a deliberate container-that-wraps,
    // like the footer. Only the ambiguous case is worth reporting.
    if (names.includes('wrap') && !names.includes('wrap-x') && names.some((n) => FLEX_ROWS.includes(n))) {
      suspect.push(`${file.slice(root.length + 1)}  —  className="${literal.trim()}"`)
    }
  }
}

if (suspect.length > 0) {
  console.error(`${suspect.length} use(s) of .wrap inside a flex row - did you mean .wrap-x?`)
  console.error('')
  for (const line of suspect) console.error(`  ${line}`)
  console.error('')
  console.error('.wrap is the page container. .wrap-x is flex-wrap.')
  process.exit(1)
}

if (missing.length === 0) {
  console.log(`All ${used.size} class names used in JSX are defined in the stylesheet.`)
  process.exit(0)
}

console.error(`${missing.length} class name(s) used in JSX but never defined:\n`)
for (const [name, files] of missing) console.error(`  .${name}\n      ${[...files].join('\n      ')}`)
console.error('\nEither add the rule, or use the name the stylesheet already defines.')
process.exit(1)
