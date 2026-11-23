import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_ROOT = path.resolve(__dirname, '../../content')
const TTL_MS = 10 * 60 * 1000
let cache = null

function scan(kind, ext, chapter) {
  const dir = path.join(CONTENT_ROOT, kind, `chapitre-${chapter}`)
  let count = 0
  let bytes = 0
  try {
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith(ext)) continue
      count += 1
      bytes += fs.statSync(path.join(dir, name)).size
    }
  } catch {
    /* chapitre sans média */
  }
  return { count, bytes }
}

/** Nombre et poids des audios (mp3) et images (png) du Code, chapitre par chapitre. */
export function getOfflineManifest(now = Date.now()) {
  if (cache && now - cache.at < TTL_MS) return cache.data
  const chapters = []
  for (let chapter = 1; chapter <= 19; chapter += 1) {
    const audio = scan('code-audio', '.mp3', chapter)
    const images = scan('code-images', '.png', chapter)
    if (audio.count + images.count === 0) continue
    chapters.push({
      chapter,
      audioCount: audio.count,
      imageCount: images.count,
      bytes: audio.bytes + images.bytes,
    })
  }
  const data = {
    chapters,
    totalFiles: chapters.reduce((sum, c) => sum + c.audioCount + c.imageCount, 0),
    totalBytes: chapters.reduce((sum, c) => sum + c.bytes, 0),
  }
  cache = { at: now, data }
  return data
}
