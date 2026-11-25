import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Stockage durable des audios et images des questions pour l'usage hors connexion.
 * - Web : IndexedDB du navigateur (fonctionne aussi en http sur le réseau local, contrairement au Cache Storage).
 * - Mobile : dossier persistant de l'application (expo-file-system), jamais purgé par le système.
 * Les médias sont adressés par leur chemin `/content/code-audio|code-images/chapitre-N/X.ext`.
 */
const INDEX_KEY = '@mp/media-index:v1'
const WEB_DB = 'mp-media-v2'
const WEB_STORE = 'files'
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

let writeChain: Promise<void> = Promise.resolve()

/** Écritures sérialisées : la dernière version de l'index est toujours celle qui reste enregistrée. */
async function writeIndex(index: MediaIndex) {
  indexMemory = index
  writeChain = writeChain
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(INDEX_KEY, JSON.stringify(indexMemory)))
    .catch(() => undefined)
  await writeChain
}

function openWebDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WEB_DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(WEB_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function webPut(key: string, blob: Blob) {
  const db = await openWebDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WEB_STORE, 'readwrite')
    tx.objectStore(WEB_STORE).put(blob, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function webGet(key: string): Promise<Blob | undefined> {
  const db = await openWebDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction(WEB_STORE, 'readonly').objectStore(WEB_STORE).get(key)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return blob
}

async function fileSystem() {
  return import('expo-file-system/legacy')
}

function nativePath(base: string, key: string) {
  return `${base}${DIR_NAME}${key.replace(/\//g, '__')}`
}

async function webHas(key: string): Promise<boolean> {
  const db = await openWebDb()
  const count = await new Promise<number>((resolve, reject) => {
    const request = db.transaction(WEB_STORE, 'readonly').objectStore(WEB_STORE).count(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return count > 0
}

/** Clés de tous les médias présents sur l'appareil, en UNE seule lecture (rapide, même avec 1 300 fichiers). */
export async function listStoredMediaKeys(): Promise<Set<string>> {
  try {
    if (isWeb) {
      if (typeof indexedDB === 'undefined') return new Set()
      const db = await openWebDb()
      const keys = await new Promise<string[]>((resolve, reject) => {
        const request = db.transaction(WEB_STORE, 'readonly').objectStore(WEB_STORE).getAllKeys()
        request.onsuccess = () => resolve(request.result as string[])
        request.onerror = () => reject(request.error)
      })
      db.close()
      return new Set(keys.map(String))
    }
    const FS = await fileSystem()
    const names = await FS.readDirectoryAsync(`${FS.documentDirectory ?? ''}${DIR_NAME}`).catch(() => [] as string[])
    return new Set(names.map((name) => name.replace(/__/g, '/')))
  } catch {
    return new Set()
  }
}

/** Le fichier est-il réellement sur l'appareil ? (indépendant de l'index, qui peut être en retard). */
async function existsOnDevice(key: string): Promise<boolean> {
  try {
    if (isWeb) return typeof indexedDB !== 'undefined' && (await webHas(key))
    const FS = await fileSystem()
    return (await FS.getInfoAsync(nativePath(FS.documentDirectory ?? '', key))).exists
  } catch {
    return false
  }
}

/** Vérifie la présence réelle d'un média et rattrape l'index s'il l'avait oublié. */
export async function hasMedia(url: string): Promise<boolean> {
  const key = mediaKeyFromUrl(url)
  if (!key) return false
  if (!(await existsOnDevice(key))) return false
  const index = await readIndex()
  if (index.files[key] == null) await writeIndex({ files: { ...index.files, [key]: 0 } })
  return true
}

/** URI locale d'un média déjà téléchargé, ou `undefined`. Ne touche jamais le réseau. */
export async function getCachedMediaUri(url: string): Promise<string | undefined> {
  const key = mediaKeyFromUrl(url)
  if (!key) return undefined
  try {
    if (isWeb) {
      const existing = webObjectUrls.get(key)
      if (existing) return existing
      if (typeof indexedDB === 'undefined') return undefined
      const blob = await webGet(key)
      if (!blob) return undefined
      const objectUrl = URL.createObjectURL(blob)
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
  if (await hasMedia(url)) return true
  try {
    let bytes = 0
    if (isWeb) {
      if (typeof indexedDB === 'undefined') return false
      const response = await fetch(url.split('?')[0])
      if (!response.ok) return false
      const blob = await response.blob()
      if (blob.size === 0) return false
      await webPut(key, blob)
      bytes = blob.size
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
      for (const url of webObjectUrls.values()) URL.revokeObjectURL(url)
      webObjectUrls.clear()
      if (typeof indexedDB !== 'undefined') {
        await new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(WEB_DB)
          request.onsuccess = request.onerror = request.onblocked = () => resolve()
        })
      }
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
