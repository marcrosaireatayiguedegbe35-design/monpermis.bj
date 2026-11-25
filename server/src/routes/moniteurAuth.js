import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { Moniteur } from '../models/Moniteur.js'
import { requireMoniteurAuthAllowPasswordChange as requireMoniteurAuth } from '../middleware/moniteurAuth.js'
import { normalizeBeninPhone } from '../services/fedapay.js'
import { passwordPolicyError } from '../middleware/security.js'
import { moniteurLoginLimiter } from '../middleware/rateLimiters.js'
import { logger } from '../utils/logger.js'
import { DUMMY_BCRYPT_HASH } from '../middleware/security.js'
import bcrypt from 'bcryptjs'

const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function createMoniteurToken(moniteur) {
  return jwt.sign(
    {
      moniteurId: String(moniteur._id),
      scope: 'moniteur',
      sv: moniteur.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '12h',
      algorithm: 'HS256',
      issuer: 'monpermis',
      audience: 'moniteur',
    },
  )
}

router.post('/login', moniteurLoginLimiter, async (req, res) => {
  try {
    // Identifiant = numéro de téléphone (ou, pour les anciens comptes, l'adresse e-mail).
    const rawLogin = req.body.login ?? req.body.phone ?? req.body.email
    if (typeof rawLogin !== 'string' || typeof req.body.password !== 'string') {
      return res.status(400).json({ success: false, error: 'Téléphone et mot de passe requis' })
    }
    const password = req.body.password
    const loginText = rawLogin.trim()
    if (!loginText || !password) {
      return res.status(400).json({ success: false, error: 'Téléphone et mot de passe requis' })
    }

    let filter = null
    if (EMAIL_PATTERN.test(loginText)) {
      filter = { email: normalizeEmail(loginText) }
    } else {
      const phone = normalizeBeninPhone(loginText)
      // Anciens comptes : le numéro a pu être saisi tel quel (avec espaces) par l'administration.
      if (phone) filter = { $or: [{ phone }, { phone: loginText }] }
    }
    if (!filter) {
      return res.status(400).json({ success: false, error: 'Numéro de téléphone invalide' })
    }

    const moniteur = await Moniteur.findOne(filter).select('+passwordHash')
    if (!moniteur || !moniteur.passwordHash) {
      // Même durée de réponse qu'un vrai compte : pas d'énumération par le temps.
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH)
      logger.warn('Connexion moniteur refusée (compte inconnu)', { ip: req.ip })
      return res.status(401).json({ success: false, error: 'Identifiants invalides' })
    }

    const ok = await moniteur.comparePassword(password)
    if (!ok) {
      if (!moniteur.isLocked()) await moniteur.registerFailedLogin()
      logger.warn('Connexion moniteur refusée (mot de passe)', { ip: req.ip, moniteurId: String(moniteur._id) })
      return res.status(401).json({ success: false, error: 'Identifiants invalides' })
    }

    if (moniteur.isLocked()) {
      logger.warn('Connexion moniteur refusée (compte verrouillé)', { ip: req.ip, moniteurId: String(moniteur._id) })
      return res.status(429).json({
        success: false,
        error: 'Compte temporairement verrouillé. Réessayez dans quelques minutes.',
      })
    }

    if (!moniteur.active) {
      return res.status(403).json({
        success: false,
        error: 'Compte désactivé, contactez l’administration',
        code: 'ACCOUNT_DISABLED',
      })
    }

    if (!moniteur.activeLogin) {
      return res.status(403).json({
        success: false,
        error: 'Compte non activé, contactez l’administration',
        code: 'LOGIN_DISABLED',
      })
    }

    moniteur.resetFailedLogins()
    moniteur.lastLoginAt = new Date()
    await moniteur.save()

    res.json({
      success: true,
      data: {
        moniteur: moniteur.toAuthJSON(),
        token: createMoniteurToken(moniteur),
        homePath: '/',
      },
    })
  } catch (error) {
    logger.error('Erreur login moniteur:', error)
    res.status(500).json({ success: false, error: 'Connexion impossible' })
  }
})

router.post('/logout', requireMoniteurAuth, async (req, res) => {
  try {
    await Moniteur.updateOne({ _id: req.moniteur._id }, { $inc: { sessionVersion: 1 } })
    res.json({ success: true, data: { ok: true } })
  } catch (error) {
    logger.error('Erreur déconnexion moniteur:', error)
    res.status(500).json({ success: false, error: 'Déconnexion impossible' })
  }
})

router.post('/change-password', requireMoniteurAuth, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '')
    const newPassword = String(req.body.newPassword || '')
    const pwdError = passwordPolicyError(newPassword)
    if (pwdError) return res.status(400).json({ success: false, error: pwdError })
    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        error: 'Le nouveau mot de passe doit être différent du mot de passe provisoire',
      })
    }

    const moniteur = await Moniteur.findById(req.moniteur._id).select('+passwordHash')
    if (!moniteur || !(await moniteur.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, error: 'Mot de passe actuel incorrect' })
    }

    await moniteur.setPassword(newPassword)
    moniteur.mustChangePassword = false
    await moniteur.save()

    // setPassword invalide les anciens jetons : on renvoie une session toute neuve.
    res.json({
      success: true,
      data: { moniteur: moniteur.toAuthJSON(), token: createMoniteurToken(moniteur) },
    })
  } catch (error) {
    logger.error('Erreur changement mot de passe moniteur:', error)
    res.status(500).json({ success: false, error: 'Changement impossible' })
  }
})

/** Fin du parcours de première connexion (photo, véhicule, horaires) : le moniteur accède au tableau de bord. */
router.post('/onboarding-complete', requireMoniteurAuth, async (req, res) => {
  try {
    const moniteur = req.moniteur
    if (!moniteur.photoUrl) {
      return res.status(400).json({ success: false, error: 'Ajoute ta photo de profil pour continuer' })
    }
    if (!moniteur.vehicleBrand) {
      return res.status(400).json({ success: false, error: 'Indique le véhicule que tu conduis' })
    }
    if (!(moniteur.weeklyAvailability || []).length) {
      return res.status(400).json({ success: false, error: 'Indique au moins un jour d’horaires' })
    }
    moniteur.needsOnboarding = false
    await moniteur.save()
    res.json({ success: true, data: { moniteur: moniteur.toAuthJSON() } })
  } catch (error) {
    logger.error('Erreur fin de parcours moniteur:', error)
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

router.get('/me', requireMoniteurAuth, async (req, res) => {
  try {
    res.json({ success: true, data: { moniteur: req.moniteur.toAuthJSON() } })
  } catch (error) {
    logger.error('Erreur me moniteur:', error)
    res.status(500).json({ success: false, error: 'Session impossible à charger' })
  }
})

export default router
