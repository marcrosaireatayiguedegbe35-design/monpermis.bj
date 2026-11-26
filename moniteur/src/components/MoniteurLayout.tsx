import {
  Bell,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  UserRound,
  BarChart3,
  House,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import logoUrl from '../assets/logo.png'
import { fetchDashboard } from '../api/portal'
import { getMoniteurToken, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { SITE_NAME } from '../theme/brand'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: typeof LayoutDashboard
  badge?: 'pending'
}

const tabs: NavItem[] = [
  { to: '/', label: 'Accueil', end: true, icon: House },
  { to: '/reservations', label: 'Demandes', icon: CalendarClock, badge: 'pending' },
  { to: '/disponibilites', label: 'Dispos', icon: CalendarDays },
  { to: '/revenus', label: 'Revenus', icon: BarChart3 },
  { to: '/profil', label: 'Profil', icon: UserRound },
]

function formatBadge(count: number) {
  if (count <= 0) return undefined
  return count > 99 ? '99+' : String(count)
}

/** Coque du portail moniteur : pensée pour téléphone (en-tête simple + barre d'onglets en bas). */
export function MoniteurLayout() {
  const { moniteur } = useMoniteurAuth()
  const location = useLocation()
  const [pending, setPending] = useState(0)

  // Pastille « à confirmer » rafraîchie à chaque changement de page.
  useEffect(() => {
    const token = getMoniteurToken()
    if (!token) return
    let cancelled = false
    fetchDashboard(token)
      .then((data) => {
        if (!cancelled) setPending(data.stats?.pending ?? 0)
      })
      .catch(() => {
        if (!cancelled) setPending(0)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const firstName = moniteur?.firstName && moniteur.firstName !== 'Nouveau' ? moniteur.firstName : ''

  return (
    <div className={`cx-root mp-shell${location.pathname === '/' ? ' mp-shell-fit' : ''}`}>
      <header className="mp-top">
        <img src={logoUrl} alt={SITE_NAME} />
        <div className="mp-top-title">
          <b>{firstName ? `Bonjour ${firstName}` : 'Espace moniteur'}</b>
          <small>Monpermis.bj</small>
        </div>
        <Link
          to="/reservations"
          className="mp-icon-btn"
          aria-label={pending > 0 ? `${pending} demandes à confirmer` : 'Demandes'}
        >
          <Bell aria-hidden />
          {pending > 0 ? <i className="mp-dot" /> : null}
        </Link>
      </header>

      <main className="mp-main">
        <div className="cx-view">
          <Outlet />
        </div>
      </main>

      <nav className="mp-tabs" aria-label="Navigation">
        {tabs.map((item) => {
          const Icon = item.icon
          const badge = item.badge === 'pending' ? formatBadge(pending) : undefined
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mp-tab${isActive ? ' is-active' : ''}`}
            >
              <Icon aria-hidden />
              <span>{item.label}</span>
              {badge ? (
                <span className="mp-badge" aria-label={`${pending} à confirmer`}>
                  {badge}
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
