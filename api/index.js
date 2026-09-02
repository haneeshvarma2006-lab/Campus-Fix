// Vercel serverless entry point. Vercel routes every /api/* request here and
// Express handles the rest, so the same app runs locally and in production.
import { createApp } from '../server/src/app.js'
import { migrate } from '../server/src/schema.js'

let ready = null
const app = createApp()

export default async function handler(req, res) {
  // Runs once per cold container; the migration itself is idempotent.
  ready ??= migrate().catch((err) => {
    ready = null
    throw err
  })
  await ready
  return app(req, res)
}
