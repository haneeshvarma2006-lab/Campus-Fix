// Vercel serverless entry point. Vercel routes every /api/* request here and
// Express handles the rest, so the same app runs locally and in production.
import { createApp } from '../server/src/app.js'
import { migrate } from '../server/src/schema.js'
import { setStartupProblem } from '../server/src/health.js'

let ready = null
const app = createApp()

/**
 * Brings the schema up to date once per cold container.
 *
 * A failure here must not throw out of the handler: that kills the whole
 * function and every route with it, including the health endpoint that would
 * have explained the problem. The failure is recorded instead, so requests
 * still reach Express and get a real answer.
 */
function ensureSchema() {
  ready ??= migrate()
    .then(() => setStartupProblem(null))
    .catch((err) => {
      setStartupProblem(`Database is not ready: ${err.message}`)
      // Cleared so the next cold start retries rather than caching the failure.
      ready = null
    })
  return ready
}

export default async function handler(req, res) {
  await ensureSchema()
  return app(req, res)
}
