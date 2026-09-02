import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { UPLOAD_DIR } from './db.js'
import { optionalAuth } from './auth.js'
import authRoutes from './routes/auth.js'
import reportRoutes from './routes/reports.js'
import categoryRoutes from './routes/categories.js'
import userRoutes from './routes/users.js'
import statsRoutes from './routes/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 4000
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist')

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)

app.use(helmet({
  // The API and the SPA are same-origin in production; images are served from
  // /uploads, so allow those to be embedded cross-origin during dev.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}))
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: false }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down a moment — too many requests.' },
}))

app.use(optionalAuth)

// Uploaded photos. Immutable filenames, so they can cache hard.
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '30d',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}))

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }))
app.use('/api/auth', authRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/users', userRoutes)
app.use('/api/stats', statsRoutes)

app.use('/api', (_req, res) => res.status(404).json({ error: 'No such endpoint.' }))

// In production the same process serves the built SPA, so there is one origin
// and no CORS or proxy config to get wrong.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST))
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')))
} else {
  app.get('/', (_req, res) =>
    res.type('text/plain').send(
      'CampusFix API is running.\n\n' +
      'The frontend is served by Vite in development: npm run dev, then open http://localhost:5173\n' +
      'For a single-origin production build: npm run build && npm start\n'
    )
  )
}

// Final error handler — anything thrown in a route lands here as clean JSON.
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Something went wrong on our side.' })
})

app.listen(PORT, () => {
  console.log(`CampusFix API listening on http://localhost:${PORT}`)
})
