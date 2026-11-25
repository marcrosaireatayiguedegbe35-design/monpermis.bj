import jwt from 'jsonwebtoken'
import { Moniteur } from '../models/Moniteur.js'
import { isTokenRevoked } from './security.js'

/**
 * Authentification moniteur. Tant que le mot de passe provisoire n'est pas changé, seules les routes
 * qui l'autorisent explicitement (`allowPasswordChange`) répondent : session, déconnexion, changement.
 */
function buildMoniteurAuth({ allowPasswordChange }) {
  return async function moniteurAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentification requise' })
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'monpermis',
      audience: 'moniteur',
    })

    if (payload.scope !== 'moniteur' || !payload.moniteurId) {
      return res.status(403).json({ success: false, error: 'Accès refusé' })
    }

    const moniteur = await Moniteur.findById(payload.moniteurId)
    const sessionVersion = moniteur?.sessionVersion || 0
    if (
      !moniteur ||
      !moniteur.active ||
      (payload.sv ?? 0) !== sessionVersion ||
      isTokenRevoked(payload, moniteur.passwordChangedAt)
    ) {
      return res.status(401).json({ success: false, error: 'Session invalide' })
    }
    if (!moniteur.activeLogin) {
      return res.status(403).json({
        success: false,
        error: 'Compte non activé, contactez l’administration',
        code: 'LOGIN_DISABLED',
      })
    }

    if (moniteur.mustChangePassword && !allowPasswordChange) {
      return res.status(403).json({
        success: false,
        error: 'Choisissez d’abord votre nouveau mot de passe',
        code: 'PASSWORD_CHANGE_REQUIRED',
      })
    }

    req.moniteur = moniteur
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Session expirée ou invalide' })
  }
  }
}

export const requireMoniteurAuth = buildMoniteurAuth({ allowPasswordChange: false })
export const requireMoniteurAuthAllowPasswordChange = buildMoniteurAuth({ allowPasswordChange: true })
