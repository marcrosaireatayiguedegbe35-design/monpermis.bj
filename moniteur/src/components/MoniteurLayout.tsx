import {
  Bell,
  History,
  CalendarClock,
  CalendarDays,
  LayoutDashboard,
  UserRound,
  BarChart3,
  House,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { fetchDashboard } from '../api/portal'
import { getMoniteurToken, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { PushPrompt } from './PushPrompt'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: typeof LayoutDashboard
  badge?: 'pending'
}

const tabs: NavItem[] = [
  { to: '/', label: 'Accueil', end: true, icon: House },
  { to: '/disponibilites', label: 'Agenda', icon: CalendarDays },
  { to: '/reservations', label: 'Séances', icon: CalendarClock, badge: 'pending' },
  { to: '/revenus', label: 'Revenus', icon: BarChart3 },
  { to: '/profil', label: 'Profil', icon: UserRound },
]

function initialsOf(fullName?: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'MO').slice(0, 2).toUpperCase()
}

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
        <Link to="/profil" className="mp-avatar" aria-label="Mon profil">
          {moniteur?.photoUrl ? (
            <img src={resolveMediaUrl(moniteur.photoUrl)} alt="" />
          ) : (
            <span aria-hidden="true">{initialsOf(moniteur?.fullName)}</span>
          )}
        </Link>
        <div className="mp-top-title">
          <small>Bonjour</small>
          <b>{firstName || 'Espace moniteur'}</b>
        </div>
        <Link to="/historique" className="mp-icon-btn" aria-label="Historique des séances">
          <History aria-hidden />
        </Link>
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

      <PushPrompt />

      <nav className="mp-tabs" aria-label="Navigation">
        {tabs.map((item) => {
          const Icon = item.icon
          const badge = item.badge === 'pending' ? formatBadge(pending) : undefined
          return (
            <div key={item.to} style={{ display: 'contents' }}>
              <NavLink
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
            </div>
          )
        })}
      </nav>
    </div>
  )
}
