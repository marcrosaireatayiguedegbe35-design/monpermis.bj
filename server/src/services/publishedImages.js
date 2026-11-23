import { ChapterImage } from '../models/ChapterImage.js'
import { logger } from '../utils/logger.js'
import { dropMediaMeta } from './mediaCache.js'

/** Index mémoire des images publiées en base (chapterOrder -> imageIndex -> taille), comme publishedAudio.js. */
const index = new Map()
const listeners = new Set()

function notify() {
  for (const fn of listeners) {
    try {
      fn()
    } catch (error) {
      logger.warn('publishedImages listener', { error: String(error) })
    }
  }
}

export function onPublishedImageChange(fn) {
  listeners.add(fn)
}

export async function loadPublishedImageIndex() {
  const rows = await ChapterImage.find({}, { chapterOrder: 1, imageIndex: 1, size: 1 }).lean()
  index.clear()
  for (const row of rows) markPublishedImage(row.chapterOrder, row.imageIndex, row.size, false)
  logger.info('Images publiées chargées', { count: rows.length })
  notify()
}

export function markPublishedImage(chapterOrder, imageIndex, size, shouldNotify = true) {
  dropMediaMeta('image', chapterOrder, imageIndex)
  if (!index.has(chapterOrder)) index.set(chapterOrder, new Map())
  index.get(chapterOrder).set(imageIndex, size)
  if (shouldNotify) notify()
}

export function unmarkPublishedImage(chapterOrder, imageIndex) {
  dropMediaMeta('image', chapterOrder, imageIndex)
  index.get(chapterOrder)?.delete(imageIndex)
  notify()
}

export function hasPublishedImage(chapterOrder, imageIndex) {
  return (index.get(Number(chapterOrder))?.get(Number(imageIndex)) || 0) > 0
}
