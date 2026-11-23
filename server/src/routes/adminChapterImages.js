import { Router } from 'express'
import multer from 'multer'
import { Chapter } from '../models/Chapter.js'
import { ChapterImage } from '../models/ChapterImage.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { logger } from '../utils/logger.js'
import { getHardcodedQuestionsForChapter } from '../services/hardcodedQuestions.js'
import { markPublishedImage, unmarkPublishedImage } from '../services/publishedImages.js'

/**
 * Publication des images de questions par chapitre (stockées en MongoDB). Montée sur /api/admin/revision :
 *   GET    /chapters/:chapterId/images
 *   POST   /chapters/:chapterId/images/bulk     (champ « files », noms 3.png, 12.png…)
 *   DELETE /chapters/:chapterId/images/:imageIndex
 */
const router = Router()
router.use(requireAdminAuth)

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_BULK_FILES = 60
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_BULK_FILES },
})

/** Type réel d'après les octets (jamais d'après le nom ou l'en-tête client). */
function detectImageMime(b) {
  if (!b || b.length < 12) return null
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

async function loadChapter(chapterId) {
  if (!/^[a-f\d]{24}$/i.test(String(chapterId))) return null
  const chapter = await Chapter.findById(chapterId)
  return chapter && Number.isFinite(Number(chapter.order)) ? chapter : null
}

function parseIndex(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : null
}

function runUpload(handler) {
  return (req, res, next) =>
    handler(req, res, (error) => {
      if (!error) return next()
      const tooBig = error.code === 'LIMIT_FILE_SIZE'
      res.status(tooBig ? 413 : 400).json({
        success: false,
        error: tooBig ? 'Image trop volumineuse (8 Mo maximum)' : 'Envoi invalide',
      })
    })
}

router.get('/chapters/:chapterId/images', async (req, res) => {
  try {
    const chapter = await loadChapter(req.params.chapterId)
    if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })

    const rows = await ChapterImage.find(
      { chapterOrder: chapter.order },
      { imageIndex: 1, size: 1, filename: 1, updatedAt: 1 },
    )
      .sort({ imageIndex: 1 })
      .lean()
    const byIndex = new Map(rows.map((row) => [row.imageIndex, row]))

    // Images attendues = celles que référencent les questions du chapitre.
    const expected = new Set()
    for (const q of getHardcodedQuestionsForChapter(chapter) || []) {
      for (const url of q.prompt?.imageUrls || []) {
        const m = new RegExp(`code-images/chapitre-${chapter.order}/(\\d+)\\.`, 'i').exec(String(url))
        if (m) expected.add(Number(m[1]))
      }
    }
    const indexes = [...new Set([...expected, ...byIndex.keys()])].sort((a, b) => a - b)

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name, order: chapter.order },
        publishedCount: rows.length,
        expectedCount: expected.size,
        images: indexes.map((imageIndex) => {
          const row = byIndex.get(imageIndex)
          return {
            imageIndex,
            published: Boolean(row),
            expected: expected.has(imageIndex),
            size: row?.size || 0,
            filename: row?.filename || '',
            updatedAt: row?.updatedAt || null,
            url: row ? `/content/code-images/chapitre-${chapter.order}/${imageIndex}.png` : '',
          }
        }),
      },
    })
  } catch (error) {
    logger.error('Erreur liste images chapitre:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post(
  '/chapters/:chapterId/images/bulk',
  runUpload(upload.array('files', MAX_BULK_FILES)),
  audit('upsert', 'chapter_image_bulk'),
  async (req, res) => {
    try {
      const chapter = await loadChapter(req.params.chapterId)
      if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      const files = req.files || []
      if (!files.length) return res.status(400).json({ success: false, error: 'Aucun fichier reçu' })

      const published = []
      const rejected = []
      for (const file of files) {
        const match = /^(\d{1,4})\.(png|jpe?g|webp)$/i.exec(String(file.originalname || '').trim())
        const imageIndex = match ? parseIndex(match[1]) : null
        if (!imageIndex) {
          rejected.push({ filename: file.originalname, error: 'Nom attendu : {numéro}.png' })
          continue
        }
        const mimeType = detectImageMime(file.buffer)
        if (!mimeType) {
          rejected.push({ filename: file.originalname, error: 'Image invalide (PNG, JPEG ou WebP)' })
          continue
        }
        await ChapterImage.findOneAndUpdate(
          { chapterOrder: chapter.order, imageIndex },
          {
            $set: {
              filename: String(file.originalname).slice(0, 200),
              mimeType,
              size: file.buffer.length,
              data: file.buffer,
              uploadedBy: req.admin?._id || null,
            },
          },
          { upsert: true },
        )
        markPublishedImage(chapter.order, imageIndex, file.buffer.length)
        published.push(imageIndex)
      }
      res.json({ success: true, data: { chapterOrder: chapter.order, published, rejected } })
    } catch (error) {
      logger.error('Erreur publication images (lot):', error)
      res.status(500).json({ success: false, error: 'Publication impossible' })
    }
  },
)

router.delete('/chapters/:chapterId/images/:imageIndex', audit('delete', 'chapter_image'), async (req, res) => {
  try {
    const chapter = await loadChapter(req.params.chapterId)
    if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
    const imageIndex = parseIndex(req.params.imageIndex)
    if (!imageIndex) return res.status(400).json({ success: false, error: 'Numéro invalide' })
    const removed = await ChapterImage.findOneAndDelete({ chapterOrder: chapter.order, imageIndex })
    if (!removed) return res.status(404).json({ success: false, error: 'Image introuvable' })
    unmarkPublishedImage(chapter.order, imageIndex)
    res.json({ success: true, data: { deleted: true, chapterOrder: chapter.order, imageIndex } })
  } catch (error) {
    logger.error('Erreur suppression image:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

export default router
