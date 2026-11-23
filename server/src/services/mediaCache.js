/**
 * Cache mémoire (LRU, borné en octets) des médias servis depuis MongoDB : évite de relire
 * des centaines de Ko en base à chaque lecture d'audio / d'image pendant un examen.
 */
const MAX_BYTES = 96 * 1024 * 1024
const entries = new Map() // clé -> Buffer (ordre d'insertion = ancienneté d'usage)
let total = 0

export function getCachedMedia(key) {
  const buffer = entries.get(key)
  if (!buffer) return null
  entries.delete(key)
  entries.set(key, buffer) // marque comme récemment utilisé
  return buffer
}

export function setCachedMedia(key, buffer) {
  if (buffer.length > MAX_BYTES / 4) return
  if (entries.has(key)) total -= entries.get(key).length
  entries.set(key, buffer)
  total += buffer.length
  while (total > MAX_BYTES && entries.size > 1) {
    const oldest = entries.keys().next().value
    total -= entries.get(oldest).length
    entries.delete(oldest)
  }
}

/** Cache navigateur/CDN : 5 min sans revalider, puis réutilisation le temps de revalider (ETag → 304). */
export const MEDIA_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=86400'

/**
 * Cache des métadonnées (ETag, type) pour répondre 304 / servir sans aucun aller-retour MongoDB.
 * Invalidé dès qu'un admin publie, remplace ou retire un média ; TTL de sécurité 5 min.
 */
const META_TTL_MS = 5 * 60 * 1000
const metas = new Map() // "kind:chap:n" -> { at, meta }

export function getMediaMeta(kind, chapter, n) {
  const hit = metas.get(`${kind}:${chapter}:${n}`)
  if (!hit) return null
  if (Date.now() - hit.at > META_TTL_MS) {
    metas.delete(`${kind}:${chapter}:${n}`)
    return null
  }
  return hit.meta
}

export function setMediaMeta(kind, chapter, n, meta) {
  metas.set(`${kind}:${chapter}:${n}`, { at: Date.now(), meta })
}

export function dropMediaMeta(kind, chapter, n) {
  metas.delete(`${kind}:${chapter}:${n}`)
}
