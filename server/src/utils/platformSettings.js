import { PlatformSetting } from '../models/PlatformSetting.js'

export const DEFAULT_PLATFORM_FEE_PERCENT = 20
const FEE_KEY = 'platformFeePercent'

/** Part gardée par la plateforme sur chaque séance de conduite (0–60 %). */
export async function getPlatformFeePercent() {
  const row = await PlatformSetting.findOne({ key: FEE_KEY }).lean()
  const value = Number(row?.value)
  if (!Number.isFinite(value) || value < 0 || value > 60) return DEFAULT_PLATFORM_FEE_PERCENT
  return value
}

export async function setPlatformFeePercent(percent, adminId = null) {
  const value = Math.round(Number(percent) * 100) / 100
  if (!Number.isFinite(value) || value < 0 || value > 60) {
    const error = new Error('La commission doit être comprise entre 0 et 60 %')
    error.status = 400
    throw error
  }
  await PlatformSetting.findOneAndUpdate(
    { key: FEE_KEY },
    { $set: { value, updatedByAdminId: adminId } },
    { upsert: true, new: true },
  )
  return value
}

/** Découpe un prix de séance entre la plateforme et le moniteur. */
export function splitSessionPrice(priceFcfa, feePercent) {
  const price = Math.max(0, Math.round(Number(priceFcfa) || 0))
  const platformFeeFcfa = Math.round((price * feePercent) / 100)
  return { priceFcfa: price, platformFeeFcfa, moniteurShareFcfa: price - platformFeeFcfa }
}

/** Heure à laquelle le règlement du moniteur est dû : 18 h le jour de la séance (ou maintenant si déjà passé). */
export function settlementDueAt(creneauDate, now = new Date()) {
  const due = new Date(`${creneauDate || ''}T18:00:00`)
  if (Number.isNaN(due.getTime())) return now
  return due.getTime() < now.getTime() ? now : due
}
