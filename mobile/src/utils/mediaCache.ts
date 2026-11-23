import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Stockage durable des audios et images des questions pour l'usage hors connexion.
 * - Web : Cache Storage du navigateur.
 * - Mobile : dossier persistant de l'application (expo-file-system), jamais purgé par le système.
 * Les médias sont adressés par leur chemin `/content/code-audio|code-images/chapitre-N/X.ext`.
 */
const INDEX_KEY = '@mp/media-index:v1'
const WEB_CACHE = 'mp-media-v1'
const DIR_NAME = 'mp-media/'

type MediaIndex = { files: Record<string, number> } // clé → taille en octets

let indexMemory: MediaIndex | null = null
const webObjectUrls = new Map<string, string>()

/** `https://api/…/content/code-audio/chapitre-1/5.mp3?v=…` → `code-audio/chapitre-1/5.mp3` */
export function mediaKeyFromUrl(url: string): string | null {
  const match = String(url || '').match(/\/content\/(code-(?:audio|images)\/chapitre-\d+\/\d+\.(?:mp3|png|jpe?g|webp))/i)
  return match ? match[1].toLowerCase() : null
}

const isWeb = Platform.OS === 'web'

async function readIndex(): Promise<MediaIndex> {
  if (indexMemory) return indexMemory
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY)
    const parsed = raw ? (JSON.parse(raw) as MediaIndex) : null
    indexMemory = parsed && typeof parsed.files === 'object' ? parsed : { files: {} }
  } catch {
    indexMemory = { files: {} }
  }
  return indexMemory
}

async function writeIndex(index: MediaIndex) {
  indexMemory = index
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    /* ignore */
  }
}

async function fileSystem() {
  return import('expo-file-system/legacy')
}

function nativePath(base: string, key: string) {
  return `${base}${DIR_NAME}${key.replace(/\//g, '__')}`
}

/** URI locale d'un média déjà téléchargé, ou `undefined`. Ne touche jamais le réseau. */
export async function getCachedMediaUri(url: string): Promise<string | undefined> {
  const key = mediaKeyFromUrl(url)
  if (!key) return undefined
  const index = await readIndex()
  if (index.files[key] == null) return undefined
  try {
    if (isWeb) {
      const existing = webObjectUrls.get(key)
      if (existing) return existing
      if (typeof caches === 'undefined') return undefined
      const cache = await caches.open(WEB_CACHE)
      const response = await cache.match(url.split('?')[0]) // la version (?v=) ne change pas le fichier
      if (!response) return undefined
      const objectUrl = URL.createObjectURL(await response.blob())
      webObjectUrls.set(key, objectUrl)
      return objectUrl
    }
    const FS = await fileSystem()
    const path = nativePath(FS.documentDirectory ?? '', key)
    const info = await FS.getInfoAsync(path)
    return info.exists ? path : undefined
  } catch {
    return undefined
  }
}

/** Télécharge un média pour l'usage hors connexion. Renvoie `true` s'il est disponible localement. */
export async function downloadMedia(url: string): Promise<boolean> {
  const key = mediaKeyFromUrl(url)
  if (!key) return false
  const index = await readIndex()
  if (index.files[key] != null && (await getCachedMediaUri(url))) return true
  try {
    let bytes = 0
    if (isWeb) {
      if (typeof caches === 'undefined') return false
      const response = await fetch(url.split('?')[0])
      if (!response.ok) return false
      const cache = await caches.open(WEB_CACHE)
      await cache.put(url.split('?')[0], response.clone())
      bytes = Number(response.headers.get('content-length')) || (await response.clone().blob()).size
    } else {
      const FS = await fileSystem()
      const base = FS.documentDirectory ?? ''
      await FS.makeDirectoryAsync(`${base}${DIR_NAME}`, { intermediates: true }).catch(() => undefined)
      const path = nativePath(base, key)
      const result = await FS.downloadAsync(url, path)
      if (result.status !== 200) {
        await FS.deleteAsync(path, { idempotent: true }).catch(() => undefined)
        return false
      }
      const info = await FS.getInfoAsync(path)
      bytes = info.exists && 'size' in info ? Number(info.size) || 0 : 0
    }
    const next = await readIndex()
    next.files[key] = bytes
    await writeIndex({ files: { ...next.files } })
    return true
  } catch {
    return false
  }
}

/** Mémorise un média au passage (pendant qu'il est lu en ligne) sans bloquer la lecture. */
export function cacheMediaInBackground(url: string | undefined) {
  if (url) void downloadMedia(url)
}

export async function mediaCacheStats(): Promise<{ count: number; bytes: number }> {
  const index = await readIndex()
  const sizes = Object.values(index.files)
  return { count: sizes.length, bytes: sizes.reduce((sum, size) => sum + size, 0) }
}

export async function isMediaDownloaded(key: string): Promise<boolean> {
  return (await readIndex()).files[key] != null
}

/** Nombre de médias déjà téléchargés dont la clé commence par ce préfixe (ex. `code-audio/chapitre-3/`). */
export async function downloadedCountForPrefix(prefix: string): Promise<number> {
  const index = await readIndex()
  return Object.keys(index.files).filter((key) => key.startsWith(prefix)).length
}

export async function clearMediaCache() {
  const index = await readIndex()
  try {
    if (isWeb) {
      if (typeof caches !== 'undefined') await caches.delete(WEB_CACHE)
      for (const url of webObjectUrls.values()) URL.revokeObjectURL(url)
      webObjectUrls.clear()
    } else {
      const FS = await fileSystem()
      await FS.deleteAsync(`${FS.documentDirectory ?? ''}${DIR_NAME}`, { idempotent: true })
    }
  } catch {
    /* ignore */
  }
  void index
  await writeIndex({ files: {} })
}
