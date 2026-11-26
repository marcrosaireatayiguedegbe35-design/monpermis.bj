import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Clock, Hourglass, Phone, Wallet } from 'lucide-react'
import { fetchDashboard, type DashboardData, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { formatMoney, nf, Notice } from '../components/model/Kit'

type Session = { item: ReservationItem; start: Date; end: Date }

function parseSlot(item: ReservationItem): Session | null {
  const slot = item.creneau
  if (!slot?.date || !slot.startTime || !slot.endTime) return null
  const start = new Date(`${slot.date}T${slot.startTime}:00`)
  const end = new Date(`${slot.date}T${slot.endTime}:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return { item, start, end }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** « En cours », « dans 25 min », « dans 2 h 10 », « demain », « ven. 27 nov. ». */
function whenLabel(session: Session, now: Date) {
  if (session.start <= now && now < session.end) return 'En cours'
  const minutes = Math.round((session.start.getTime() - now.getTime()) / 60000)
  if (sameDay(session.start, now)) {
    if (minutes < 60) return `dans ${Math.max(1, minutes)} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `dans ${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`
  }
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (sameDay(session.start, tomorrow)) return 'demain'
  return session.start.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function endOfWeek(now: Date) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() + ((7 - ((d.getDay() + 6) % 7)) % 7 || 7))
  return d // lundi prochain 00:00
}

/** Accueil moniteur : la prochaine séance d'abord, puis l'essentiel de l'activité sur un seul écran. */
export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchDashboard(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Le compte à rebours reste juste sans recharger la page.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const sessions = useMemo(() => {
    const seen = new Set<string>()
    const list: Session[] = []
    for (const item of [...(data?.today ?? []), ...(data?.upcoming ?? [])]) {
      if (seen.has(String(item.id))) continue
      seen.add(String(item.id))
      const parsed = parseSlot(item)
      if (parsed) list.push(parsed)
    }
    return list.filter((s) => s.end > now).sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [data, now])

  const next = sessions[0]
  const coming = sessions.slice(1, 3)
  const weekEnd = endOfWeek(now)
  const thisWeek = sessions.filter((s) => s.start < weekEnd).length
  const stats = data?.stats
  const share = (data?.sharePercent ?? 100) / 100
  const phone = next?.item.user?.phone || ''

  return (
    <div className="mp-dash">
      <Notice error={error} />
      {loading && !data ? <p className="mp-dash-loading">Chargement…</p> : null}

      {stats ? (
        <>
          <section className="mp-next">
            {next ? (
              <>
                <div className="mp-next-top">
                  <small>Prochaine séance</small>
                  <em>{whenLabel(next, now)}</em>
                </div>
                <b className="mp-next-time">
                  {next.item.creneau?.startTime} – {next.item.creneau?.endTime}
                </b>
                <p className="mp-next-who">{next.item.user?.fullName || 'Apprenant'}</p>
                <small className="mp-next-phone">
                  {phone || 'Téléphone non renseigné'} · {thisWeek} cette semaine · {nf(stats.hoursCompleted)} h de conduite
                </small>
                <div className="mp-next-actions">
                  {phone ? (
                    <a href={`tel:${phone}`} className="mp-next-btn is-solid">
                      <Phone aria-hidden />
                      Appeler
                    </a>
                  ) : null}
                  <Link to="/reservations" className="mp-next-btn">
                    Détails
                    <ChevronRight aria-hidden />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mp-next-top">
                  <small>Prochaine séance</small>
                </div>
                <b className="mp-next-time mp-next-none">Aucune séance à venir</b>
                <p className="mp-next-who">
                  {stats.weeklySlots === 0 ? 'Publiez vos horaires pour recevoir des réservations.' : 'Les nouvelles réservations apparaîtront ici.'}
                </p>
                <div className="mp-next-actions">
                  <Link to="/disponibilites" className="mp-next-btn is-solid">
                    <CalendarDays aria-hidden />
                    Mes disponibilités
                  </Link>
                </div>
              </>
            )}
          </section>

          <section>
            <div className="mp-sec-head">
              <h2>Mes outils</h2>
            </div>
            <div className="mp-tools">
              <Link to="/reservations" className="mp-tool">
                <span className="mp-tool-ico">
                  <Hourglass aria-hidden />
                  {stats.pending > 0 ? <em>{stats.pending}</em> : null}
                </span>
                <b>Demandes</b>
              </Link>
              <Link to="/disponibilites" className="mp-tool">
                <span className="mp-tool-ico">
                  <CalendarDays aria-hidden />
                </span>
                <b>Dispos</b>
              </Link>
              <Link to="/revenus" className="mp-tool">
                <span className="mp-tool-ico">
                  <Wallet aria-hidden />
                </span>
                <b>Revenus</b>
              </Link>
              <Link to="/historique" className="mp-tool">
                <span className="mp-tool-ico">
                  <Clock aria-hidden />
                </span>
                <b>Historique</b>
              </Link>
            </div>
          </section>

          <section className="mp-list">
            <div className="mp-sec-head">
              <h2>Prochaines séances</h2>
              <Link to="/reservations">
                Voir tout <ChevronRight aria-hidden />
              </Link>
            </div>
            {coming.length ? (
              coming.map((session) => (
                <Link key={session.item.id} to="/reservations" className="mp-list-row">
                  <span className="mp-list-avatar" aria-hidden="true">
                    {(session.item.user?.fullName || 'A').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="mp-list-who">
                    <b>{session.item.user?.fullName || 'Apprenant'}</b>
                    <small>
                      {session.item.creneau?.startTime} – {session.item.creneau?.endTime} · {whenLabel(session, now)}
                    </small>
                  </span>
                  <span className="mp-list-amount">
                    <b>{formatMoney(Math.round((session.item.priceFcfa || 0) * share))}</b>
                    <i>Détails</i>
                  </span>
                </Link>
              ))
            ) : (
              <p className="mp-dash-empty">Pas d’autre séance prévue pour l’instant.</p>
            )}
          </section>

          <Link to="/revenus" className="mp-due">
            <span>
              <small>Reste à recevoir</small>
              <b>{formatMoney(stats.outstanding)}</b>
            </span>
            <i>Part {Math.round(share * 100)} %</i>
          </Link>
        </>
      ) : null}
    </div>
  )
}
