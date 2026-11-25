import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '../api/client'
import { useIdleLogout } from '../hooks/useIdleLogout'
import {
  changeMoniteurPassword,
  completeMoniteurOnboarding,
  fetchMoniteurMe,
  loginMoniteur,
  logoutMoniteur,
  type MoniteurUser,
} from '../api/auth'

const TOKEN_KEY = 'monpermis_moniteur_token'

function readToken() {
  const current = sessionStorage.getItem(TOKEN_KEY)
  if (current) return current
  const legacy = localStorage.getItem(TOKEN_KEY)
  if (!legacy) return null
  sessionStorage.setItem(TOKEN_KEY, legacy)
  localStorage.removeItem(TOKEN_KEY)
  return legacy
}

function writeToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  localStorage.removeItem(TOKEN_KEY)
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

interface MoniteurAuthContextValue {
  moniteur: MoniteurUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ homePath: string }>
  signOut: () => void
  /** Remplace le mot de passe provisoire par celui choisi par le moniteur. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  /** Termine le parcours photo / véhicule / horaires et ouvre le tableau de bord. */
  completeOnboarding: () => Promise<void>
}

const MoniteurAuthContext = createContext<MoniteurAuthContextValue | null>(null)

export function MoniteurAuthProvider({ children }: { children: ReactNode }) {
  const [moniteur, setMoniteur] = useState<MoniteurUser | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(() => {
    const token = readToken()
    if (token) void logoutMoniteur(token).catch(() => undefined)
    clearToken()
    setMoniteur(null)
  }, [])

  // Session moniteur : fermée après 30 min sans activité.
  useIdleLogout(Boolean(moniteur), signOut)

  useEffect(() => {
    const token = readToken()
    if (!token) {
      setLoading(false)
      return
    }
    fetchMoniteurMe(token)
      .then(({ moniteur: me }) => setMoniteur(me))
      .catch(() => {
        clearToken()
        setMoniteur(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { moniteur: loggedIn, token, homePath } = await loginMoniteur(email, password)
    writeToken(token)
    setMoniteur(loggedIn)
    return { homePath: homePath || '/' }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const token = readToken()
    if (!token) throw new Error('Session expirée')
    const { moniteur: updated, token: newToken } = await changeMoniteurPassword(token, currentPassword, newPassword)
    writeToken(newToken)
    setMoniteur(updated)
  }, [])

  const completeOnboarding = useCallback(async () => {
    const token = readToken()
    if (!token) throw new Error('Session expirée')
    const { moniteur: updated } = await completeMoniteurOnboarding(token)
    setMoniteur(updated)
  }, [])

  const value = useMemo(
    () => ({ moniteur, loading, signIn, signOut, changePassword, completeOnboarding }),
    [moniteur, loading, signIn, signOut, changePassword, completeOnboarding],
  )

  return <MoniteurAuthContext.Provider value={value}>{children}</MoniteurAuthContext.Provider>
}

export function useMoniteurAuth() {
  const ctx = useContext(MoniteurAuthContext)
  if (!ctx) throw new Error('useMoniteurAuth doit être utilisé dans MoniteurAuthProvider')
  return ctx
}

export function getMoniteurToken() {
  return readToken()
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError
}
