import { apiFetch } from '../api/client'

/** Notifications poussées du portail moniteur (Web Push). */

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isIos() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone) || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** Sur iPhone, les notifications ne marchent que si le site est ajouté à l'écran d'accueil. */
export function needsInstallForPush() {
  return isIos() && !isStandalone()
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

export async function registerWorker() {
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

/** Abonne cet appareil et l'enregistre côté serveur. Renvoie true si c'est fait. */
export async function subscribeDevice(token: string) {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const registration = (await registerWorker()) ?? (await navigator.serviceWorker.ready)
  const { publicKey } = await apiFetch<{ publicKey: string }>('/api/push/public-key')
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }))
  await apiFetch('/api/moniteur/push/subscribe', { method: 'POST', body: JSON.stringify(subscription.toJSON()) }, token)
  return true
}

/** Demande la permission (à appeler depuis un geste de l'utilisateur) puis abonne l'appareil. */
export async function enablePush(token: string): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported'
  try {
    const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    if (result !== 'granted') return 'denied'
    await subscribeDevice(token)
    return 'granted'
  } catch {
    return 'error'
  }
}
