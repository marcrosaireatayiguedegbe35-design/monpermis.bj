import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, CheckCircle2, ChevronRight, Clock, Coins, Wallet } from 'lucide-react'
import { fetchDashboard, type DashboardData, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { formatMoney, nf, Notice } from '../components/model/Kit'

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Grands montants en notation courte pour la petite carte : 1 250 000 → « 1,25 M ». */
function compactAmount(value: number) {
  const n = Math.abs(value)
  if (n >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} Md`
  if (n >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} M`
  return nf(value)
}

function dateBadge(date?: string) {
  if (!date) return { top: '—', bottom: '' }
  if (date === todayKey()) return { top: 'Auj.', bottom: '' }
  const [, month, day] = date.split('-').map(Number)
  return { top: String(day || ''), bottom: MONTHS[(month || 1) - 1] || '' }
}

/** Accueil moniteur : un point rapide sur l'activité, tenant sur un seul écran (sans défilement). */
export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const stats = data?.stats

  // Séances du jour d'abord, puis les prochaines (sans doublon).
  const sessions: ReservationItem[] = []
  const seen = new Set<string>()
  for (const item of [...(data?.today ?? []), ...(data?.upcoming ?? [])]) {
    const key = String(item.id)
    if (seen.has(key)) continue
    seen.add(key)
    sessions.push(item)
  }
  const shown = sessions.slice(0, 4)
  // Les grands montants réduisent leur taille d'écriture au lieu de dépasser la bannière.
  const earnedLabel = formatMoney(data?.earnings?.totalEarned ?? 0)
  const earnedSize = earnedLabel.length > 14 ? ' mp-xs' : earnedLabel.length > 11 ? ' mp-sm' : ''

  return (
    <div className="mp-dash">
      <Notice error={error} />
      {loading && !data ? <p className="mp-dash-loading">Chargement…</p> : null}

      {stats ? (
        <>
          <section className="mp-hero">
            <div className="mp-hero-copy">
              <small>Votre compte</small>
              <h1>en un coup d’œil !</h1>
              <p>Voici un résumé de votre activité</p>
              <Link to="/revenus" className={`mp-hero-pill${earnedSize}`}>
                <span>
                  <b>{earnedLabel}</b>
                  <small>Gains cumulés</small>
                </span>
                <ChevronRight aria-hidden />
              </Link>
            </div>
            <span className="mp-hero-ico">
              <Wallet aria-hidden />
            </span>
          </section>

          <div className="mp-kpis">
            <Link to="/reservations" className={`mp-kpi${stats.pending > 0 ? ' mp-kpi-alert' : ''}`}>
              <i>
                <CalendarCheck aria-hidden />
              </i>
              <span>
                <b>{nf(stats.pending)}</b>
                <small>À confirmer</small>
              </span>
            </Link>
            <Link to="/reservations" className="mp-kpi">
              <i>
                <CalendarClock aria-hidden />
              </i>
              <span>
                <b>{nf(stats.confirmedUpcoming)}</b>
                <small>Séances à venir</small>
              </span>
            </Link>
            <Link to="/historique" className="mp-kpi">
              <i>
                <CheckCircle2 aria-hidden />
              </i>
              <span>
                <b>{nf(stats.completed)}</b>
                <small>Séances faites</small>
              </span>
            </Link>
            <Link to="/revenus" className="mp-kpi">
              <i>
                <Wallet aria-hidden />
              </i>
              <span>
                <b className={stats.monthEarned >= 100_000 ? 'mp-kpi-long' : stats.monthEarned >= 10_000 ? 'mp-kpi-md' : undefined}>
                  {compactAmount(stats.monthEarned)}
                </b>
                <small>Gains du mois (F)</small>
              </span>
            </Link>
          </div>

          <section className="mp-sessions">
            <header>
              <h2>Prochaines séances</h2>
              <Link to="/reservations">
                Voir tout <ChevronRight aria-hidden />
              </Link>
            </header>
            {shown.length ? (
              <ul>
                {shown.map((item) => {
                  const badge = dateBadge(item.creneau?.date)
                  return (
                    <li key={item.id}>
                      <span className="mp-date">
                        <b>{badge.top}</b>
                        {badge.bottom ? <small>{badge.bottom}</small> : null}
                      </span>
                      <span className="mp-who">
                        <b>{item.user?.fullName || 'Apprenant'}</b>
                        <small>
                          <Clock aria-hidden />
                          {item.creneau ? `${item.creneau.startTime} – ${item.creneau.endTime}` : 'Créneau'}
                        </small>
                      </span>
                      <span className="mp-amount">{formatMoney(item.priceFcfa)}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mp-dash-empty">Aucune séance à venir.</p>
            )}
          </section>

          <Link to="/revenus" className="mp-dash-money">
            <Coins aria-hidden />
            <span>
              <small>Reste à recevoir</small>
              <b>{formatMoney(stats.outstanding)}</b>
            </span>
            <i>
              <ChevronRight aria-hidden />
            </i>
          </Link>
        </>
      ) : null}
    </div>
  )
}
