import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiAuthed, apiAuthedRetry, ApiError } from './client'
import { getStoredUser } from './session'
import { getActiveSubscriptions } from '../utils/subscriptionSummary'

export class AccessRequestError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AccessRequestError'
    this.code = code
  }
}

function toAccessError(error: unknown): AccessRequestError {
  if (error instanceof AccessRequestError) return error
  if (error instanceof ApiError) {
    return new AccessRequestError(error.message, error.code)
  }
  if (error instanceof Error) return new AccessRequestError(error.message)
  return new AccessRequestError('Action impossible')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiAuthedRetry<T>(path, options)
  } catch (error) {
    throw toAccessError(error)
  }
}

export type AccessModuleKey = 'code' | 'conduite_heures' | 'conduite_videos' | 'aiChat'
export type AccessModuleUnit = 'flat' | 'day' | 'month' | 'hour' | 'week'
export type AccessRequestStatus =
  | 'en_attente'
  | 'paiement_declare'
  | 'en_verification'
  | 'valide'
  | 'actif'
  | 'expire'
  | 'rejete'
export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis'

export interface AccessModule {
  key: AccessModuleKey
  label: string
  unit: AccessModuleUnit
  price: number
  currency: string
  active: boolean
  hoursDiscount?: number
  amountForTwoHours?: number | null
}

export interface AccessRequest {
  id: string
  module: AccessModuleKey
  status: AccessRequestStatus
  quantity: number
  amount: number
  currency: string
  unit: AccessModuleUnit
  startAt: string | null
  endAt: string | null
  lastDecisionNote: string
  createdAt: string
  updatedAt: string
}

export interface AccessPaymentSummary {
  id: string
  accessRequestId: string
  accessRequestIds?: string[]
  method: 'fedapay'
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'
  paymentUrl: string
  paymentMethod?: string
  fedapayReference: string
  callbackUrl?: string
  errorMessage: string
  createdAt: string
  updatedAt: string
}

export interface AccessMe {
  access: Record<AccessModuleKey, boolean>
  pendingRequest: AccessRequest | null
  pendingPayment: AccessPaymentSummary | null
  requests: AccessRequest[]
  user: { soldeHeures: number }
}

export interface CheckoutCartItem {
  module: AccessModuleKey
  quantity: number
}

export interface MobileMoneyCheckoutResult {
  payment: AccessPaymentSummary
  accessRequest: AccessRequest
  accessRequests: AccessRequest[]
  operator: MobileMoneyOperator
  phone: string
  country: string
  access: AccessMe
  message: string
}

export interface CheckoutResult {
  accessRequest: AccessRequest
  payment?: AccessPaymentSummary | null
  paymentUrl?: string
  callbackUrl?: string
  resumed?: boolean
  alreadyActive?: boolean
  access?: AccessMe
}

export { computeModuleAmount } from '../utils/pricing'

export const fetchAccessModules = () =>
  request<{ modules: AccessModule[] }>('/access-requests/modules').then((data) => data.modules)

const ACCESS_SNAPSHOT_KEY = '@mp/access-snapshot:v1'

/**
 * Dernier état d'abonnement connu. Hors connexion, l'accès payé reste valable jusqu'à sa date de fin
 * (jamais au-delà) : le candidat peut donc utiliser la partie Code sans réseau pendant tout son mois.
 */
async function saveAccessSnapshot(me: AccessMe) {
  try {
    const user = await getStoredUser()
    await AsyncStorage.setItem(
      ACCESS_SNAPSHOT_KEY,
      JSON.stringify({ userId: user?.id ?? null, savedAt: Date.now(), me }),
    )
  } catch {
    /* ignore */
  }
}

async function loadAccessSnapshot(): Promise<AccessMe | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCESS_SNAPSHOT_KEY)
    if (!raw) return null
    const snap = JSON.parse(raw) as { userId: string | null; me: AccessMe }
    const user = await getStoredUser()
    if (!snap?.me || (snap.userId && user?.id && snap.userId !== user.id)) return null
    // L'état mémorisé peut dater : on recalcule chaque module d'après les dates de fin des abonnements.
    const live = new Set(getActiveSubscriptions(snap.me).map((item) => item.module))
    const access = { ...snap.me.access }
    for (const key of Object.keys(access) as AccessModuleKey[]) {
      if (key === 'conduite_heures') continue // crédit d'heures : pas une date de fin
      access[key] = live.has(key)
    }
    return { ...snap.me, access }
  } catch {
    return null
  }
}

export async function fetchAccessMe(): Promise<AccessMe> {
  const fromNetwork = async (): Promise<AccessMe> => {
    const me = await apiAuthed<AccessMe>('/access-requests/me').catch((error) => {
      // Une courte coupure réseau : une seule nouvelle tentative avant de se rabattre sur le dernier état connu.
      if (error instanceof ApiError && error.status === undefined) return apiAuthed<AccessMe>('/access-requests/me')
      throw error
    })
    void saveAccessSnapshot(me)
    return me
  }
  try {
    // Si le serveur tarde (démarrage à froid) et qu'un accès est déjà connu sur l'appareil, on l'utilise
    // tout de suite : la page s'affiche sans attendre, valable jusqu'à la fin de l'abonnement.
    const snapshot = await loadAccessSnapshot()
    if (!snapshot) return await fromNetwork()
    const pending = fromNetwork()
    pending.catch(() => undefined)
    return await Promise.race([
      pending,
      new Promise<AccessMe>((resolve) => setTimeout(() => resolve(snapshot), 6000)),
    ]).catch(() => snapshot)
  } catch (error) {
    if (error instanceof ApiError && error.status === undefined) {
      const snapshot = await loadAccessSnapshot()
      if (snapshot) return snapshot
    }
    throw toAccessError(error)
  }
}

export const redeemPromoCode = (code: string) =>
  request<{ modules: string[]; access: AccessMe }>('/promo-codes/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })

export const quoteAccessCart = (items: CheckoutCartItem[]) =>
  request<{
    lines: Array<{
      module: AccessModuleKey
      label: string
      quantity: number
      amount: number
      discountApplied: number
    }>
    total: number
    currency: string
  }>('/access-requests/quote', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })

export const checkoutMobileMoney = (payload: {
  items: CheckoutCartItem[]
  operator: MobileMoneyOperator
  country?: string
  phone: string
  replace?: boolean
}) =>
  request<MobileMoneyCheckoutResult>('/access-requests/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const claimFreeAccess = (modules: AccessModuleKey[] = ['conduite_videos']) =>
  request<{
    accessRequests: AccessRequest[]
    access: AccessMe
    message: string
  }>('/access-requests/claim-free', {
    method: 'POST',
    body: JSON.stringify({ modules }),
  })

export const createAccessRequest = (payload: {
  module: AccessModuleKey
  quantity: number
  replace?: boolean
}) =>
  request<CheckoutResult>('/access-requests/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const cancelAccessRequest = (id: string) =>
  request<{ accessRequest: AccessRequest; access: AccessMe }>(`/access-requests/${id}/cancel`, {
    method: 'POST',
  })

export const syncAccessRequest = (id: string) =>
  request<{
    accessRequest: AccessRequest
    accessRequests?: AccessRequest[]
    payment?: AccessPaymentSummary
    access: AccessMe
  }>(`/access-requests/${id}/sync`, { method: 'POST' })
