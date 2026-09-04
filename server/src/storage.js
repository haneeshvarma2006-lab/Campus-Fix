import crypto from 'node:crypto'
import path from 'node:path'
import multer from 'multer'

/**
 * Photo storage.
 *
 * One path: Vercel Blob. There is no local-disk fallback, because writing
 * uploads next to the source produced files that existed on one machine and
 * nowhere else — and on a serverless platform, where everything outside /tmp is
 * read-only and every container is thrown away, they did not survive at all.
 */

/*
 * Two ways to reach a Blob store, and the newer one carries no token.
 *
 * A store created today connects to its project over OIDC: Vercel hands the
 * function a short-lived VERCEL_OIDC_TOKEN and the store's BLOB_STORE_ID, and
 * no long-lived secret is stored anywhere. @vercel/blob picks that up on its
 * own. Older stores inject a static BLOB_READ_WRITE_TOKEN instead.
 *
 * Checking only for the static token declared photo uploads unavailable on a
 * store that worked perfectly well — the app hid its own working feature.
 */
export const usingBlob = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
)

/** Whether a photo can be stored. The client asks so it can hide the photo
    step rather than offer something that cannot work. */
export const photoStorageAvailable = usingBlob

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
const EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
}

// Held in memory: Blob wants the buffer, and an 8 MB cap briefly in memory is
// cheaper than writing a file that may have to be deleted again.
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

  if (!usingBlob) {
    throw Object.assign(
      new Error('Photo uploads are not configured. Connect a Blob store to this project.'),
      { status: 503 }
    )
  }

  const { put } = await import('@vercel/blob')
  const blob = await put(`reports/${filenameFor(file)}`, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
  })
  return blob.url
}

/** Deletes a stored photo. Never throws — a failed cleanup must not fail a request. */
export async function deletePhoto(photoUrl) {
  if (!photoUrl || !usingBlob || !photoUrl.startsWith('http')) return

  try {
    const { del } = await import('@vercel/blob')
    await del(photoUrl)
  } catch (err) {
    console.error('Could not delete photo:', err.message)
  }
}
