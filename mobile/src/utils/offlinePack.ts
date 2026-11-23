import { getLocalBankByChapterOrder } from '../data/codeRoute/banks'
import { apiAuthed } from '../api/client'
import { clearMediaCache, downloadMedia, getCachedMediaUri, mediaCacheStats, mediaKeyFromUrl } from './mediaCache'
import { resolveMediaUrl } from './mediaUrl'

/**
 * « Code hors connexion » : télécharge tous les audios et images des questions sur l'appareil.
 * Les questions, les corrections et les examens sont déjà dans l'application ; seuls les médias se téléchargent.
 * Le téléchargement est reprenable (les fichiers déjà là sont ignorés) et continue même si l'on quitte l'écran.
 */
export type OfflinePackProgress = {
  running: boolean
  done: number
  total: number
  bytes: number
  failed: number
  complete: boolean
}

type Listener = (progress: OfflinePackProgress) => void

const CHAPTER_COUNT = 19
const CONCURRENCY = 4

let state: OfflinePackProgress = { running: false, done: 0, total: 0, bytes: 0, failed: 0, complete: false }
let cancelRequested = false
const listeners = new Set<Listener>()

function publish(next: Partial<OfflinePackProgress>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener(state)
}

export function subscribeOfflinePack(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

export function currentOfflinePackProgress() {
  return state
}

/** Toutes les URLs de médias des questions disponibles dans l'application. */
export function listPackMediaUrls(): string[] {
  const urls = new Set<string>()
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter += 1) {
    for (const question of getLocalBankByChapterOrder(chapter) || []) {
      const audio = resolveMediaUrl(`/content/code-audio/chapitre-${chapter}/${question.order}.mp3`)
      if (audio) urls.add(audio)
      for (const image of question.prompt.imageUrls || []) {
        const match = String(image).match(/\/(\d+)\.png/i)
        if (!match) continue
        const url = resolveMediaUrl(`/content/code-images/chapitre-${chapter}/${match[1]}.png`)
        if (url) urls.add(url)
      }
    }
  }
  return [...urls]
}

/** Combien de médias sont déjà sur l'appareil (sans réseau). */
export async function offlinePackStatus(): Promise<OfflinePackProgress> {
  const urls = listPackMediaUrls()
  const stats = await mediaCacheStats()
  const keys = new Set(urls.map((url) => mediaKeyFromUrl(url)).filter((key): key is string => Boolean(key)))
  let done = 0
  // Le total en octets vient de l'index ; le nombre de fichiers présents se recoupe avec la liste attendue.
  const { isMediaDownloaded } = await import('./mediaCache')
  for (const key of keys) if (await isMediaDownloaded(key)) done += 1
  const total = urls.length
  return { running: false, done, total, bytes: stats.bytes, failed: 0, complete: total > 0 && done >= total }
}

export async function refreshOfflinePackStatus() {
  if (state.running) return state
  publish(await offlinePackStatus())
  return state
}

/** Poids total du paquet annoncé par le serveur (pour informer avant de télécharger). */
export async function fetchOfflinePackSize(): Promise<{ totalBytes: number; totalFiles: number } | null> {
  try {
    const data = await apiAuthed<{ totalBytes: number; totalFiles: number }>('/content/revision/offline-manifest')
    return { totalBytes: data.totalBytes, totalFiles: data.totalFiles }
  } catch {
    return null
  }
}

export function cancelOfflinePackDownload() {
  cancelRequested = true
}

export async function startOfflinePackDownload(): Promise<OfflinePackProgress> {
  if (state.running) return state
  cancelRequested = false
  const urls = listPackMediaUrls()
  const pending: string[] = []
  for (const url of urls) {
    if (!(await getCachedMediaUri(url))) pending.push(url)
  }
  let done = urls.length - pending.length
  let failed = 0
  publish({ running: true, total: urls.length, done, failed: 0, complete: false })

  let cursor = 0
  const worker = async () => {
    while (!cancelRequested) {
      const index = cursor
      cursor += 1
      if (index >= pending.length) return
      const ok = await downloadMedia(pending[index])
      if (ok) done += 1
      else failed += 1
      if ((done + failed) % 5 === 0 || done + failed === urls.length) {
        publish({ done, failed, bytes: (await mediaCacheStats()).bytes })
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  const stats = await mediaCacheStats()
  publish({ running: false, done, failed, bytes: stats.bytes, complete: done >= urls.length })
  return state
}

export async function removeOfflinePack() {
  cancelRequested = true
  await clearMediaCache()
  publish({ running: false, done: 0, bytes: 0, failed: 0, complete: false, total: listPackMediaUrls().length })
}
