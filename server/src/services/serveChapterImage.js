import { ChapterImage } from '../models/ChapterImage.js'
import { logger } from '../utils/logger.js'
import {
  getCachedMedia,
  getMediaMeta,
  MEDIA_CACHE_CONTROL,
  setCachedMedia,
  setMediaMeta,
} from './mediaCache.js'

/** GET/HEAD /content/code-images/chapitre-{N}/{I}.png — sert l'image publiée en base (ETag + 304). */
export async function serveChapterImage(req, res) {
  try {
    const chapterOrder = Number(req.params.chapter)
    const imageIndex = Number(req.params.image)
    if (!Number.isInteger(chapterOrder) || !Number.isInteger(imageIndex)) return res.status(404).end()

    let meta = getMediaMeta('image', chapterOrder, imageIndex)
    if (!meta) {
      const row = await ChapterImage.findOne({ chapterOrder, imageIndex })
        .select('mimeType size updatedAt')
        .lean()
      if (!row) return res.status(404).end()
      meta = { mimeType: row.mimeType, etag: `"${row._id}-${new Date(row.updatedAt).getTime()}"` }
      setMediaMeta('image', chapterOrder, imageIndex, meta)
    }
    const etag = meta.etag
    res.setHeader('Content-Type', meta.mimeType || 'image/png')
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', MEDIA_CACHE_CONTROL)
    if (req.headers['if-none-match'] === etag) return res.status(304).end()

    let buffer = getCachedMedia(`image:${etag}`)
    if (!buffer) {
      const doc = await ChapterImage.findOne({ chapterOrder, imageIndex }).select('data').lean()
      if (!doc?.data) return res.status(404).end()
      buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data.buffer)
      setCachedMedia(`image:${etag}`, buffer)
    }
    res.setHeader('Content-Length', buffer.length)
    return req.method === 'HEAD' ? res.end() : res.end(buffer)
  } catch (error) {
    logger.error('Erreur lecture image chapitre:', error)
    res.status(500).end()
  }
}
