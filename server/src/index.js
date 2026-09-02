import 'dotenv/config'
import { createApp } from './app.js'
import { migrate } from './schema.js'
import { describeDatabase } from './db.js'

const PORT = Number(process.env.PORT) || 4000

// Bringing the schema up to date on boot keeps local development a single
// command, and is a no-op once everything already exists.
await migrate()

createApp().listen(PORT, () => {
  console.log(`CampusFix API listening on http://localhost:${PORT}`)
  console.log(`Database: ${describeDatabase()}`)
})
