import { ChapterAudio } from '../models/ChapterAudio.js'
import { logger } from '../utils/logger.js'
import { dropMediaMeta } from './mediaCache.js'

/**
 * Index mémoire des audios publiés en base (chapterOrder -> questionOrder -> taille en octets).
 * Permet aux contrôles d'éligibilité (synchrones) de savoir si une question a son audio publié,
 * sans relire MongoDB à chaque appel. Rechargé au démarrage et mis à jour à chaque upload/suppression.
 */
const index = new Map()
const listeners = new Set()

function notify() {
  for (const fn of listeners) {
    try {
      fn()
    } catch (error) {
      logger.warn('publishedAudio listener', { error: String(error) })
    }
  }
}

/** Appelé quand l'index change (ex. vider le cache d'éligibilité des questions). */
export function onPublishedAudioChange(fn) {
  listeners.add(fn)
}

export async function loadPublishedAudioIndex() {
  const rows = await ChapterAudio.find({}, { chapterOrder: 1, questionOrder: 1, size: 1 }).lean()
  index.clear()
  for (const row of rows) markPublishedAudio(row.chapterOrder, row.questionOrder, row.size, false)
  logger.info('Audios publiés chargés', { count: rows.length })
  notify()
}

export function markPublishedAudio(chapterOrder, questionOrder, size, shouldNotify = true) {
  dropMediaMeta('audio', chapterOrder, questionOrder)
  if (!index.has(chapterOrder)) index.set(chapterOrder, new Map())
  index.get(chapterOrder).set(questionOrder, size)
  if (shouldNotify) notify()
}

export function unmarkPublishedAudio(chapterOrder, questionOrder) {
  dropMediaMeta('audio', chapterOrder, questionOrder)
  index.get(chapterOrder)?.delete(questionOrder)
  notify()
}

/** Taille de l'audio publié, ou 0 s'il n'y en a pas. */
export function publishedAudioSize(chapterOrder, questionOrder) {
  return index.get(Number(chapterOrder))?.get(Number(questionOrder)) || 0
}

export function hasPublishedAudio(chapterOrder, questionOrder) {
  return publishedAudioSize(chapterOrder, questionOrder) > 0
}

export function listPublishedAudioOrders(chapterOrder) {
  return [...(index.get(Number(chapterOrder))?.entries() || [])]
    .map(([questionOrder, size]) => ({ questionOrder, size }))
    .sort((a, b) => a.questionOrder - b.questionOrder)
}
