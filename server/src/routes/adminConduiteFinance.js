import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Moniteur } from '../models/Moniteur.js'
import { MoniteurPayout } from '../models/MoniteurPayout.js'
import { Payment } from '../models/Payment.js'
import { Reservation } from '../models/Reservation.js'
import { SessionReview } from '../models/SessionReview.js'
import { getPlatformFeePercent, setPlatformFeePercent } from '../utils/platformSettings.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

const personName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '')

/* ------------------------------------------------------------------ */
/* Avis des apprenants (vus uniquement par l'administration)           */
/* ------------------------------------------------------------------ */

router.get('/reviews', async (req, res) => {
  try {
    const filter = {}
    if (req.query.moniteurId && mongoose.Types.ObjectId.isValid(req.query.moniteurId)) {
      filter.moniteurId = new mongoose.Types.ObjectId(req.query.moniteurId)
    }
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))

    const [rows, stats] = await Promise.all([
      SessionReview.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'firstName lastName phone')
        .populate('moniteurId', 'firstName lastName')
        .populate({ path: 'reservationId', select: 'creneauId', populate: { path: 'creneauId', select: 'date startTime endTime' } })
        .lean(),
      SessionReview.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$moniteurId',
            count: { $sum: 1 },
            rating: { $avg: '$rating' },
            punctuality: { $avg: '$punctuality' },
            pedagogy: { $avg: '$pedagogy' },
            vehicle: { $avg: '$vehicle' },
            recommend: { $avg: { $cond: ['$wouldRecommend', 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ])

    const moniteurs = await Moniteur.find({ _id: { $in: stats.map((row) => row._id) } })
      .select('firstName lastName')
      .lean()
    const nameById = new Map(moniteurs.map((m) => [String(m._id), personName(m)]))
    const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10

    res.json({
      success: true,
      data: {
        stats: stats.map((row) => ({
          moniteurId: String(row._id),
          moniteurName: nameById.get(String(row._id)) || 'Moniteur',
          count: row.count,
          rating: round1(row.rating),
          punctuality: round1(row.punctuality),
          pedagogy: round1(row.pedagogy),
          vehicle: round1(row.vehicle),
          recommendPercent: Math.round((row.recommend || 0) * 100),
        })),
        reviews: rows.map((row) => ({
          id: String(row._id),
          createdAt: row.createdAt,
          rating: row.rating,
          punctuality: row.punctuality,
          pedagogy: row.pedagogy,
          vehicle: row.vehicle,
          wouldRecommend: row.wouldRecommend,
          comment: row.comment || '',
          learnerName: personName(row.userId) || 'Apprenant',
          learnerPhone: row.userId?.phone || '',
          moniteurId: row.moniteurId ? String(row.moniteurId._id) : '',
          moniteurName: personName(row.moniteurId) || 'Moniteur',
          date: row.reservationId?.creneauId?.date || '',
          startTime: row.reservationId?.creneauId?.startTime || '',
          endTime: row.reservationId?.creneauId?.endTime || '',
        })),
      },
    })
  } catch (error) {
    logger.error('Erreur liste avis', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/* ------------------------------------------------------------------ */
/* Règlements des moniteurs (le soir, par l'administrateur)            */
/* ------------------------------------------------------------------ */

router.get('/settlements', requireSuperAdmin, async (_req, res) => {
  try {
    const now = new Date()
    const [due, recent, feePercent, awaiting] = await Promise.all([
      Reservation.find({ status: 'completed', settlementStatus: 'due' })
        .sort({ settlementDueAt: 1 })
        .populate('creneauId', 'date startTime endTime')
        .populate('userId', 'firstName lastName')
        .populate('moniteurId', 'firstName lastName phone')
        .lean(),
      Reservation.find({ status: 'completed', settlementStatus: 'settled' })
        .sort({ settledAt: -1 })
        .limit(20)
        .populate('creneauId', 'date startTime endTime')
        .populate('moniteurId', 'firstName lastName')
        .lean(),
      getPlatformFeePercent(),
      MoniteurPayout.find({ status: { $in: ['pending', 'declined'] } })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('moniteurId', 'firstName lastName phone')
        .lean(),
    ])

    const groups = new Map()
    for (const row of due) {
      const key = String(row.moniteurId?._id || row.moniteurId)
      if (!groups.has(key)) {
        groups.set(key, {
          moniteurId: key,
          moniteurName: personName(row.moniteurId) || 'Moniteur',
          phone: row.moniteurId?.phone || '',
          dueNowAmount: 0,
          dueNowCount: 0,
          laterAmount: 0,
          laterCount: 0,
          sessions: [],
        })
      }
      const group = groups.get(key)
      const dueNow = !row.settlementDueAt || new Date(row.settlementDueAt) <= now
      const share = Number(row.moniteurShareFcfa) || 0
      if (dueNow) {
        group.dueNowAmount += share
        group.dueNowCount += 1
      } else {
        group.laterAmount += share
        group.laterCount += 1
      }
      group.sessions.push({
        id: String(row._id),
        date: row.creneauId?.date || '',
        startTime: row.creneauId?.startTime || '',
        endTime: row.creneauId?.endTime || '',
        learnerName: personName(row.userId) || 'Apprenant',
        priceFcfa: Number(row.priceFcfa) || 0,
        moniteurShareFcfa: share,
        platformFeeFcfa: Number(row.platformFeeFcfa) || 0,
        dueAt: row.settlementDueAt,
        dueNow,
        reviewed: Boolean(row.reviewedAt),
      })
    }

    const list = [...groups.values()].sort((a, b) => b.dueNowAmount - a.dueNowAmount)
    res.json({
      success: true,
      data: {
        feePercent,
        totals: {
          dueNowAmount: list.reduce((n, g) => n + g.dueNowAmount, 0),
          dueNowCount: list.reduce((n, g) => n + g.dueNowCount, 0),
          laterAmount: list.reduce((n, g) => n + g.laterAmount, 0),
        },
        moniteurs: list,
        awaitingConfirmation: awaiting.map((row) => ({
          id: String(row._id),
          moniteurName: personName(row.moniteurId) || 'Moniteur',
          amountFcfa: Number(row.amountFcfa) || 0,
          paidAt: row.paidAt || row.createdAt,
          status: row.status,
          declineReason: row.declineReason || '',
        })),
        recentSettled: recent.map((row) => ({
          id: String(row._id),
          moniteurName: personName(row.moniteurId) || 'Moniteur',
          date: row.creneauId?.date || '',
          amount: Number(row.moniteurShareFcfa) || 0,
          settledAt: row.settledAt,
        })),
      },
    })
  } catch (error) {
    logger.error('Erreur règlements', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/** Règle au moniteur les séances dues : crée le versement et marque les séances comme réglées. */
router.post('/settlements/pay', requireSuperAdmin, audit('create', 'moniteur_settlement'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.moniteurId)) {
      return res.status(400).json({ success: false, error: 'Moniteur invalide' })
    }
    const moniteur = await Moniteur.findById(req.body.moniteurId)
    if (!moniteur) return res.status(404).json({ success: false, error: 'Moniteur introuvable' })

    const filter = { moniteurId: moniteur._id, status: 'completed', settlementStatus: 'due' }
    const ids = Array.isArray(req.body.reservationIds)
      ? req.body.reservationIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : []
    if (ids.length) filter._id = { $in: ids }
    else filter.settlementDueAt = { $lte: new Date() }

    const candidates = await Reservation.find(filter).select('_id').lean()
    // Prise en charge atomique : une séance ne peut être réglée qu'une fois.
    const claimed = []
    const settledAt = new Date()
    for (const row of candidates) {
      const doc = await Reservation.findOneAndUpdate(
        { _id: row._id, settlementStatus: 'due' },
        { $set: { settlementStatus: 'settled', settledAt } },
        { new: true },
      )
      if (doc) claimed.push(doc)
    }
    if (!claimed.length) {
      return res.status(409).json({ success: false, error: 'Aucune séance à régler pour ce moniteur' })
    }

    const amountFcfa = claimed.reduce((n, doc) => n + (Number(doc.moniteurShareFcfa) || 0), 0)
    if (amountFcfa < 1) {
      await Reservation.updateMany({ _id: { $in: claimed.map((d) => d._id) } }, { $set: { settlementStatus: 'due', settledAt: null } })
      return res.status(400).json({ success: false, error: 'Montant à régler nul' })
    }

    const payout = await MoniteurPayout.create({
      moniteurId: moniteur._id,
      amountFcfa,
      status: 'pending',
      paidAt: settledAt,
      note: String(req.body.note || `Règlement de ${claimed.length} séance${claimed.length > 1 ? 's' : ''}`).trim().slice(0, 500),
      periodLabel: `Séances du ${settledAt.toLocaleDateString('fr-FR')}`,
      createdByAdminId: req.admin?._id || null,
    })
    await Reservation.updateMany({ _id: { $in: claimed.map((d) => d._id) } }, { $set: { payoutId: payout._id } })

    res.status(201).json({
      success: true,
      data: { payout: payout.toJSONSafe(), settledCount: claimed.length, amountFcfa },
    })
  } catch (error) {
    logger.error('Erreur règlement moniteur', { error: error.message })
    res.status(500).json({ success: false, error: 'Règlement impossible' })
  }
})

router.get('/settings', requireSuperAdmin, async (_req, res) => {
  res.json({ success: true, data: { platformFeePercent: await getPlatformFeePercent() } })
})

router.put('/settings', requireSuperAdmin, audit('update', 'platform_settings'), async (req, res) => {
  try {
    const platformFeePercent = await setPlatformFeePercent(req.body.platformFeePercent, req.admin?._id || null)
    res.json({ success: true, data: { platformFeePercent } })
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message || 'Enregistrement impossible' })
  }
})

/* ------------------------------------------------------------------ */
/* Répartition des revenus : cours du Code / conduite                  */
/* ------------------------------------------------------------------ */

function startOfToday(now) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
function startOfWeek(now) {
  const d = startOfToday(now)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}
function startOfMonth(now) {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

async function revenueSplit(from) {
  const range = from ? { $gte: from } : { $exists: true, $ne: null }
  const payments = await Payment.find({
    status: 'approved',
    needsRefund: { $ne: true },
    activatedAt: range,
  })
    .select('amount accessRequestId accessRequestIds reservationGroupId')
    .lean()

  let reservations = 0
  const requestIds = new Set()
  for (const payment of payments) {
    if (payment.reservationGroupId) reservations += Number(payment.amount) || 0
    for (const id of payment.accessRequestIds || []) requestIds.add(String(id))
    if (payment.accessRequestId) requestIds.add(String(payment.accessRequestId))
  }
  const requests = requestIds.size
    ? await AccessRequest.find({ _id: { $in: [...requestIds] } }).select('module amount').lean()
    : []

  let code = 0
  let hours = 0
  let videos = 0
  let other = 0
  for (const request of requests) {
    const amount = Number(request.amount) || 0
    if (request.module === 'code') code += amount
    else if (request.module === 'conduite_heures') hours += amount
    else if (request.module === 'conduite_videos') videos += amount
    else other += amount
  }
  const conduite = hours + videos + reservations
  return {
    code,
    conduite,
    conduiteDetail: { packsHeures: hours, videos, reservationsDirectes: reservations },
    other,
    total: code + conduite + other,
  }
}

async function sessionsSplit(from) {
  const match = { status: 'completed', ...(from ? { completedAt: { $gte: from } } : {}) }
  const rows = await Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        price: { $sum: { $ifNull: ['$priceFcfa', 0] } },
        platformFee: { $sum: { $ifNull: ['$platformFeeFcfa', 0] } },
        moniteurShare: { $sum: { $ifNull: ['$moniteurShareFcfa', 0] } },
      },
    },
  ])
  const row = rows[0] || {}
  return {
    sessions: row.sessions || 0,
    price: row.price || 0,
    platformFee: row.platformFee || 0,
    moniteurShare: row.moniteurShare || 0,
  }
}

router.get('/revenue-breakdown', requireSuperAdmin, async (_req, res) => {
  try {
    const now = new Date()
    const periods = {
      today: startOfToday(now),
      week: startOfWeek(now),
      month: startOfMonth(now),
      all: null,
    }
    const entries = await Promise.all(
      Object.entries(periods).map(async ([key, from]) => {
        const [revenue, sessions] = await Promise.all([revenueSplit(from), sessionsSplit(from)])
        return [key, { revenue, sessions }]
      }),
    )
    const dueRows = await Reservation.aggregate([
      { $match: { status: 'completed', settlementStatus: 'due' } },
      { $group: { _id: null, amount: { $sum: { $ifNull: ['$moniteurShareFcfa', 0] } }, count: { $sum: 1 } } },
    ])
    res.json({
      success: true,
      data: {
        currency: 'XOF',
        feePercent: await getPlatformFeePercent(),
        periods: Object.fromEntries(entries),
        dueToMoniteurs: { amount: dueRows[0]?.amount || 0, count: dueRows[0]?.count || 0 },
      },
    })
  } catch (error) {
    logger.error('Erreur répartition revenus', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

export default router
