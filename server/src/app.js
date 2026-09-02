import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { optionalAuth, asyncRoute } from './auth.js'
import { UPLOAD_DIR, usingBlob } from './storage.js'
import { describeDatabase } from './db.js'
import authRoutes from './routes/auth.js'
import reportRoutes from './routes/reports.js'
import categoryRoutes from './routes/categories.js'
import userRoutes from './routes/users.js'
import statsRoutes from './routes/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist')

/**
 * The Express app, with no listener attached — `index.js` serves it locally and
 * `api/index.js` hands it to Vercel as a serverless function.
 */
export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet({
    // Photos may be served from a Blob CDN on a different origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }))
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: false }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  }

  app.use('/api', rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Slow down a moment — too many requests.' },
  }))

  app.use(asyncRoute(optionalAuth))

  // Locally stored photos. Filenames are unique and immutable, so cache hard.
  if (!usingBlob) {
    app.use('/uploads', express.static(UPLOAD_DIR, {
      maxAge: '30d',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }))
    // A photo that no longer exists must 404 rather than falling through to
    // the SPA catch-all below, which would answer an <img> with a page of HTML.
    app.use('/uploads', (_req, res) => res.status(404).json({ error: 'No such file.' }))
  }

  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      database: describeDatabase(),
      storage: usingBlob ? 'Vercel Blob' : 'local disk',
      uptime: process.uptime(),
    })
  )

  app.use('/api/auth', authRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/categories', categoryRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/stats', statsRoutes)

  app.use('/api', (_req, res) => res.status(404).json({ error: 'No such endpoint.' }))

  // Locally, one process serves the built SPA too, so there is one origin and
  // no proxy config to get wrong. On Vercel the static files are served by the
  // CDN and never reach this function.
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST))
    app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')))
  } else {
    app.get('/', (_req, res) =>
      res.type('text/plain').send(
        'CampusFix API is running.\n\n' +
        'In development the frontend is served by Vite: npm run dev, then open http://localhost:5173\n' +
        'For a single-origin build: npm run build && npm start\n'
      )
    )
  }

  // Final error handler — anything thrown in a route lands here as clean JSON.
  app.use((err, _req, res, _next) => {
    console.error(err)
    const status = err.status || 500
    res.status(status).json({
      error: status < 500 ? err.message : 'Something went wrong on our side.',
    })
  })

  return app
}

export default createApp
