import { Notification } from '../models/Notification.js'
import { logger } from '../utils/logger.js'
import { sendPush } from './push.js'

/**
 * Crée une notification pour un utilisateur. Ne lève jamais : une notification
 * ratée ne doit pas casser le flux métier appelant (paiement, réservation…).
 */
export async function notifyUser(userId, { type = 'general', title, body = '', link = '' }) {
  if (!userId || !title) return null
  try {
    const created = await Notification.create({ userId, type, title, body, link })
    // Même message sur le téléphone, sans attendre (jamais bloquant).
    void sendPush('user', userId, { title, body, url: link ? `/${String(link).replace(/^\//, '')}` : '/', tag: type })
    return created
  } catch (error) {
    logger.error('Notification non créée', { error: error.message, userId: String(userId), type })
    return null
  }
}

/** Diffuse une notification identique à plusieurs utilisateurs (annonces). */
export async function notifyManyUsers(userIds, payload) {
  const docs = userIds
    .filter(Boolean)
    .map((userId) => ({
      userId,
      type: payload.type ?? 'announcement',
      title: payload.title,
      body: payload.body ?? '',
      link: payload.link ?? '',
    }))
  if (!docs.length) return 0
  try {
    const created = await Notification.insertMany(docs, { ordered: false })
    // Annonce aussi sur les téléphones, par petits groupes pour ne pas saturer le serveur.
    void (async () => {
      const url = payload.link ? `/${String(payload.link).replace(/^\//, '')}` : '/'
      for (let i = 0; i < docs.length; i += 20) {
        await Promise.all(
          docs.slice(i, i + 20).map((doc) => sendPush('user', doc.userId, { title: doc.title, body: doc.body, url, tag: doc.type })),
        )
      }
    })()
    return created.length
  } catch (error) {
    logger.error('Diffusion notifications échouée', { error: error.message })
    return 0
  }
}
