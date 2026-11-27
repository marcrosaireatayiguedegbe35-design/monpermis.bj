import mongoose from 'mongoose'
import { Creneau } from './Creneau.js'

const reservationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    moniteurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Moniteur',
      required: true,
    },
    creneauId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Creneau',
      required: true,
      index: true,
    },
    vehicleType: {
      type: String,
      default: 'voiture',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending_payment', 'pending_moniteur', 'confirmed', 'cancelled', 'completed'],
      default: 'pending_payment',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending_validation', 'paid', 'refunded'],
      default: 'unpaid',
    },
    /** solo = créneau exclusif (5000 F/h) · group = places partagées (2000 F/h). */
    mode: { type: String, enum: ['solo', 'group'], default: 'solo', index: true },
    paymentRef: { type: String, default: '', trim: true },
    /** Regroupe les créneaux consécutifs d'une même réservation multi-heures (facture/paiement communs). */
    bookingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    priceFcfa: { type: Number, default: 0 },
    /** Heures prépayées débitées de soldeHeures à la réservation (pour recrédit exact si annulation). */
    heuresDebitees: { type: Number, default: 0 },
    reminderSentAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    /** Motif d’annulation fourni par l’élève (ou l’admin). */
    cancellationReason: { type: String, default: '', trim: true },
    cancelledBy: {
      type: String,
      enum: ['', 'learner', 'admin', 'moniteur'],
      default: '',
    },
    /** Fin de séance : calculée à la complétion, jamais modifiée ensuite. */
    completedAt: { type: Date, default: null },
    platformFeePercent: { type: Number, default: null },
    platformFeeFcfa: { type: Number, default: null },
    moniteurShareFcfa: { type: Number, default: null },
    /** none = pas encore terminée · due = à régler au moniteur · settled = réglée. */
    settlementStatus: { type: String, enum: ['none', 'due', 'settled'], default: 'none', index: true },
    settlementDueAt: { type: Date, default: null },
    settledAt: { type: Date, default: null },
    payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'MoniteurPayout', default: null },
    /** Invitation à donner son avis (notification envoyée à l'apprenant). */
    reviewRequestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

/** Un seul créneau actif en solo à la fois (les réservations de groupe peuvent coexister). */
reservationSchema.index(
  { creneauId: 1 },
  {
    unique: true,
    name: 'creneauId_active_unique',
    partialFilterExpression: {
      status: { $in: ['pending_payment', 'pending_moniteur', 'confirmed'] },
      mode: 'solo',
    },
  },
)

function refId(value) {
  if (value == null) return null
  if (typeof value === 'object' && value._id != null) return String(value._id)
  return String(value)
}

reservationSchema.methods.toJSONSafe = function toJSONSafe(extras = {}) {
  return {
    id: String(this._id),
    userId: refId(this.userId),
    moniteurId: refId(this.moniteurId),
    creneauId: refId(this.creneauId),
    vehicleType: this.vehicleType,
    status: this.status,
    mode: this.mode || 'solo',
    paymentStatus: this.paymentStatus,
    paymentRef: this.paymentRef || '',
    bookingGroupId: this.bookingGroupId ? String(this.bookingGroupId) : null,
    priceFcfa: this.priceFcfa || 0,
    heuresDebitees: this.heuresDebitees || 0,
    reminderSentAt: this.reminderSentAt,
    cancelledAt: this.cancelledAt,
    cancellationReason: this.cancellationReason || '',
    cancelledBy: this.cancelledBy || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    ...extras,
  }
}

export const Reservation = mongoose.model('Reservation', reservationSchema)

/** Migre l’ancien index unique strict vers l’index partiel (actif uniquement). */
export async function ensureReservationIndexes() {
  try {
    await Reservation.updateMany({ mode: { $exists: false } }, { $set: { mode: 'solo' } })
    await Creneau.updateMany({ mode: { $exists: false } }, { $set: { mode: '' } })
  } catch (error) {
    console.warn('Migration mode réservations:', error.message)
  }
  try {
    const stale = (await Reservation.collection.indexes()).find(
      (idx) =>
        idx.name === 'creneauId_active_unique' &&
        !JSON.stringify(idx.partialFilterExpression || {}).includes('"mode"'),
    )
    if (stale) await Reservation.collection.dropIndex('creneauId_active_unique')
  } catch (error) {
    console.warn('Index réservations (ancien partiel):', error.message)
  }
  try {
    const indexes = await Reservation.collection.indexes()
    const legacy = indexes.find(
      (idx) =>
        idx.name === 'creneauId_1' &&
        idx.unique &&
        !idx.partialFilterExpression,
    )
    if (legacy?.name) {
      await Reservation.collection.dropIndex(legacy.name)
    }
  } catch (error) {
    if (error?.code !== 27 && error?.codeName !== 'IndexNotFound') {
      console.warn('Index réservations (drop legacy):', error.message)
    }
  }
  try {
    await Reservation.syncIndexes()
  } catch (error) {
    console.warn('Index réservations (sync):', error.message)
  }
}
