import { Router } from 'express'
import { requireUserAuth } from '../middleware/userAuth.js'
import { getVapidPublicKey, removeSubscription, saveSubscription } from '../services/push.js'
import { logger } from '../utils/logger.js'

const router = Router()

/** Clé publique nécessaire au navigateur pour s'abonner (aucun secret). */
router.get('/public-key', async (_req, res) => {
  try {
    res.json({ success: true, data: { publicKey: await getVapidPublicKey() } })
  } catch (error) {
    logger.error('Clé de notification indisponible', { error: error.message })
    res.status(500).json({ success: false, error: 'Notifications indisponibles' })
  }
})

router.post('/subscribe', requireUserAuth, async (req, res) => {
  try {
    await saveSubscription('user', req.user._id, req.body || {}, req.get('user-agent'))
    res.json({ success: true, data: { subscribed: true } })
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'Enregistrement impossible' })
  }
})

router.post('/unsubscribe', requireUserAuth, async (req, res) => {
  try {
    const removed = await removeSubscription('user', req.user._id, req.body || {})
    res.json({ success: true, data: { removed } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Désactivation impossible' })
  }
})

export default router
