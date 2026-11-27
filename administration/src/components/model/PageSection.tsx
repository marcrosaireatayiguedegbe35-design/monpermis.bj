import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useIsPhone } from '../../pages/MobileHome'

export type SectionTab = {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  end?: boolean
}

/**
 * Coque de page du modèle : bandeau d'en-tête, barre d'onglets facultative, puis le contenu.
 * Utilisée par toutes les sections refondues (Code de la route, Conduite, Activité, Annonces).
 */
export function PageSection({
  kicker,
  title,
  subtitle,
  actions,
  tabs,
  tabsLabel = 'Navigation de la section',
  children,
}: {
  kicker: string
  title: string
  subtitle?: string
  actions?: ReactNode
  tabs?: readonly SectionTab[]
  tabsLabel?: string
  children: ReactNode
}) {
  const isPhone = useIsPhone()
  const { pathname } = useLocation()
  if (isPhone) {
    // Téléphone : en-tête compact (retour + titre + actions), onglets en pastilles, pas de sous-titre.
    const hub = tabs && tabs.length > 0 ? tabs[0].to : '/'
    const back = pathname === hub ? '/' : hub
    return (
      <div className="cx-code ap-sec">
        <div className="ap-sec-head">
          <Link to={back} className="ap-sec-back" aria-label="Retour">
            <ChevronLeft aria-hidden />
          </Link>
          <h1>{title}</h1>
          {actions ? <div className="ap-sec-actions">{actions}</div> : null}
        </div>
        {tabs && tabs.length > 0 ? (
          <nav className="ap-sec-tabs" aria-label={tabsLabel}>
            {tabs.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end ?? false}>
                {label}
              </NavLink>
            ))}
          </nav>
        ) : null}
        {children}
      </div>
    )
  }

  return (
    <div className="cx-code">
      <header className="cx-page-header cx-welcome cx-wl-page">
        <div className="cx-wl-txt">
          <small>{kicker.toUpperCase()}</small>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="cx-wl-right">
            <div className="cx-page-actions">{actions}</div>
          </div>
        ) : null}
      </header>

      {tabs && tabs.length > 0 ? (
        <nav className="cx-subnav" aria-label={tabsLabel}>
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? false}>
              <Icon aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      ) : null}

      {children}
    </div>
  )
}
