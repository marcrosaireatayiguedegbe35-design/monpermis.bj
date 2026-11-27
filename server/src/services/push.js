import * as webpush from 'web-push'
import { PushSubscription } from '../models/PushSubscription.js'
import { PlatformSetting } from '../models/PlatformSetting.js'
import { logger } from '../utils/logger.js'

const VAPID_KEY = 'vapidKeys'
const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

let vapidReady = null

/**
 * Clés VAPID du serveur : celles de l'environnement si elles existent, sinon générées une fois
 * puis conservées en base (réglages de la plateforme) pour rester les mêmes après chaque redémarrage.
 */
async function ensureVapid() {
  if (vapidReady) return vapidReady
  vapidReady = (async () => {
    let publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim()
    let privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim()
    if (!publicKey || !privateKey) {
      const row = await PlatformSetting.findOne({ key: VAPID_KEY }).lean()
      publicKey = row?.value?.publicKey || ''
      privateKey = row?.value?.privateKey || ''
      if (!publicKey || !privateKey) {
        const fresh = webpush.generateVAPIDKeys()
        // Création atomique : si deux instances démarrent en même temps, une seule paire est retenue.
        await PlatformSetting.updateOne({ key: VAPID_KEY }, { $setOnInsert: { value: fresh } }, { upsert: true }).catch(() => undefined)
        const saved = await PlatformSetting.findOne({ key: VAPID_KEY }).lean()
        publicKey = saved?.value?.publicKey || fresh.publicKey
        privateKey = saved?.value?.privateKey || fresh.privateKey
      }
    }
    const subject = String(process.env.VAPID_SUBJECT || 'https://monpermis.pages.dev').trim()
    webpush.setVapidDetails(subject, publicKey, privateKey)
    return { publicKey }
  })().catch((error) => {
    vapidReady = null
    throw error
  })
  return vapidReady
}

export async function getVapidPublicKey() {
  return (await ensureVapid()).publicKey
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

/** Enregistre (ou met à jour) l'appareil d'un utilisateur ou d'un moniteur. */
export async function saveSubscription(ownerType, ownerId, input, userAgent = '') {
  const base = { ownerType, ownerId, lastSeenAt: new Date(), userAgent: cleanText(userAgent, 300) }
  if (input?.expoToken) {
    const expoToken = cleanText(input.expoToken, 200)
    if (!/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(expoToken)) {
      throw Object.assign(new Error('Jeton de notification invalide'), { status: 400 })
    }
    return PushSubscription.findOneAndUpdate(
      { kind: 'expo', expoToken },
      { $set: { ...base, kind: 'expo', expoToken, platform: cleanText(input.platform, 20) } },
      { upsert: true, new: true },
    )
  }
  const endpoint = cleanText(input?.endpoint, 1000)
  const p256dh = cleanText(input?.keys?.p256dh, 200)
  const auth = cleanText(input?.keys?.auth, 100)
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) {
    throw Object.assign(new Error('Abonnement invalide'), { status: 400 })
  }
  return PushSubscription.findOneAndUpdate(
    { kind: 'web', endpoint },
    { $set: { ...base, kind: 'web', endpoint, keys: { p256dh, auth }, platform: 'web' } },
    { upsert: true, new: true },
  )
}

export async function removeSubscription(ownerType, ownerId, { endpoint, expoToken }) {
  const filter = { ownerType, ownerId }
  if (expoToken) filter.expoToken = expoToken
  else if (endpoint) filter.endpoint = endpoint
  else return 0
  const result = await PushSubscription.deleteMany(filter)
  return result.deletedCount || 0
}

async function sendWeb(subscription, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys?.p256dh, auth: subscription.keys?.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: 'high' },
    )
    return true
  } catch (error) {
    // 404 / 410 : l'appareil s'est désabonné ou a été réinstallé → on oublie cet abonnement.
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await PushSubscription.deleteOne({ _id: subscription._id }).catch(() => undefined)
    } else {
      logger.warn('Notification web non envoyée', { status: error?.statusCode, message: error?.message })
    }
    return false
  }
}

async function sendExpo(subscriptions, payload) {
  if (!subscriptions.length) return
  try {
    const response = await fetch(EXPO_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(
        subscriptions.map((item) => ({
          to: item.expoToken,
          title: payload.title,
          body: payload.body,
          sound: 'default',
          channelId: 'default',
          data: { url: payload.url || '' },
        })),
      ),
    })
    const json = await response.json().catch(() => ({}))
    const tickets = Array.isArray(json?.data) ? json.data : []
    for (let i = 0; i < tickets.length; i += 1) {
      if (tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered') {
        await PushSubscription.deleteOne({ _id: subscriptions[i]._id }).catch(() => undefined)
      }
    }
  } catch (error) {
    logger.warn('Notification mobile non envoyée', { message: error?.message })
  }
}

/**
 * Envoie une notification poussée à tous les appareils d'un utilisateur ou d'un moniteur.
 * Ne lève jamais : une notification ratée ne doit pas casser le flux métier.
 * @param {'user'|'moniteur'} ownerType
 */
export async function sendPush(ownerType, ownerId, { title, body = '', url = '', tag = '' }) {
  if (!ownerId || !title) return 0
  try {
    await ensureVapid()
    const subscriptions = await PushSubscription.find({ ownerType, ownerId }).lean()
    if (!subscriptions.length) return 0
    const payload = {
      title: cleanText(title, 90),
      body: cleanText(body, 200),
      url: cleanText(url, 300) || '/',
      tag: cleanText(tag, 60),
    }
    const web = subscriptions.filter((item) => item.kind === 'web')
    const expo = subscriptions.filter((item) => item.kind === 'expo')
    const results = await Promise.all(web.map((item) => sendWeb(item, payload)))
    await sendExpo(expo, payload)
    return results.filter(Boolean).length + expo.length
  } catch (error) {
    logger.warn('Envoi de notification impossible', { message: error?.message })
    return 0
  }
}

/** Notification poussée à un moniteur (les moniteurs n'ont pas de liste de notifications dans l'application). */
export function notifyMoniteur(moniteurId, payload) {
  return sendPush('moniteur', moniteurId, payload)
}
