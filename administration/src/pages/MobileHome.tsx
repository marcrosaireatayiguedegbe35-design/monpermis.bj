import { useEffect, useState } from 'react'
import { BookOpen, CalendarDays, Gift, Landmark, UserCog, Users, Wallet } from 'lucide-react'
import { fetchDashboardOverview, fetchDashboardSummary } from '../api/dashboard'
import type { DashboardOverview, DashboardSummary } from '../api/dashboard'
import { getAdminToken, useAdminAuth } from '../context/AdminAuthContext'
import { PhotoHub } from '../components/phone/PhoneKit'

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

  const todoCount = pend + access + refunds
  const nextTo = pend > 0 ? '/conduite/reservations' : access > 0 ? '/abonnements' : refunds > 0 ? '/finances?tab=refunds' : ''

  return (
    <PhotoHub
      title={`Bonjour ${first}`}
      subtitle={date.charAt(0).toUpperCase() + date.slice(1)}
      back={null}
      banner={
        todoCount > 0
          ? {
              title: `${todoCount} chose${todoCount > 1 ? 's' : ''} à traiter`,
              text: [
                pend > 0 ? `${pend} séance${pend > 1 ? 's' : ''}` : '',
                access > 0 ? `${access} abonnement${access > 1 ? 's' : ''}` : '',
                refunds > 0 ? `${refunds} remboursement${refunds > 1 ? 's' : ''}` : '',
              ]
                .filter(Boolean)
                .join(' · '),
              to: nextTo,
              cta: 'Traiter',
              tone: 'alert',
            }
          : { title: 'Tout est à jour', text: 'Rien n’attend une décision pour le moment.' }
      }
      cards={[
        { to: '/conduite/reservations', title: 'Séances', sub: pend > 0 ? `${pend} à confirmer` : 'Rien en attente', image: '/phone/examens.jpg', tone: 'orange', icon: <CalendarDays aria-hidden />, badge: pend },
        { to: '/abonnements', title: 'Abonnés', sub: access > 0 ? `${access} à valider` : 'Rien en attente', image: '/phone/notes.jpg', tone: 'green', icon: <Wallet aria-hidden />, badge: access },
        { to: '/utilisateurs', title: 'Apprenants', sub: s ? `${s.users.total} · ${s.users.active} actifs` : '…', image: '/phone/revision.jpg', tone: 'pink', icon: <Users aria-hidden /> },
        { to: '/conduite/moniteurs', title: 'Moniteurs', sub: s ? `${s.conduite.moniteursActive} en service` : '…', image: '/phone/ecodepermis.jpg', tone: 'cyan', icon: <UserCog aria-hidden /> },
        canManageAdmins
          ? { to: refunds > 0 ? '/finances?tab=refunds' : '/finances', title: 'Compta', sub: refunds > 0 ? `${refunds} à rembourser` : o ? `${fcfa(o.kpi.day.ca)} aujourd'hui` : '…', image: '/phone/notes.jpg', tone: 'green' as const, icon: <Landmark aria-hidden />, badge: refunds }
          : { to: '/codes-promo', title: 'Codes promo', sub: 'Remises', image: '/phone/notes.jpg', tone: 'green' as const, icon: <Gift aria-hidden /> },
        { to: '/code', title: 'Contenu', sub: 'Code · Conduite', image: '/phone/revision.jpg', tone: 'pink' as const, icon: <BookOpen aria-hidden /> },
      ]}
    />
  )
}

/** Sur téléphone : l'accueil en tuiles. Sinon : le tableau de bord habituel. */
export function HomeRoute({ desktop }: { desktop: React.ReactElement }) {
  return useIsPhone() ? <MobileHome /> : desktop
}
