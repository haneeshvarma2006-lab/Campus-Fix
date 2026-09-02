import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'
import { UPLOAD_DIR } from './db.js'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic' }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = EXT[file.mimetype] || path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

export const uploadPhoto = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(Object.assign(new Error('Only image files can be attached.'), { status: 400 }))
    }
    cb(null, true)
  },
}).single('photo')

/** Wraps multer so its errors come back as clean JSON instead of a 500. */
export function photoUpload(req, res, next) {
  uploadPhoto(req, res, (err) => {
    if (!err) return next()
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'That photo is larger than the 8 MB limit.' })
    }
    return res.status(err.status || 400).json({ error: err.message || 'That photo could not be uploaded.' })
  })
}

/** Deletes a stored upload given the public /uploads/... path. Never throws. */
export function removeUpload(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/')) return
  const name = path.basename(photoUrl)
  const target = path.join(UPLOAD_DIR, name)
  if (path.dirname(target) !== path.resolve(UPLOAD_DIR)) return
  fs.rm(target, { force: true }, () => {})
}
