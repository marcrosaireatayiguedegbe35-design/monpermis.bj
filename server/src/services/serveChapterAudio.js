import { ChapterAudio } from '../models/ChapterAudio.js'
import { logger } from '../utils/logger.js'
import {
  getCachedMedia,
  getMediaMeta,
  MEDIA_CACHE_CONTROL,
  setCachedMedia,
  setMediaMeta,
} from './mediaCache.js'

/**
 * GET/HEAD /content/code-audio/chapitre-{N}/{Q}.mp3 — sert l'audio publié en base,
 * avec ETag et requêtes Range (nécessaires à la lecture audio sur iOS/Safari et mobile).
 */
export async function serveChapterAudio(req, res) {
  try {
    const chapterOrder = Number(req.params.chapter)
    const questionOrder = Number(req.params.question)
    if (!Number.isInteger(chapterOrder) || !Number.isInteger(questionOrder)) {
      return res.status(404).end()
    }

    // 1) Métadonnées seules (léger) : suffit pour répondre 304 sans relire l'audio.
    let meta = getMediaMeta('audio', chapterOrder, questionOrder)
    if (!meta) {
      const row = await ChapterAudio.findOne({ chapterOrder, questionOrder })
        .select('mimeType size updatedAt')
        .lean()
      if (!row) return res.status(404).end()
      meta = { mimeType: row.mimeType, etag: `"${row._id}-${new Date(row.updatedAt).getTime()}"` }
      setMediaMeta('audio', chapterOrder, questionOrder, meta)
    }
    const etag = meta.etag
    res.setHeader('Content-Type', meta.mimeType || 'audio/mpeg')
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', MEDIA_CACHE_CONTROL)
    if (req.headers['if-none-match'] === etag) return res.status(304).end()

    // 2) Données : cache mémoire, sinon lecture en base (puis mise en cache).
    let buffer = getCachedMedia(`audio:${etag}`)
    if (!buffer) {
      const doc = await ChapterAudio.findOne({ chapterOrder, questionOrder }).select('data').lean()
      if (!doc?.data) return res.status(404).end()
      // lean() renvoie un Binary BSON : on récupère le Buffer sous-jacent.
      buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data.buffer)
      setCachedMedia(`audio:${etag}`, buffer)
    }
    const total = buffer.length

    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''))
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : total - Number(range[2])
      let end = range[1] && range[2] ? Number(range[2]) : total - 1
      start = Math.max(0, start)
      end = Math.min(end, total - 1)
      if (start > end || start >= total) {
        res.setHeader('Content-Range', `bytes */${total}`)
        return res.status(416).end()
      }
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`)
      res.setHeader('Content-Length', end - start + 1)
      return req.method === 'HEAD' ? res.end() : res.end(buffer.subarray(start, end + 1))
    }

    res.setHeader('Content-Length', total)
    return req.method === 'HEAD' ? res.end() : res.end(buffer)
  } catch (error) {
    logger.error('Erreur lecture audio chapitre:', error)
    res.status(500).end()
  }
}
