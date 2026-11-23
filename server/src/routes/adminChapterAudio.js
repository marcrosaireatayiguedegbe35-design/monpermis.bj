import { Router } from 'express'
import multer from 'multer'
import { Chapter } from '../models/Chapter.js'
import { ChapterAudio } from '../models/ChapterAudio.js'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { logger } from '../utils/logger.js'
import { getHardcodedQuestionsForChapter } from '../services/hardcodedQuestions.js'
import { markPublishedAudio, unmarkPublishedAudio } from '../services/publishedAudio.js'

/**
 * Publication des audios de questions par chapitre (stockés en MongoDB).
 * Montée sur /api/admin/revision :
 *   GET    /chapters/:chapterId/audios
 *   PUT    /chapters/:chapterId/audios/:questionOrder   (champ « file »)
 *   POST   /chapters/:chapterId/audios/bulk             (champ « files », noms 12.mp3, 13.mp3…)
 *   DELETE /chapters/:chapterId/audios/:questionOrder
 */
const router = Router()
router.use(requireAdminAuth)

const MAX_AUDIO_BYTES = 15 * 1024 * 1024
const MAX_BULK_FILES = 60

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: MAX_BULK_FILES },
})

/** MP3 réel d'après ses octets (en-tête ID3 ou synchro de trame MPEG), jamais d'après le nom. */
function looksLikeMp3(buffer) {
  if (!buffer || buffer.length < 4) return false
  if (buffer.toString('latin1', 0, 3) === 'ID3') return true
  return buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0
}

async function loadChapter(chapterId) {
  if (!/^[a-f\d]{24}$/i.test(String(chapterId))) return null
  const chapter = await Chapter.findById(chapterId)
  if (!chapter || !Number.isFinite(Number(chapter.order))) return null
  return chapter
}

function parseQuestionOrder(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : null
}

async function storeAudio(chapterOrder, questionOrder, file, adminId) {
  if (!looksLikeMp3(file.buffer)) {
    throw Object.assign(new Error(`« ${file.originalname} » n'est pas un MP3 valide`), { status: 400 })
  }
  await ChapterAudio.findOneAndUpdate(
    { chapterOrder, questionOrder },
    {
      $set: {
        filename: String(file.originalname || '').slice(0, 200),
        mimeType: 'audio/mpeg',
        size: file.buffer.length,
        data: file.buffer,
        uploadedBy: adminId || null,
      },
    },
    { upsert: true, new: false },
  )
  markPublishedAudio(chapterOrder, questionOrder, file.buffer.length)
}

function runUpload(handler) {
  return (req, res, next) =>
    handler(req, res, (error) => {
      if (!error) return next()
      const tooBig = error.code === 'LIMIT_FILE_SIZE'
      res.status(tooBig ? 413 : 400).json({
        success: false,
        error: tooBig ? 'Fichier trop volumineux (15 Mo maximum)' : 'Envoi invalide',
      })
    })
}

router.get('/chapters/:chapterId/audios', async (req, res) => {
  try {
    const chapter = await loadChapter(req.params.chapterId)
    if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })

    const rows = await ChapterAudio.find(
      { chapterOrder: chapter.order },
      { chapterOrder: 1, questionOrder: 1, size: 1, filename: 1, updatedAt: 1 },
    )
      .sort({ questionOrder: 1 })
      .lean()
    const byOrder = new Map(rows.map((row) => [row.questionOrder, row]))

    const bank = getHardcodedQuestionsForChapter(chapter) || []
    const expected = [...new Set(bank.map((q) => Number(q.order)).filter(Number.isFinite))].sort(
      (a, b) => a - b,
    )
    const orders = [...new Set([...expected, ...byOrder.keys()])].sort((a, b) => a - b)

    res.json({
      success: true,
      data: {
        chapter: { id: chapter._id, name: chapter.name, order: chapter.order },
        publishedCount: rows.length,
        expectedCount: expected.length,
        audios: orders.map((questionOrder) => {
          const row = byOrder.get(questionOrder)
          return {
            questionOrder,
            published: Boolean(row),
            expected: expected.includes(questionOrder),
            size: row?.size || 0,
            filename: row?.filename || '',
            updatedAt: row?.updatedAt || null,
            url: row ? `/content/code-audio/chapitre-${chapter.order}/${questionOrder}.mp3` : '',
          }
        }),
      },
    })
  } catch (error) {
    logger.error('Erreur liste audios chapitre:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.put(
  '/chapters/:chapterId/audios/:questionOrder',
  runUpload(upload.single('file')),
  audit('upsert', 'chapter_audio'),
  async (req, res) => {
    try {
      const chapter = await loadChapter(req.params.chapterId)
      if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      const questionOrder = parseQuestionOrder(req.params.questionOrder)
      if (!questionOrder) return res.status(400).json({ success: false, error: 'Numéro de question invalide' })
      if (!req.file) return res.status(400).json({ success: false, error: 'Fichier audio requis' })

      await storeAudio(chapter.order, questionOrder, req.file, req.admin?._id)
      res.json({
        success: true,
        data: { chapterOrder: chapter.order, questionOrder, size: req.file.buffer.length },
      })
    } catch (error) {
      if (error.status) return res.status(error.status).json({ success: false, error: error.message })
      logger.error('Erreur publication audio:', error)
      res.status(500).json({ success: false, error: 'Publication impossible' })
    }
  },
)

router.post(
  '/chapters/:chapterId/audios/bulk',
  runUpload(upload.array('files', MAX_BULK_FILES)),
  audit('upsert', 'chapter_audio_bulk'),
  async (req, res) => {
    try {
      const chapter = await loadChapter(req.params.chapterId)
      if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      const files = req.files || []
      if (!files.length) return res.status(400).json({ success: false, error: 'Aucun fichier reçu' })

      const published = []
      const rejected = []
      for (const file of files) {
        // Le numéro de la question est le nom du fichier : « 12.mp3 » → question 12.
        const match = /^(\d{1,4})\.mp3$/i.exec(String(file.originalname || '').trim())
        const questionOrder = match ? parseQuestionOrder(match[1]) : null
        if (!questionOrder) {
          rejected.push({ filename: file.originalname, error: 'Nom attendu : {numéro}.mp3' })
          continue
        }
        try {
          await storeAudio(chapter.order, questionOrder, file, req.admin?._id)
          published.push(questionOrder)
        } catch (error) {
          rejected.push({ filename: file.originalname, error: error.message })
        }
      }
      res.json({ success: true, data: { chapterOrder: chapter.order, published, rejected } })
    } catch (error) {
      logger.error('Erreur publication audios (lot):', error)
      res.status(500).json({ success: false, error: 'Publication impossible' })
    }
  },
)

router.delete(
  '/chapters/:chapterId/audios/:questionOrder',
  audit('delete', 'chapter_audio'),
  async (req, res) => {
    try {
      const chapter = await loadChapter(req.params.chapterId)
      if (!chapter) return res.status(404).json({ success: false, error: 'Chapitre introuvable' })
      const questionOrder = parseQuestionOrder(req.params.questionOrder)
      if (!questionOrder) return res.status(400).json({ success: false, error: 'Numéro de question invalide' })

      const removed = await ChapterAudio.findOneAndDelete({ chapterOrder: chapter.order, questionOrder })
      if (!removed) return res.status(404).json({ success: false, error: 'Audio introuvable' })
      unmarkPublishedAudio(chapter.order, questionOrder)
      res.json({ success: true, data: { deleted: true, chapterOrder: chapter.order, questionOrder } })
    } catch (error) {
      logger.error('Erreur suppression audio:', error)
      res.status(500).json({ success: false, error: 'Suppression impossible' })
    }
  },
)

export default router
