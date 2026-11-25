import { apiFetch } from './client'

export interface MoniteurUser {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  activeLogin: boolean
  mustChangePassword?: boolean
  /** Photo, véhicule et horaires à renseigner après le premier mot de passe. */
  needsOnboarding?: boolean
  photoUrl?: string
  city?: string
}

interface AuthResponse {
  moniteur: MoniteurUser
  token: string
  homePath?: string
}

export function loginMoniteur(login: string, password: string) {
  return apiFetch<AuthResponse>('/api/moniteur/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })
}

export function changeMoniteurPassword(token: string, currentPassword: string, newPassword: string) {
  return apiFetch<{ moniteur: MoniteurUser; token: string }>(
    '/api/moniteur/auth/change-password',
    { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
    token,
  )
}

export function completeMoniteurOnboarding(token: string) {
  return apiFetch<{ moniteur: MoniteurUser }>('/api/moniteur/auth/onboarding-complete', { method: 'POST' }, token)
}

export function logoutMoniteur(token: string) {
  return apiFetch<{ ok: boolean }>('/api/moniteur/auth/logout', { method: 'POST' }, token)
}

export function fetchMoniteurMe(token: string) {
  return apiFetch<{ moniteur: MoniteurUser }>('/api/moniteur/auth/me', {}, token)
}
