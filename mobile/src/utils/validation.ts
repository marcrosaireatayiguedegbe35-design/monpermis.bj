/**
 * Permissive email format: local@domain with at least one dot in the domain.
 * Allows +, _, digits, hyphens, subdomains, and long/new gTLDs.
 * Rejects spaces and missing @ / domain.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmailFormat(email: string): boolean {
  const value = email.trim()
  if (!value || value.length > 254) return false
  return EMAIL_PATTERN.test(value)
}

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "L'email est requis"
  if (!isValidEmailFormat(email)) return 'Email invalide'
  return undefined
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Le mot de passe est requis'
  if (password.length < 8) return 'Minimum 8 caractères'
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'Doit contenir majuscule, minuscule et chiffre'
  }
  return undefined
}

/** Identifiant de connexion : téléphone Bénin (10 chiffres). */
export function validateLoginIdentifier(value: string): string | undefined {
  return validatePhone(value)
}

/** Texte indicatif du champ (volontairement sans numéro d'exemple). */
export const PHONE_PLACEHOLDER = 'Numéro de téléphone'
const PHONE_PATTERN = /^\d{10}$/

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Si l'utilisateur colle +229..., on garde les 10 derniers chiffres
  let local = digits
  if (digits.startsWith('229') && digits.length >= 13) {
    local = digits.slice(3)
  }

  return local.slice(0, 10)
}

export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) return 'Le téléphone est requis'
  const normalized = normalizePhone(phone)
  if (!PHONE_PATTERN.test(normalized)) {
    return 'Format invalide : saisis les 10 chiffres de ton numéro (ex. 01 XX XX XX XX).'
  }
  return undefined
}

export function validateName(name: string, field: string): string | undefined {
  if (!name.trim()) return `${field} est requis`
  if (name.trim().length < 2) return `${field} trop court`
  return undefined
}
