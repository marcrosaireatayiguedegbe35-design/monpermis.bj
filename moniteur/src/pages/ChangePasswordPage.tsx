import { FormEvent, useState } from 'react'
import { Lock } from 'lucide-react'
import { AuthShell, PillField } from '../components/AuthShell'
import { isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'

/** Première connexion : le moniteur remplace le mot de passe provisoire donné par l'administration. */
export function ChangePasswordPage() {
  const { moniteur, changePassword, signOut } = useMoniteurAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (next.length < 8 || !/[A-Z]/.test(next) || !/[a-z]/.test(next) || !/\d/.test(next)) {
      setError('Minimum 8 caractères, avec une majuscule, une minuscule et un chiffre.')
      return
    }
    if (next !== confirm) {
      setError('Les deux mots de passe ne sont pas identiques.')
      return
    }
    if (next === current) {
      setError('Choisis un mot de passe différent du mot de passe provisoire.')
      return
    }
    setSaving(true)
    try {
      await changePassword(current, next)
    } catch (err) {
      setError(isAuthError(err) || err instanceof Error ? (err as Error).message : 'Changement impossible')
    } finally {
      setSaving(false)
    }
  }

  const hello = moniteur?.firstName && moniteur.firstName !== 'Nouveau' ? `, ${moniteur.firstName}` : ''

  return (
    <AuthShell
      title="Choisis ton mot de passe"
      subtitle={`Bienvenue${hello} ! Le mot de passe reçu de l’administration est provisoire. Remplace-le par le tien pour accéder à ton espace.`}
    >
      <form onSubmit={handleSubmit} noValidate style={{ display: 'contents' }}>
        {error ? (
          <p className="mp-auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <PillField
          icon={<Lock aria-hidden />}
          label="Mot de passe provisoire"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
        />
        <PillField
          icon={<Lock aria-hidden />}
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
        />
        <PillField
          icon={<Lock aria-hidden />}
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
        <button type="submit" className="mp-btn" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer et continuer'}
        </button>
        <button type="button" className="mp-btn mp-btn-ghost" onClick={signOut}>
          Se déconnecter
        </button>
      </form>
    </AuthShell>
  )
}
