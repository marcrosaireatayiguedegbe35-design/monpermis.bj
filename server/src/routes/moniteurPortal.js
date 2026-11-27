import { refreshCreneauState } from '../utils/creneauSeats.js'
import { Router } from 'express'
import mongoose from 'mongoose'
import { Creneau } from '../models/Creneau.js'
import { Payment } from '../models/Payment.js'
import { Reservation } from '../models/Reservation.js'
import { MoniteurPayout } from '../models/MoniteurPayout.js'
import { removeSubscription, saveSubscription } from '../services/push.js'
import { sanitizeMapsUrl } from '../utils/mapsUrl.js'
import { User } from '../models/User.js'
import {
  Moniteur,
  MONITEUR_BIO_MAX,
  MONITEUR_PHOTOS_MAX,
} from '../models/Moniteur.js'
import { requireMoniteurAuth } from '../middleware/moniteurAuth.js'
import { passwordPolicyError } from '../middleware/security.js'
import { normalizeBeninPhone } from '../services/fedapay.js'
import { getPlatformFeePercent } from '../utils/platformSettings.js'
import { imageUpload } from '../middleware/upload.js'
import { notifyUser } from '../services/notifications.js'
import { uploadImageBuffer } from '../services/cloudinary.js'
import { logger } from '../utils/logger.js'
import {
  isValidHhMm,
  normalizeTime,
  timeToMinutes,
} from '../utils/availability.js'
import { computeCreneauHeures } from '../utils/creneauDuration.js'
import { normalizeVehicleType } from '../utils/localDate.js'
import { sanitizePublicUrl, sanitizePublicUrlList } from '../utils/publicUrl.js'
import {
  computeMoniteurEarnings,
  normalizeWeeklyAvailability,
} from '../utils/moniteurEarnings.js'

const router = Router()
router.use(requireMoniteurAuth)

const ACTIVE_RESERVATION_STATUSES = ['pending_payment', 'pending_moniteur', 'confirmed']

function asObjectId(value) {
  if (!value) return null
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value)
  }
  return null
}

function profilePayload(m) {
  return {
    id: String(m._id),
    firstName: m.firstName,
    lastName: m.lastName,
    fullName: `${m.firstName} ${m.lastName}`.trim(),
    email: m.email || '',
    phone: m.phone || '',
    city: m.city || '',
    bio: m.bio || '',
    photoUrl: m.photoUrl || '',
    vehicleBrand: m.vehicleBrand || '',
    meetingPointUrl: m.meetingPointUrl || '',
    meetingPointNote: m.meetingPointNote || '',
    vehiclePhotoUrl: m.vehiclePhotoUrl || '',
    vehicleTypes: m.vehicleTypes || [],
    specialties: m.specialties || [],
    photos: m.photos || [],
    defaultPriceFcfa: m.defaultPriceFcfa || 5000,
    activeLogin: Boolean(m.activeLogin),
    lastLoginAt: m.lastLoginAt || null,
  }
}

function parseVehicleTypes(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return ['voiture']
  const cleaned = [
    ...new Set(
      raw
        .map((item) => normalizeVehicleType(item, ''))
        .filter((item) => item.length >= 2),
    ),
  ]
  return cleaned.length > 0 ? cleaned : ['voiture']
}

function parseUrlList(raw, max) {
  return sanitizePublicUrlList(raw, max)
}

function hydrateReservation(item) {
  const user = item.userId
  const creneau = item.creneauId
  return item.toJSONSafe({
    user: user
      ? {
          id: String(user._id || user),
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phone || '',
          email: user.email || '',
        }
      : null,
    creneau: creneau?.toJSONSafe?.() ?? null,
  })
}

async function flagMobileMoneyRefundIfNeeded(reservation) {
  if (reservation.heuresDebitees > 0) return
  if (reservation.paymentStatus !== 'paid') return
  if (!reservation.bookingGroupId) return
  if (String(reservation.paymentRef || '') === 'solde_heures') return

  const payment = await Payment.findOne({
    reservationGroupId: reservation.bookingGroupId,
    method: 'fedapay',
  }).sort({ createdAt: -1 })

  if (!payment) return
  if (payment.needsRefund) return

  payment.needsRefund = true
  payment.errorMessage =
    payment.errorMessage ||
    'Réservation refusée par le moniteur après paiement — remboursement Mobile Money requis'
  await payment.save()
  logger.warn('Remboursement MM à traiter après refus moniteur', {
    paymentId: String(payment._id),
    reservationId: String(reservation._id),
  })
}

/** Liste des créneaux du moniteur (futurs + récents). */
router.get('/creneaux', async (req, res) => {
  try {
    const from = String(req.query.from || '').slice(0, 10)
    const filter = { moniteurId: req.moniteur._id }
    if (from) filter.date = { $gte: from }

    const creneaux = await Creneau.find(filter).sort({ date: 1, startTime: 1 }).limit(500)

    const ids = creneaux.map((item) => item._id)
    const activeHolds = await Reservation.find({
      creneauId: { $in: ids },
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    }).select('creneauId status')

    const holdByCreneau = new Map(
      activeHolds.map((item) => [String(item.creneauId), item.status]),
    )

    res.json({
      success: true,
      data: {
        creneaux: creneaux.map((item) => ({
          ...item.toJSONSafe(),
          reservationStatus: holdByCreneau.get(String(item._id)) || null,
          editable: !holdByCreneau.has(String(item._id)) && item.status === 'libre',
        })),
      },
    })
  } catch (error) {
    logger.error('Erreur liste créneaux moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/creneaux', async (req, res) => {
  try {
    const date = String(req.body.date || '').trim().slice(0, 10)
    const startTime = normalizeTime(req.body.startTime)
    const endTime = normalizeTime(req.body.endTime)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidHhMm(startTime) || !isValidHhMm(endTime)) {
      return res.status(400).json({
        success: false,
        error: 'Date, heure de début et heure de fin requises',
      })
    }
    if (!(timeToMinutes(endTime) > timeToMinutes(startTime))) {
      return res.status(400).json({ success: false, error: 'L’heure de fin doit être après le début' })
    }

    const heures = computeCreneauHeures({ startTime, endTime })
    if (heures < 0.5) {
      return res.status(400).json({ success: false, error: 'Durée minimale : 30 minutes' })
    }
    if (heures > 6) {
      return res.status(400).json({ success: false, error: 'Durée maximale : 6 heures' })
    }

    const vehicleType = normalizeVehicleType(
      req.body.vehicleType ||
        (Array.isArray(req.moniteur.vehicleTypes) && req.moniteur.vehicleTypes[0]) ||
        'voiture',
    )
    const hourly = req.moniteur.defaultPriceFcfa || 5000

    let creneau
    try {
      creneau = await Creneau.create({
        moniteurId: req.moniteur._id,
        date,
        startTime,
        endTime,
        vehicleType,
        status: 'libre',
        priceFcfa: Math.round(hourly * heures),
        lockedUntil: null,
        lockedBy: null,
      })
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Un créneau commence déjà à cette heure ce jour-là',
        })
      }
      throw error
    }

    res.status(201).json({
      success: true,
      data: { creneau: { ...creneau.toJSONSafe(), editable: true, reservationStatus: null } },
    })
  } catch (error) {
    logger.error('Erreur création créneau moniteur:', error)
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/creneaux/:id', async (req, res) => {
  try {
    const creneau = await Creneau.findOne({ _id: req.params.id, moniteurId: req.moniteur._id })
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }

    const active = await Reservation.exists({
      creneauId: creneau._id,
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    })
    if (active || creneau.status !== 'libre') {
      return res.status(400).json({
        success: false,
        error: 'Ce créneau est réservé et ne peut plus être modifié',
      })
    }

    const date =
      req.body.date !== undefined ? String(req.body.date || '').trim().slice(0, 10) : creneau.date
    const startTime =
      req.body.startTime !== undefined ? normalizeTime(req.body.startTime) : creneau.startTime
    const endTime =
      req.body.endTime !== undefined ? normalizeTime(req.body.endTime) : creneau.endTime

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidHhMm(startTime) || !isValidHhMm(endTime)) {
      return res.status(400).json({ success: false, error: 'Horaires invalides' })
    }
    if (!(timeToMinutes(endTime) > timeToMinutes(startTime))) {
      return res.status(400).json({ success: false, error: 'L’heure de fin doit être après le début' })
    }

    const heures = computeCreneauHeures({ startTime, endTime })
    if (heures < 0.5 || heures > 6) {
      return res.status(400).json({ success: false, error: 'Durée entre 30 minutes et 6 heures' })
    }

    creneau.date = date
    creneau.startTime = startTime
    creneau.endTime = endTime
    creneau.priceFcfa = Math.round((req.moniteur.defaultPriceFcfa || 5000) * heures)
    if (req.body.vehicleType !== undefined) {
      creneau.vehicleType = normalizeVehicleType(req.body.vehicleType)
    }

    try {
      await creneau.save()
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          error: 'Un créneau commence déjà à cette heure ce jour-là',
        })
      }
      throw error
    }

    res.json({
      success: true,
      data: { creneau: { ...creneau.toJSONSafe(), editable: true, reservationStatus: null } },
    })
  } catch (error) {
    logger.error('Erreur maj créneau moniteur:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/creneaux/:id', async (req, res) => {
  try {
    const creneau = await Creneau.findOne({ _id: req.params.id, moniteurId: req.moniteur._id })
    if (!creneau) {
      return res.status(404).json({ success: false, error: 'Créneau introuvable' })
    }

    const active = await Reservation.exists({
      creneauId: creneau._id,
      status: { $in: ACTIVE_RESERVATION_STATUSES },
    })
    if (active || creneau.status !== 'libre') {
      return res.status(400).json({
        success: false,
        error: 'Ce créneau est réservé et ne peut plus être supprimé',
      })
    }

    await creneau.deleteOne()
    res.json({ success: true, data: { deleted: true, id: String(req.params.id) } })
  } catch (error) {
    logger.error('Erreur suppression créneau moniteur:', error)
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

/** Demandes payées en attente de validation moniteur. */
router.get('/reservations/pending', async (req, res) => {
  try {
    const reservations = await Reservation.find({
      moniteurId: req.moniteur._id,
      status: 'pending_moniteur',
    })
      .sort({ createdAt: 1 })
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    res.json({
      success: true,
      data: { reservations: reservations.map(hydrateReservation) },
    })
  } catch (error) {
    logger.error('Erreur RDV moniteur pending:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/reservations/:id/confirm', async (req, res) => {
  try {
    const reservation = await Reservation.findOneAndUpdate(
      {
        _id: req.params.id,
        moniteurId: req.moniteur._id,
        status: 'pending_moniteur',
      },
      { $set: { status: 'confirmed' } },
      { new: true },
    )
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Demande introuvable ou déjà traitée',
      })
    }

    if (reservation.creneauId?._id || reservation.creneauId) {
      await refreshCreneauState(reservation.creneauId._id || reservation.creneauId)
    }

    if (reservation.userId) {
      await notifyUser(reservation.userId._id || reservation.userId, {
        type: 'reservation_confirmed',
        title: 'Leçon confirmée',
        body: 'Ton moniteur a confirmé ta séance de conduite.',
        link: 'conduite/reservations',
      })
    }

    res.json({ success: true, data: { reservation: hydrateReservation(reservation) } })
  } catch (error) {
    logger.error('Erreur confirm moniteur:', error)
    res.status(500).json({ success: false, error: 'Confirmation impossible' })
  }
})

router.post('/reservations/:id/refuse', async (req, res) => {
  try {
    const reason = String(req.body.reason || req.body.cancellationReason || '').trim()
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      moniteurId: req.moniteur._id,
      status: 'pending_moniteur',
    }).populate('creneauId')

    if (!reservation) {
      return res.status(404).json({
        success: false,
        error: 'Demande introuvable ou déjà traitée',
      })
    }

    const shouldRefundHours = reservation.heuresDebitees > 0

    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = reason || 'Refusée par le moniteur'
    reservation.cancelledBy = 'moniteur'
    await reservation.save()

    if (shouldRefundHours) {
      await User.findByIdAndUpdate(reservation.userId, {
        $inc: { soldeHeures: reservation.heuresDebitees },
      })
    } else {
      await flagMobileMoneyRefundIfNeeded(reservation)
    }

    if (reservation.creneauId?._id || reservation.creneauId) {
      await refreshCreneauState(reservation.creneauId._id || reservation.creneauId)
    }

    if (reservation.userId) {
      await notifyUser(reservation.userId, {
        type: 'reservation_cancelled',
        title: 'Réservation refusée',
        body:
          reservation.cancellationReason ||
          'Le moniteur a refusé ta demande. Les heures / le paiement seront remboursés.',
        link: 'conduite/reservations',
      })
    }

    const hydrated = await Reservation.findById(reservation._id)
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    res.json({ success: true, data: { reservation: hydrateReservation(hydrated) } })
  } catch (error) {
    logger.error('Erreur refus moniteur:', error)
    res.status(500).json({ success: false, error: 'Refus impossible' })
  }
})

/** Historique (confirmées, refusées, effectuées). */
router.get('/reservations/history', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim()
    const filter = {
      moniteurId: req.moniteur._id,
      status: { $in: ['confirmed', 'cancelled', 'completed'] },
    }
    if (status && ['confirmed', 'cancelled', 'completed'].includes(status)) {
      filter.status = status
    }

    const reservations = await Reservation.find(filter)
      .sort({ updatedAt: -1 })
      .limit(300)
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    res.json({
      success: true,
      data: { reservations: reservations.map(hydrateReservation) },
    })
  } catch (error) {
    logger.error('Erreur historique moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Réservations confirmées à venir (+ optionnellement pending). */
router.get('/reservations', async (req, res) => {
  try {
    const scope = String(req.query.scope || 'upcoming').trim()
    const filter = { moniteurId: req.moniteur._id }

    if (scope === 'pending') {
      filter.status = 'pending_moniteur'
    } else if (scope === 'confirmed') {
      filter.status = 'confirmed'
    } else if (scope === 'all_active') {
      filter.status = { $in: ['pending_moniteur', 'confirmed'] }
    } else {
      filter.status = { $in: ['pending_moniteur', 'confirmed'] }
    }

    const reservations = await Reservation.find(filter)
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('userId', 'firstName lastName phone email')
      .populate('creneauId')

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const sorted = reservations
      .map(hydrateReservation)
      .sort((a, b) => {
        const da = a.creneau?.date || ''
        const db = b.creneau?.date || ''
        if (da !== db) return da.localeCompare(db)
        return String(a.creneau?.startTime || '').localeCompare(String(b.creneau?.startTime || ''))
      })

    res.json({
      success: true,
      data: {
        reservations: sorted,
        today: todayStr,
      },
    })
  } catch (error) {
    logger.error('Erreur liste réservations moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/dashboard', async (req, res) => {
  try {
    const moniteurId = req.moniteur._id
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const [pending, confirmed, cancelled, completed, earnings] = await Promise.all([
      Reservation.find({ moniteurId, status: 'pending_moniteur' })
        .sort({ createdAt: 1 })
        .limit(20)
        .populate('userId', 'firstName lastName phone email')
        .populate('creneauId'),
      Reservation.find({ moniteurId, status: 'confirmed' })
        .populate('userId', 'firstName lastName phone email')
        .populate('creneauId'),
      Reservation.countDocuments({ moniteurId, status: 'cancelled' }),
      Reservation.countDocuments({ moniteurId, status: 'completed' }),
      computeMoniteurEarnings(moniteurId),
    ])

    const upcoming = confirmed
      .filter((item) => {
        const date = item.creneauId?.date
        return date && date >= todayStr
      })
      .sort((a, b) => {
        const da = a.creneauId?.date || ''
        const db = b.creneauId?.date || ''
        if (da !== db) return da.localeCompare(db)
        return String(a.creneauId?.startTime || '').localeCompare(String(b.creneauId?.startTime || ''))
      })

    const todaySessions = upcoming.filter((item) => item.creneauId?.date === todayStr)

    res.json({
      success: true,
      data: {
        stats: {
          pending: pending.length,
          confirmedUpcoming: upcoming.length,
          confirmedTotal: confirmed.length,
          completed,
          cancelled,
          hoursCompleted: earnings.totals.hoursCompleted,
          totalEarned: earnings.totals.totalEarned,
          monthEarned: earnings.totals.monthEarned,
          totalPaid: earnings.totals.totalPaid,
          outstanding: earnings.totals.outstanding,
          weeklySlots: (req.moniteur.weeklyAvailability || []).length,
        },
        pending: pending.map(hydrateReservation),
        upcoming: upcoming.slice(0, 12).map(hydrateReservation),
        today: todaySessions.map(hydrateReservation),
        earnings: earnings.totals,
        // Part du prix de chaque séance reversée au moniteur (le reste est la commission de la plateforme).
        sharePercent: 100 - (await getPlatformFeePercent()),
      },
    })
  } catch (error) {
    logger.error('Erreur dashboard moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/availability', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        weeklyAvailability: req.moniteur.weeklyAvailability || [],
      },
    })
  } catch (error) {
    logger.error('Erreur lecture dispo moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.put('/availability', async (req, res) => {
  try {
    const slots = normalizeWeeklyAvailability(req.body.weeklyAvailability ?? req.body.slots)
    req.moniteur.weeklyAvailability = slots
    await req.moniteur.save()
    res.json({
      success: true,
      data: { weeklyAvailability: req.moniteur.weeklyAvailability || [] },
    })
  } catch (error) {
    logger.error('Erreur maj dispo moniteur:', error)
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

router.get('/profile', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { profile: profilePayload(req.moniteur) },
    })
  } catch (error) {
    logger.error('Erreur profil moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.patch('/profile', async (req, res) => {
  try {
    const m = req.moniteur

    if (req.body.firstName !== undefined) {
      const value = String(req.body.firstName || '').trim()
      if (value.length < 2) return res.status(400).json({ success: false, error: 'Prénom requis' })
      m.firstName = value.slice(0, 60)
    }
    if (req.body.lastName !== undefined) {
      const value = String(req.body.lastName || '').trim()
      if (value.length < 1) return res.status(400).json({ success: false, error: 'Nom requis' })
      m.lastName = value.slice(0, 60)
    }
    if (req.body.phone !== undefined) {
      const raw = String(req.body.phone || '').trim()
      const phone = raw ? normalizeBeninPhone(raw) : ''
      if (raw && !phone) {
        return res.status(400).json({ success: false, error: 'Numéro de téléphone invalide' })
      }
      if (phone && (await Moniteur.exists({ phone, _id: { $ne: m._id } }))) {
        return res.status(409).json({ success: false, error: 'Ce numéro est déjà utilisé par un moniteur' })
      }
      m.phone = phone
    }
    if (req.body.city !== undefined) m.city = String(req.body.city || '').trim()
    if (req.body.bio !== undefined) {
      m.bio = String(req.body.bio || '').trim().slice(0, MONITEUR_BIO_MAX)
    }
    if (req.body.photoUrl !== undefined) m.photoUrl = sanitizePublicUrl(req.body.photoUrl)
    if (req.body.vehicleBrand !== undefined) {
      m.vehicleBrand = String(req.body.vehicleBrand || '').trim()
    }
    if (req.body.meetingPointUrl !== undefined) {
      const raw = String(req.body.meetingPointUrl || '').trim()
      const url = sanitizeMapsUrl(raw)
      if (raw && !url) {
        return res.status(400).json({
          success: false,
          error: 'Lien Google Maps invalide. Ouvrez Google Maps, touchez « Partager » puis « Copier le lien ».',
        })
      }
      m.meetingPointUrl = url
    }
    if (req.body.meetingPointNote !== undefined) {
      m.meetingPointNote = String(req.body.meetingPointNote || '').trim().slice(0, 300)
    }
    if (req.body.vehiclePhotoUrl !== undefined) {
      m.vehiclePhotoUrl = sanitizePublicUrl(req.body.vehiclePhotoUrl)
    }
    if (req.body.vehicleTypes !== undefined) {
      m.vehicleTypes = parseVehicleTypes(req.body.vehicleTypes)
    }
    if (req.body.specialties !== undefined) {
      m.specialties = Array.isArray(req.body.specialties)
        ? req.body.specialties.map((item) => String(item).trim()).filter(Boolean)
        : []
    }
    if (req.body.photos !== undefined) {
      m.photos = parseUrlList(req.body.photos, MONITEUR_PHOTOS_MAX)
    }
    // Le tarif horaire est fixé par l'administration : toute valeur envoyée ici est ignorée.

    const currentPassword = String(req.body.currentPassword || '')
    const newPassword = String(req.body.newPassword || req.body.password || '')
    if (newPassword) {
      const pwdError = passwordPolicyError(newPassword)
      if (pwdError) {
        return res.status(400).json({ success: false, error: pwdError })
      }
      const secret = await Moniteur.findById(m._id).select('+passwordHash')
      const ok = secret ? await secret.comparePassword(currentPassword) : false
      if (!ok) {
        return res.status(400).json({ success: false, error: 'Mot de passe actuel incorrect' })
      }
      await m.setPassword(newPassword)
    }

    await m.save()
    res.json({
      success: true,
      data: {
        moniteur: m.toAuthJSON(),
        profile: profilePayload(m),
      },
    })
  } catch (error) {
    logger.error('Erreur maj profil moniteur:', error)
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.post('/upload-photo', (req, res) => {
  imageUpload.single('photo')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'Fichier invalide' })
    }
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ success: false, error: 'Aucune photo fournie' })
      }
      const uploaded = await uploadImageBuffer(req.file.buffer, {
        folder: 'monpermis/moniteurs',
      })
      res.json({
        success: true,
        data: {
          imageUrl: uploaded.imageUrl,
          imagePublicId: uploaded.imagePublicId,
        },
      })
    } catch (uploadErr) {
      logger.error('Upload photo moniteur:', uploadErr)
      res.status(500).json({
        success: false,
        error: uploadErr.message || 'Enregistrement photo impossible',
      })
    }
  })
})

/** Le moniteur active les notifications sur cet appareil. */
router.post('/push/subscribe', async (req, res) => {
  try {
    await saveSubscription('moniteur', req.moniteur._id, req.body || {}, req.get('user-agent'))
    res.json({ success: true, data: { subscribed: true } })
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.status ? error.message : 'Enregistrement impossible' })
  }
})

router.post('/push/unsubscribe', async (req, res) => {
  try {
    res.json({ success: true, data: { removed: await removeSubscription('moniteur', req.moniteur._id, req.body || {}) } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Désactivation impossible' })
  }
})

/** Le moniteur confirme avoir reçu un versement enregistré par l'administration. */
router.post('/payouts/:id/confirm', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Identifiant invalide' })
    }
    const payout = await MoniteurPayout.findOneAndUpdate(
      { _id: req.params.id, moniteurId: req.moniteur._id, status: 'pending' },
      { $set: { status: 'confirmed', confirmedAt: new Date(), declinedAt: null, declineReason: '' } },
      { new: true },
    )
    if (!payout) {
      return res.status(404).json({ success: false, error: 'Versement introuvable ou déjà traité' })
    }
    res.json({ success: true, data: { payout: payout.toJSONSafe() } })
  } catch (error) {
    logger.error('Erreur confirmation versement:', error)
    res.status(500).json({ success: false, error: 'Confirmation impossible' })
  }
})

/** Le moniteur déclare ne pas avoir reçu le versement : les séances repassent « à régler » côté administration. */
router.post('/payouts/:id/decline', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Identifiant invalide' })
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 300)
    const payout = await MoniteurPayout.findOneAndUpdate(
      { _id: req.params.id, moniteurId: req.moniteur._id, status: 'pending' },
      { $set: { status: 'declined', declinedAt: new Date(), declineReason: reason } },
      { new: true },
    )
    if (!payout) {
      return res.status(404).json({ success: false, error: 'Versement introuvable ou déjà traité' })
    }
    await Reservation.updateMany(
      { payoutId: payout._id },
      { $set: { settlementStatus: 'due', settledAt: null, payoutId: null } },
    )
    res.json({ success: true, data: { payout: payout.toJSONSafe() } })
  } catch (error) {
    logger.error('Erreur contestation versement:', error)
    res.status(500).json({ success: false, error: 'Enregistrement impossible' })
  }
})

router.get('/earnings', async (req, res) => {
  try {
    const earnings = await computeMoniteurEarnings(req.moniteur._id)
    res.json({ success: true, data: earnings })
  } catch (error) {
    logger.error('Erreur revenus moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
