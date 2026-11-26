import { apiFetch } from './client'

const BASE = '/api/admin/conduite-finance'

export interface ReviewStat {
  moniteurId: string
  moniteurName: string
  count: number
  rating: number
  punctuality: number
  pedagogy: number
  vehicle: number
  recommendPercent: number
}

export interface ReviewItem {
  id: string
  createdAt: string
  rating: number
  punctuality: number
  pedagogy: number
  vehicle: number
  wouldRecommend: boolean
  comment: string
  learnerName: string
  learnerPhone: string
  moniteurId: string
  moniteurName: string
  date: string
  startTime: string
  endTime: string
}

export function fetchReviews(token: string, moniteurId?: string) {
  const query = moniteurId ? `?moniteurId=${encodeURIComponent(moniteurId)}` : ''
  return apiFetch<{ stats: ReviewStat[]; reviews: ReviewItem[] }>(`${BASE}/reviews${query}`, {}, token)
}

export interface SettlementSession {
  id: string
  date: string
  startTime: string
  endTime: string
  learnerName: string
  priceFcfa: number
  moniteurShareFcfa: number
  platformFeeFcfa: number
  dueAt: string | null
  dueNow: boolean
  reviewed: boolean
}

export interface SettlementMoniteur {
  moniteurId: string
  moniteurName: string
  phone: string
  dueNowAmount: number
  dueNowCount: number
  laterAmount: number
  laterCount: number
  sessions: SettlementSession[]
}

export interface SettlementsData {
  feePercent: number
  totals: { dueNowAmount: number; dueNowCount: number; laterAmount: number }
  moniteurs: SettlementMoniteur[]
  recentSettled: { id: string; moniteurName: string; date: string; amount: number; settledAt: string }[]
}

export function fetchSettlements(token: string) {
  return apiFetch<SettlementsData>(`${BASE}/settlements`, {}, token)
}

export function paySettlement(token: string, payload: { moniteurId: string; reservationIds?: string[]; note?: string }) {
  return apiFetch<{ settledCount: number; amountFcfa: number }>(
    `${BASE}/settlements/pay`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function saveFeePercent(token: string, platformFeePercent: number) {
  return apiFetch<{ platformFeePercent: number }>(
    `${BASE}/settings`,
    { method: 'PUT', body: JSON.stringify({ platformFeePercent }) },
    token,
  )
}

export interface RevenuePeriod {
  revenue: {
    code: number
    conduite: number
    conduiteDetail: { packsHeures: number; videos: number; reservationsDirectes: number }
    other: number
    total: number
  }
  sessions: { sessions: number; price: number; platformFee: number; moniteurShare: number }
}

export interface RevenueBreakdown {
  currency: string
  feePercent: number
  periods: Record<'today' | 'week' | 'month' | 'all', RevenuePeriod>
  dueToMoniteurs: { amount: number; count: number }
}

export function fetchRevenueBreakdown(token: string) {
  return apiFetch<RevenueBreakdown>(`${BASE}/revenue-breakdown`, {}, token)
}
