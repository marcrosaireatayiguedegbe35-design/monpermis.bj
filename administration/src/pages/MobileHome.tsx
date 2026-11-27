import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CarFront, ChevronRight, Gift, Landmark, Users } from 'lucide-react'
import { fetchDashboardOverview, fetchDashboardSummary } from '../api/dashboard'
import type { DashboardOverview, DashboardSummary } from '../api/dashboard'
import { getAdminToken, useAdminAuth } from '../context/AdminAuthContext'

const MOBILE_QUERY = '(max-width: 767px)'

/** Vrai quand l'écran est celui d'un téléphone. */
export function useIsPhone() {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`

/** Accueil téléphone : six tuiles, tout tient dans un seul écran. */
export function MobileHome() {
  const { admin, canManageAdmins } = useAdminAuth()
  const [s, setS] = useState<DashboardSummary | null>(null)
  const [o, setO] = useState<DashboardOverview | null>(null)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    let off = false
    fetchDashboardSummary(token).then((r) => !off && setS(r.summary)).catch(() => undefined)
    fetchDashboardOverview(token).then((r) => !off && setO(r.overview)).catch(() => undefined)
    return () => {
      off = true
    }
  }, [])

  const first = (admin?.fullName || '').trim().split(/\s+/)[0] || 'Administrateur'
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const pend = s?.conduite?.reservationsPending ?? 0
  const access = s?.accessRequests?.pending ?? 0
  const refunds = s?.payments?.needsRefund ?? 0


  const day = o?.kpi.day
  const trend = day?.trend
  const todo = [
    pend > 0 ? { to: '/conduite/reservations', t: `${pend} séance${pend > 1 ? 's' : ''} à confirmer` } : null,
    access > 0 ? { to: '/abonnements', t: `${access} abonnement${access > 1 ? 's' : ''} à valider` } : null,
    refunds > 0 ? { to: '/finances?tab=refunds', t: `${refunds} remboursement${refunds > 1 ? 's' : ''} à faire` } : null,
  ].filter(Boolean) as { to: string; t: string }[]

  return (
    <div className="ap-hm">
      <header>
        <h1>Bonjour {first}</h1>
        <p>{date.charAt(0).toUpperCase() + date.slice(1)}</p>
      </header>

      <Link to={canManageAdmins ? '/finances' : '/'} className="ap-hm-money">
        <small>Encaissé aujourd'hui</small>
        <b>{day ? fcfa(day.ca) : '…'}</b>
        <span>
          {day ? `${day.count} paiement${day.count > 1 ? 's' : ''}` : ''}
          {typeof trend === 'number' ? ` · ${trend >= 0 ? '+' : ''}${Math.round(trend)} % sur hier` : ''}
        </span>
      </Link>

      <div className="ap-hm-kpis">
        <Link to="/utilisateurs">
          <b>{s?.users.total ?? '…'}</b>
          <small>Apprenants</small>
        </Link>
        <Link to="/conduite/reservations">
          <b>{s?.conduite.reservations ?? '…'}</b>
          <small>Séances</small>
        </Link>
        <Link to="/conduite/moniteurs">
          <b>{s?.conduite.moniteursActive ?? '…'}</b>
          <small>Moniteurs</small>
        </Link>
      </div>

      <h2>À traiter</h2>
      <div className="ap-hm-todo">
        {todo.length === 0 ? (
          <p>Tout est à jour, rien n'attend une décision.</p>
        ) : (
          todo.map((x) => (
            <Link key={x.to} to={x.to}>
              <span>{x.t}</span>
              <ChevronRight aria-hidden />
            </Link>
          ))
        )}
      </div>

      <nav className="ap-hm-nav" aria-label="Rubriques">
        <Link to="/utilisateurs">
          <Users aria-hidden />
          Apprenants
        </Link>
        <Link to="/conduite">
          <CarFront aria-hidden />
          Conduite
        </Link>
        <Link to="/code">
          <BookOpen aria-hidden />
          Code
        </Link>
        <Link to={canManageAdmins ? '/finances' : '/codes-promo'}>
          {canManageAdmins ? <Landmark aria-hidden /> : <Gift aria-hidden />}
          {canManageAdmins ? 'Compta' : 'Promo'}
        </Link>
      </nav>
    </div>
  )
}

/** Sur téléphone : l'accueil en tuiles. Sinon : le tableau de bord habituel. */
export function HomeRoute({ desktop }: { desktop: React.ReactElement }) {
  return useIsPhone() ? <MobileHome /> : desktop
}
