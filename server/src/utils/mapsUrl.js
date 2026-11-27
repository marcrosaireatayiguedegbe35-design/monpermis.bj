/**
 * Lien Google Maps accepté pour le lieu de séance d'un moniteur.
 * Seuls les liens Google Maps (https) sont conservés : jamais un site quelconque, pour éviter
 * qu'un lien piégé soit proposé aux apprenants.
 * @returns {string} le lien nettoyé, ou '' s'il n'est pas valide
 */
export function sanitizeMapsUrl(raw) {
  let value = String(raw || '').trim().slice(0, 600)
  if (!value) return ''
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`
  let url
  try {
    url = new URL(value)
  } catch {
    return ''
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
  if (url.username || url.password) return ''
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  const path = url.pathname.toLowerCase()
  const isShort = host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps'))
  const isGoogleMaps =
    host === 'maps.google.com' ||
    /^maps\.google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host) ||
    (/^google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})$/.test(host) && path.startsWith('/maps'))
  if (!isShort && !isGoogleMaps) return ''
  url.protocol = 'https:'
  return url.toString()
}
