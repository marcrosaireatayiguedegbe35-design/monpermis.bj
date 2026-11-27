import { apiAuthed, apiPublic } from '../api/client'

/** Notifications poussées du site apprenant (Web Push : navigateur ou site ajouté à l'écran d'accueil). */

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported'

function supported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function isIos() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone) || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** Sur iPhone, les notifications ne marchent que si le site est ajouté à l'écran d'accueil. */
export function needsInstallForPush() {
  return typeof window !== 'undefined' && isIos() && !isStandalone()
}

/** Manifeste et icône : nécessaires pour installer le site sur l'écran d'accueil et recevoir des notifications. */
function ensureHeadLinks() {
  if (typeof document === 'undefined') return
  const add = (rel: string, href: string) => {
    if (document.head.querySelector(`link[rel="${rel}"]`)) return
    const link = document.createElement('link')
    link.rel = rel
    link.href = href
    document.head.appendChild(link)
  }
  add('manifest', '/manifest.webmanifest')
  add('apple-touch-icon', '/icon-192.png')
}

async function registerWorker() {
  ensureHeadLinks()
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

function toKey(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return 'unsupported'
  void registerWorker()
  const state = Notification.permission
  return state === 'default' ? 'undetermined' : state
}

async function subscribeDevice() {
  const registration = (await registerWorker()) ?? (await navigator.serviceWorker.ready)
  const { publicKey } = await apiPublic<{ publicKey: string }>('/push/public-key')
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }))
  await apiAuthed('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription.toJSON()) })
}

export async function enablePush(): Promise<'granted' | 'denied' | 'error'> {
  if (!supported()) return 'error'
  try {
    const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    if (result !== 'granted') return 'denied'
    await subscribeDevice()
    return 'granted'
  } catch {
    return 'error'
  }
}

export async function syncPushIfGranted() {
  try {
    if (supported() && Notification.permission === 'granted' && !needsInstallForPush()) await subscribeDevice()
  } catch {
    /* sans importance : la prochaine ouverture réessaiera */
  }
}

export function listenNotificationTaps() {
  return () => undefined
}
