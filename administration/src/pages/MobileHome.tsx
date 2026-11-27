import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, Gift, Landmark, UserCog, Users, Wallet } from 'lucide-react'
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

  const tiles = [
    {
      to: '/conduite/reservations',
      icon: CalendarDays,
      title: 'Séances',
      sub: pend > 0 ? `${pend} à confirmer` : 'Rien en attente',
      badge: pend,
    },
    {
      to: '/abonnements',
      icon: Wallet,
      title: 'Abonnés',
      sub: access > 0 ? `${access} à valider` : 'Rien en attente',
      badge: access,
    },
    {
      to: '/utilisateurs',
      icon: Users,
      title: 'Apprenants',
      sub: s ? `${s.users.total} · ${s.users.active} actifs` : '…',
      badge: 0,
    },
    {
      to: '/conduite/moniteurs',
      icon: UserCog,
      title: 'Moniteurs',
      sub: s ? `${s.conduite.moniteursActive} en service` : '…',
      badge: 0,
    },
    canManageAdmins
      ? {
          to: refunds > 0 ? '/finances?tab=refunds' : '/finances',
          icon: Landmark,
          title: 'Compta',
          sub: refunds > 0 ? `${refunds} à rembourser` : o ? `${fcfa(o.kpi.day.ca)} aujourd'hui` : '…',
          badge: refunds,
        }
      : { to: '/codes-promo', icon: Gift, title: 'Codes promo', sub: 'Remises', badge: 0 },
    { to: '/code', icon: BookOpen, title: 'Contenu', sub: 'Code · Conduite', badge: 0 },
  ]

  return (
    <div className="ap-home">
      <div className="ap-home-head">
        <small>{date}</small>
        <b>Bonjour {first}</b>
      </div>
      <div className="ap-home-grid">
        {tiles.map((t) => {
          const Icon = t.icon
          return (
            <Link key={t.title} to={t.to} className={`ap-home-tile${t.badge > 0 ? ' is-hot' : ''}`}>
              <span className="ap-home-ico">
                <Icon aria-hidden />
              </span>
              {t.badge > 0 ? <em>{t.badge > 99 ? '99+' : t.badge}</em> : null}
              <b>{t.title}</b>
              <small>{t.sub}</small>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/** Sur téléphone : l'accueil en tuiles. Sinon : le tableau de bord habituel. */
export function HomeRoute({ desktop }: { desktop: React.ReactElement }) {
  return useIsPhone() ? <MobileHome /> : desktop
}
