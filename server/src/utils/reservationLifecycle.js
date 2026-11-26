import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { User } from '../models/User.js'
import { computeCreneauHeures } from './creneauDuration.js'
import { logger } from './logger.js'
import { notifyUser } from '../services/notifications.js'
import { getPlatformFeePercent, settlementDueAt, splitSessionPrice } from './platformSettings.js'

/** Délai après la fin du créneau avant auto-complétion (admin oubli « completed »). */
const COMPLETE_GRACE_MS = 30 * 60 * 1000

function slotDateTime(date, time) {
  return new Date(`${date}T${time}:00`)
}

/**
 * Incrémente heuresEffectuees (et solde si ancien flux heuresDebitees=0).
 * À appeler uniquement lors d’une transition confirmed → completed.
 */
export async function creditHeuresEffectueesForCompletion(reservation) {
  if (!reservation?.userId) return { heures: 0 }

  if (reservation.heuresDebitees > 0) {
    await User.findByIdAndUpdate(reservation.userId, {
      $inc: { heuresEffectuees: reservation.heuresDebitees },
    })
    return { heures: reservation.heuresDebitees }
  }

  const creneau = reservation.creneauId
    ? reservation.creneauId.startTime
      ? reservation.creneauId
      : await Creneau.findById(reservation.creneauId)
    : null
  const heures = computeCreneauHeures(creneau)
  await User.findByIdAndUpdate(reservation.userId, {
    $inc: { heuresEffectuees: heures, soldeHeures: -heures },
  })
  logger.info('Heures auto-incrémentées (ancien flux)', {
    userId: String(reservation.userId),
    heures,
  })
  return { heures }
}

/** Champs de règlement figés à la fin d'une séance (part moniteur, commission, échéance). */
export async function completionFieldsFor(reservation, creneau) {
  const feePercent = await getPlatformFeePercent()
  const split = splitSessionPrice(reservation.priceFcfa, feePercent)
  const completedAt = new Date()
  return {
    completedAt,
    platformFeePercent: feePercent,
    platformFeeFcfa: split.platformFeeFcfa,
    moniteurShareFcfa: split.moniteurShareFcfa,
    settlementStatus: 'due',
    settlementDueAt: settlementDueAt(creneau?.date, completedAt),
    reviewRequestedAt: completedAt,
  }
}

/** Invite l'apprenant à donner son avis (facultatif, vu uniquement par l'administration). */
export function requestSessionReview(reservation, creneau) {
  return notifyUser(reservation.userId, {
    type: 'session_review',
    title: 'Comment s’est passée votre séance ?',
    body: creneau?.date
      ? `Séance du ${creneau.date} de ${creneau.startTime} à ${creneau.endTime} : donnez votre avis en 30 secondes.`
      : 'Donnez votre avis sur votre séance en 30 secondes.',
    link: `avis/${reservation._id}`,
  })
}

/**
 * Marque les réservations confirmées + payées dont le créneau est passé (+ grâce)
 * comme completed, et crédite heuresEffectuees. Idempotent via claim atomique du statut.
 */
export async function completePastConfirmedReservations() {
  const reservations = await Reservation.find({
    status: 'confirmed',
    paymentStatus: 'paid',
  }).populate('creneauId')

  const now = Date.now()
  let completed = 0

  for (const reservation of reservations) {
    const creneau = reservation.creneauId
    if (!creneau?.date || !creneau?.endTime) continue

    const endAt = slotDateTime(creneau.date, creneau.endTime).getTime()
    if (Number.isNaN(endAt) || now < endAt + COMPLETE_GRACE_MS) continue

    const fields = await completionFieldsFor(reservation, creneau)
    const updated = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: 'confirmed' },
      { $set: { status: 'completed', ...fields } },
      { new: true },
    )
    if (!updated) continue

    try {
      await creditHeuresEffectueesForCompletion({
        ...updated.toObject(),
        creneauId: creneau,
      })
      completed += 1
      void requestSessionReview(updated, creneau)
    } catch (error) {
      // Rollback statut pour retenter au prochain tick
      await Reservation.findByIdAndUpdate(updated._id, {
        $set: { status: 'confirmed', settlementStatus: 'none', settlementDueAt: null },
      })
      logger.error('Auto-complétion réservation échouée', {
        reservationId: String(updated._id),
        error: error.message,
      })
    }
  }

  return { completed }
}
