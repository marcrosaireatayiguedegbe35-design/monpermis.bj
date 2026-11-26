import mongoose from 'mongoose'

const score = { type: Number, min: 1, max: 5, required: true }

/**
 * Avis donné par l'apprenant après une séance de conduite terminée.
 * Visible uniquement par l'administration : le moniteur ne le voit jamais.
 */
const sessionReviewSchema = new mongoose.Schema(
  {
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    moniteurId: { type: mongoose.Schema.Types.ObjectId, ref: 'Moniteur', required: true, index: true },
    /** Note globale. */
    rating: score,
    /** Réponses aux questions de la séance. */
    punctuality: score,
    pedagogy: score,
    vehicle: score,
    wouldRecommend: { type: Boolean, default: true },
    comment: { type: String, default: '', trim: true, maxlength: 1000 },
  },
  { timestamps: true },
)

export const SessionReview = mongoose.model('SessionReview', sessionReviewSchema)
