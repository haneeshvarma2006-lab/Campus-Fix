import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT = path.resolve(__dirname, '..')
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads')

/**
 * Photos go to Vercel Blob when a token is present (the serverless filesystem
 * is read-only and disposable), and to a local directory otherwise so local
 * development needs no cloud account.
 */
export const usingBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

if (!usingBlob) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
}

// Memory storage either way: Blob needs the buffer, and holding an 8 MB cap in
// memory briefly is cheaper than writing a file we may have to delete again.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(Object.assign(new Error('Only image files can be attached.'), { status: 400 }))
    }
    cb(null, true)
  },
}).single('photo')

/** Wraps multer so its errors come back as clean JSON rather than a 500. */
export function photoUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'That photo is larger than the 8 MB limit.' })
    }
    return res.status(err.status || 400).json({ error: err.message || 'That photo could not be uploaded.' })
  })
}

function filenameFor(file) {
  const ext = EXT[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.jpg'
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
}

/**
 * Persists an uploaded photo and returns the URL to store on the report.
 * Returns null when no file was attached.
 */
export async function savePhoto(file) {
  if (!file) return null
  const name = filenameFor(file)

  if (usingBlob) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`reports/${name}`, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    })
    return blob.url
  }

  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer)
  return `/uploads/${name}`
}

/** Deletes a stored photo. Never throws — a failed cleanup must not fail a request. */
export async function deletePhoto(photoUrl) {
  if (!photoUrl) return

  try {
    if (photoUrl.startsWith('http')) {
      if (!usingBlob) return
      const { del } = await import('@vercel/blob')
      await del(photoUrl)
      return
    }

    if (!photoUrl.startsWith('/uploads/')) return
    const target = path.join(UPLOAD_DIR, path.basename(photoUrl))
    // Guard against a crafted photo_url escaping the upload directory.
    if (path.dirname(target) !== path.resolve(UPLOAD_DIR)) return
    await fs.promises.rm(target, { force: true })
  } catch (err) {
    console.error('Could not delete photo:', err.message)
  }
}
