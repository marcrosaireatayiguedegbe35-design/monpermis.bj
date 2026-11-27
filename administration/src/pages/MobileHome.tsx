import { useEffect, useState } from 'react'
import { BookOpen, CalendarDays, CarFront, Gift, Landmark, Users, Wallet } from 'lucide-react'
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

  const ca = o ? fcfa(o.kpi.day.ca) : '…'

  return (
    <PhotoHub
      title={`Bonjour ${first}`}
      subtitle={date.charAt(0).toUpperCase() + date.slice(1)}
      back={null}
      banner={{
        title: "Aujourd'hui",
        text:
          todoCount > 0
            ? `${ca} encaissés · ${todoCount} chose${todoCount > 1 ? 's' : ''} à traiter`
            : `${ca} encaissés · tout est à jour`,
        to: todoCount > 0 ? nextTo : undefined,
        cta: 'Traiter',
        image: '/phone/banner-home.jpg',
        badge: todoCount > 0 ? 'À traiter' : 'Ton tableau de bord',
      }}
      cards={[
        { to: '/conduite/reservations', title: 'Séances', sub: pend > 0 ? `${pend} à confirmer` : 'Rien en attente', image: '/phone/examens.jpg', tone: 'orange', icon: <CalendarDays aria-hidden />, badge: pend },
        { to: '/abonnements', title: 'Abonnés', sub: access > 0 ? `${access} à valider` : 'Rien en attente', image: '/phone/notes.jpg', tone: 'green', icon: <Wallet aria-hidden />, badge: access },
        { to: '/utilisateurs', title: 'Apprenants', sub: s ? `${s.users.total} · ${s.users.active} actifs` : '…', image: '/phone/revision.jpg', tone: 'pink', icon: <Users aria-hidden /> },
        canManageAdmins
          ? { to: refunds > 0 ? '/finances?tab=refunds' : '/finances', title: 'Compta', sub: refunds > 0 ? `${refunds} à rembourser` : `${ca} aujourd'hui`, image: '/phone/panneaux.png', tone: 'cyan' as const, icon: <Landmark aria-hidden />, badge: refunds }
          : { to: '/codes-promo', title: 'Codes promo', sub: 'Remises', image: '/phone/panneaux.png', tone: 'cyan' as const, icon: <Gift aria-hidden /> },
      ]}
      wides={[
        { to: '/code', title: 'Code de la route', sub: s ? `${s.code.questions} questions` : 'Chapitres, cours, examens', image: '/phone/ecodepermis.jpg', tone: 'navy', icon: <BookOpen aria-hidden /> },
        { to: '/conduite', title: 'Conduite', sub: s ? `${s.conduite.moniteursActive} moniteurs en service` : 'Leçons, séances, moniteurs', image: '/phone/examens.jpg', tone: 'navy', icon: <CarFront aria-hidden /> },
      ]}
    />
  )
}

/** Sur téléphone : l'accueil en tuiles. Sinon : le tableau de bord habituel. */
export function HomeRoute({ desktop }: { desktop: React.ReactElement }) {
  return useIsPhone() ? <MobileHome /> : desktop
}
