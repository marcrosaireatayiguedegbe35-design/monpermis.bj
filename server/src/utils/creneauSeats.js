import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'

/** Tarifs de conduite par heure selon le mode. */
export const SOLO_PRICE_PER_HOUR = 5000
/** Séance de groupe : un bloc de 2 h pour 4 élèves, 30 min de conduite chacun. */
export const GROUP_PRICE_PER_SEAT = 2000
export const GROUP_BLOCK_HOURS = 2
export const GROUP_DRIVING_HOURS = 0.5
/** Nombre d'élèves d'un groupe. */
export const GROUP_CAPACITY = Math.max(2, Number(process.env.GROUP_CAPACITY) || 4)

/** Prix d'une séance solo : tarif horaire × durée (30 min ou 1 h). */
export function soloAmount(hours) {
  return Math.round(SOLO_PRICE_PER_HOUR * (Number(hours) || 0))
}

export const ACTIVE_STATUSES = ['pending_payment', 'pending_moniteur', 'confirmed']

export function normalizeBookingMode(value) {
  return value === 'group' ? 'group' : 'solo'
}

/** Nombre de places de groupe prises (réservations actives) sur un créneau. */
export async function countGroupSeats(creneauId) {
  return Reservation.countDocuments({
    creneauId,
    mode: 'group',
    status: { $in: ACTIVE_STATUSES },
  })
}

/**
 * Recalcule l'état d'un créneau à partir de ses réservations actives :
 * - aucune : libre, sans mode
 * - une réservation solo : réservé (exclusif)
 * - réservations de groupe : libre tant qu'il reste des places, réservé quand c'est plein
 */
export async function refreshCreneauState(creneauId) {
  if (!creneauId) return null
  const id = creneauId._id || creneauId
  const slot = await Creneau.findById(id).select('groupBlock').lean()
  const active = await Reservation.find({ creneauId: id, status: { $in: ACTIVE_STATUSES } })
    .select('mode')
    .lean()
  let set
  if (!active.length) {
    // Un bloc de groupe publié par le moniteur reste un bloc de groupe, même vide.
    set = { status: 'libre', mode: slot?.groupBlock ? 'group' : '', lockedUntil: null, lockedBy: null }
  } else if (active.some((r) => (r.mode || 'solo') === 'solo')) {
    set = { status: 'reserve', mode: 'solo', lockedUntil: null, lockedBy: null }
  } else {
    set = { status: active.length >= GROUP_CAPACITY ? 'reserve' : 'libre', mode: 'group' }
  }
  return Creneau.findByIdAndUpdate(id, { $set: set }, { new: true })
}
