import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, Phone } from 'lucide-react'
import { AuthShell, PillField } from '../components/AuthShell'
import { isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'

const REMEMBER_KEY = 'monpermis-moniteur-remember-phone'

function readRemembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

/** Connexion moniteur : numéro de téléphone + mot de passe, même modèle que l'app apprenant. */
export function LoginPage() {
  const { moniteur, loading, signIn } = useMoniteurAuth()
  const navigate = useNavigate()
  const remembered = useMemo(readRemembered, [])
  const [phone, setPhone] = useState(remembered)
  const [password, setPassword] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && moniteur) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Entre ton numéro de téléphone.')
      return
    }
    if (!password) {
      setError('Entre ton mot de passe.')
      return
    }
    setSubmitting(true)
    try {
      const result = await signIn(phone.trim(), password)
      try {
        localStorage.setItem(REMEMBER_KEY, phone.trim())
      } catch {
        /* stockage indisponible : la connexion n'en dépend pas */
      }
      navigate(result.homePath || '/', { replace: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Connexion impossible. Vérifie ta connexion internet.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Content de te revoir"
      subtitle="Connecte-toi pour gérer tes séances, tes disponibilités et tes revenus."
      footer={<>© {new Date().getFullYear()} Monpermis.bj · Espace moniteur</>}
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'contents' }}>
        {error ? (
          <p className="mp-auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <PillField
          icon={<Phone aria-hidden />}
          label="Téléphone"
          type="tel"
          inputMode="tel"
          placeholder="Numéro de téléphone"
          autoComplete="username"
          autoFocus
          value={phone}
          onChange={setPhone}
        />
        <PillField
          icon={<Lock aria-hidden />}
          label="Mot de passe"
          type="password"
          placeholder="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <button type="button" className="mp-forgot" onClick={() => setShowHelp((v) => !v)}>
          Mot de passe oublié ?
        </button>
        {showHelp ? (
          <p className="mp-help">
            Contacte l’administration de l’auto-école : elle peut t’attribuer un nouveau mot de passe provisoire.
          </p>
        ) : null}
        <button type="submit" className="mp-btn" disabled={submitting}>
          {submitting ? 'Connexion en cours…' : 'Se connecter'}
        </button>
      </form>
    </AuthShell>
  )
}
