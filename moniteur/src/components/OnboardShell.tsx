import type { ReactNode } from 'react'
import { Link2 } from 'lucide-react'
import logoUrl from '../assets/logo.png'

/**
 * Cadre du parcours de première connexion (mot de passe, photo, véhicule, horaires) :
 * fond blanc avec taches vertes, logo dans un rond, pastille d'étape, gros boutons arrondis.
 */
export function OnboardShell({
  title,
  subtitle,
  chip,
  step,
  children,
  onSignOut,
}: {
  title: string
  subtitle?: string
  /** Texte de la pastille, ex. « Étape 1 sur 3 · Photo ». */
  chip: string
  /** Numéro affiché dans le rond vert de la pastille ; absent : icône par défaut. */
  step?: number
  children: ReactNode
  onSignOut?: () => void
}) {
  return (
    <div className="ob">
      <div className="ob-col">
        <div className="ob-logo">
          <img src={logoUrl} alt="Monpermis.bj" />
          <svg className="ob-spark" viewBox="0 0 40 40" aria-hidden>
            <path d="M6 30 L14 22 M18 14 L22 4 M28 16 L38 12" />
          </svg>
        </div>
        <h1>{title}</h1>
        {subtitle ? <p className="ob-sub">{subtitle}</p> : null}
        <div className="ob-step">
          <span className="ob-chip">
            <b>{step ?? '•'}</b>
            {chip}
          </span>
        </div>
        {children}
        {onSignOut ? (
          <button type="button" className="ob-link" onClick={onSignOut}>
            <Link2 size={20} aria-hidden />
            Se déconnecter
          </button>
        ) : null}
      </div>
    </div>
  )
}
