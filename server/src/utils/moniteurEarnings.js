import { MoniteurPayout } from '../models/MoniteurPayout.js'
import { Reservation } from '../models/Reservation.js'
import { computeCreneauHeures } from './creneauDuration.js'
import { getPlatformFeePercent, splitSessionPrice } from './platformSettings.js'

function monthBounds(ref = new Date()) {
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0)
  return { start, end }
}

function previousMonthBounds(ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth() - 1, 15)
  return monthBounds(d)
}

/** Part du moniteur : figée à la fin de séance, sinon calculée avec la commission actuelle (anciennes séances). */
function shareOf(item, feePercent) {
  if (item.moniteurShareFcfa != null) return Number(item.moniteurShareFcfa) || 0
  return splitSessionPrice(item.priceFcfa, feePercent).moniteurShareFcfa
}

function sumShare(items, feePercent) {
  return items.reduce((acc, item) => acc + shareOf(item, feePercent), 0)
}

function sumHours(items) {
  return items.reduce((acc, item) => {
    const creneau = item.creneauId
    if (creneau && typeof creneau === 'object') {
      return acc + computeCreneauHeures(creneau)
    }
    return acc + (Number(item.heuresDebitees) || 0)
  }, 0)
}

function inRange(dateValue, start, end) {
  if (!dateValue) return false
  const t = new Date(dateValue).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/**
 * Agrège gains / versements pour un moniteur.
 * Gain = priceFcfa des séances completed.
 */
export async function computeMoniteurEarnings(moniteurId) {
  const feePercent = await getPlatformFeePercent()
  const [completed, confirmed, payouts] = await Promise.all([
    Reservation.find({ moniteurId, status: 'completed' })
      .populate('creneauId')
      .populate('userId', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .lean(),
    Reservation.find({ moniteurId, status: 'confirmed' })
      .populate('creneauId')
      .lean(),
    MoniteurPayout.find({ moniteurId }).sort({ paidAt: -1 }).lean(),
  ])

  const now = new Date()
  const current = monthBounds(now)
  const previous = previousMonthBounds(now)

  const completedThisMonth = completed.filter((item) =>
    inRange(item.updatedAt || item.createdAt, current.start, current.end),
  )
  const completedPrevMonth = completed.filter((item) =>
    inRange(item.updatedAt || item.createdAt, previous.start, previous.end),
  )

  const totalEarned = sumShare(completed, feePercent)
  const monthEarned = sumShare(completedThisMonth, feePercent)
  const prevMonthEarned = sumShare(completedPrevMonth, feePercent)
  const pendingEarned = sumShare(confirmed, feePercent)
  const statusOf = (item) => item.status || 'confirmed'
  const totalPaid = payouts
    .filter((item) => statusOf(item) === 'confirmed')
    .reduce((acc, item) => acc + (Number(item.amountFcfa) || 0), 0)
  // Remis par l'administration, pas encore confirmé par le moniteur.
  const awaitingConfirmation = payouts
    .filter((item) => statusOf(item) === 'pending')
    .reduce((acc, item) => acc + (Number(item.amountFcfa) || 0), 0)
  const outstanding = Math.max(0, totalEarned - totalPaid)
  // Ce que l'administration peut encore enregistrer sans payer deux fois.
  const payable = Math.max(0, outstanding - awaitingConfirmation)

  const recentSessions = completed.slice(0, 50).map((item) => {
    const user = item.userId
    const creneau = item.creneauId
    return {
      id: String(item._id),
      status: item.status,
      priceFcfa: shareOf(item, feePercent),
      heures: creneau ? computeCreneauHeures(creneau) : Number(item.heuresDebitees) || 0,
      completedAt: item.updatedAt || item.createdAt,
      user: user
        ? {
            id: String(user._id),
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          }
        : null,
      creneau: creneau
        ? {
            date: creneau.date,
            startTime: creneau.startTime,
            endTime: creneau.endTime,
          }
        : null,
    }
  })

  const payoutHistory = payouts.map((item) => ({
    id: String(item._id),
    amountFcfa: Number(item.amountFcfa) || 0,
    paidAt: item.paidAt || item.createdAt,
    note: item.note || '',
    periodLabel: item.periodLabel || '',
    status: statusOf(item),
    declineReason: item.declineReason || '',
  }))

  return {
    totals: {
      completedSessions: completed.length,
      confirmedPendingSessions: confirmed.length,
      hoursCompleted: sumHours(completed),
      hoursPending: sumHours(confirmed),
      totalEarned,
      monthEarned,
      prevMonthEarned,
      pendingEarned,
      totalPaid,
      outstanding,
      awaitingConfirmation,
      payable,
    },
    recentSessions,
    payouts: payoutHistory,
  }
}

export async function computeAllMoniteursEarningsSummary(moniteurs) {
  const results = []
  for (const moniteur of moniteurs) {
    const earnings = await computeMoniteurEarnings(moniteur._id)
    results.push({
      moniteur: {
        id: String(moniteur._id),
        fullName: `${moniteur.firstName || ''} ${moniteur.lastName || ''}`.trim(),
        email: moniteur.email || '',
        phone: moniteur.phone || '',
        active: Boolean(moniteur.active),
        activeLogin: Boolean(moniteur.activeLogin),
        defaultPriceFcfa: moniteur.defaultPriceFcfa || 5000,
      },
      ...earnings.totals,
      lastPayoutAt: earnings.payouts.find((item) => item.status === 'confirmed')?.paidAt || null,
    })
  }
  return results
}

export function normalizeWeeklyAvailability(raw) {
  if (!Array.isArray(raw)) return []
  const slots = []
  for (const item of raw) {
    const dayOfWeek = Number(item?.dayOfWeek)
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue
    const start = String(item?.start || '').trim().slice(0, 5)
    const end = String(item?.end || '').trim().slice(0, 5)
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) continue
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    if (eh * 60 + em <= sh * 60 + sm) continue
    slots.push({ dayOfWeek, start, end })
  }
  return slots
}
