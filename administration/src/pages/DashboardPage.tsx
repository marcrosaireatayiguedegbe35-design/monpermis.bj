import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Car,
  Check,
  CalendarDays,
  Coins,
  CreditCard,
  Lightbulb,
  PieChart,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Video,
  Wallet,
} from 'lucide-react'
import {
  EvoChart,
  KpiCard,
  PanelHead,
  Ring,
  compactAmount,
  fcfa,
  nf,
  pctText,
  type EvoPoint,
} from '../components/model/ModelCharts'
import {
  fetchDashboardOverview,
  fetchDashboardSummary,
  paymentStatusLabel,
  subscribeToDashboardPaymentEvents,
  type DashboardOverview,
  type DashboardPayment,
} from '../api/dashboard'
import type { AccessModuleKey } from '../api/accessRequests'
import { paymentChannelLabel } from '../api/accessRequests'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { SkeletonBlock } from '../ui'

const moduleLabels: Record<AccessModuleKey, string> = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  aiChat: 'Chat IA',
}

/** Couleurs des tranches de l'anneau (vert Monpermis en premier). */
const SLICE_COLORS = ['#00b050', '#0b2f6b', '#ffc000', '#35a4dd', '#e85d3b', '#8a9bb0']

type RangeKey = '7J' | '30J' | '3M' | '1A'
const RANGE_DAYS: Record<RangeKey, number> = { '7J': 7, '30J': 30, '3M': 90, '1A': 365 }

const addDays = (iso: string, n: number) => {
  const t = new Date(`${iso}T12:00:00`)
  t.setDate(t.getDate() + n)
  return t.toLocaleDateString('en-CA')
}
const frDate = (iso: string) => iso.split('-').reverse().join('/')
const monthName = (iso: string) =>
  new Date(`${iso.slice(0, 7)}-15T12:00:00`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
const monthsBack = (iso: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = new Date(`${iso.slice(0, 7)}-15T12:00:00`)
    t.setMonth(t.getMonth() - (n - 1 - i))
    return t.toLocaleDateString('en-CA').slice(0, 7)
  })
const lastDayOf = (month: string) => {
  const t = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)
  const day = t.toLocaleDateString('en-CA')
  const today = new Date().toLocaleDateString('en-CA')
  return day > today ? today : day
}

function formatRelativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.round(hours / 24)} j`
}

function learnerName(payment: DashboardPayment) {
  if (!payment.learner) return 'Apprenant'
  return `${payment.learner.firstName} ${payment.learner.lastName}`.trim() || 'Apprenant'
}

function paymentOffer(payment: DashboardPayment) {
  if (payment.kind === 'reservation' || payment.reservationGroupId) return 'Réservation'
  const keys = payment.modules?.length ? payment.modules : payment.module ? [payment.module] : []
  if (!keys.length) return '—'
  return keys.map((key) => moduleLabels[key] ?? key).join(' + ')
}

function moduleIcon(key: string) {
  if (key === 'code') return <BookOpen aria-hidden />
  if (key === 'conduite_videos') return <Video aria-hidden />
  if (key === 'conduite_heures' || key === 'reservation') return <Car aria-hidden />
  return <Wallet aria-hidden />
}

type OutletCtx = { dashDate: string; setDashDate: (date: string) => void }

export function DashboardPage() {
  const navigate = useNavigate()
  const { dashDate, setDashDate } = useOutletContext<OutletCtx>()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [payments, setPayments] = useState<DashboardPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>('30J')
  const refreshTimer = useRef<number | null>(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      const token = getAdminToken()
      if (!token) return
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const [ov, sum] = await Promise.all([
          fetchDashboardOverview(token, dashDate || undefined),
          fetchDashboardSummary(token),
        ])
        setOverview(ov.overview)
        setPayments(sum.summary.payments?.recent ?? [])
      } catch (err) {
        if (!silent) setError(isAuthError(err) ? err.message : 'Impossible de charger le tableau de bord')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [dashDate],
  )

  useEffect(() => {
    void load()
  }, [load])

  const scheduleSilentRefresh = useCallback(() => {
    if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => void load({ silent: true }), 800)
  }, [load])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    const unsubscribe = subscribeToDashboardPaymentEvents(
      token,
      (payment) => {
        setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)].slice(0, 20))
        scheduleSilentRefresh()
      },
    )
    return () => {
      unsubscribe()
      if (refreshTimer.current != null) window.clearTimeout(refreshTimer.current)
    }
  }, [scheduleSilentRefresh])

  const date = overview?.date ?? dashDate ?? ''

  const byDate = useMemo(() => new Map((overview?.daily ?? []).map((row) => [row.date, row])), [overview])

  const sumWindow = useCallback(
    (from: string, to: string) =>
      (overview?.daily ?? []).reduce((a, row) => (row.date >= from && row.date <= to ? a + row.ca : a), 0),
    [overview],
  )

  const points = useMemo<EvoPoint[]>(() => {
    if (!overview) return []
    if (range === '1A') {
      return monthsBack(overview.date, 12).map((mo) => {
        const v = overview.daily.filter((row) => row.date.slice(0, 7) === mo).reduce((a, row) => a + row.ca, 0)
        return {
          l: `${mo.slice(5)}/${mo.slice(2, 4)}`,
          d: new Date(`${mo}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          v,
        }
      })
    }
    const n = RANGE_DAYS[range]
    return Array.from({ length: n }, (_, i) => {
      const ds = addDays(overview.date, i - (n - 1))
      return { l: `${ds.slice(8)}/${ds.slice(5, 7)}`, d: frDate(ds), v: byDate.get(ds)?.ca ?? 0 }
    })
  }, [overview, range, byDate])

  const periodTotal = points.reduce((a, p) => a + p.v, 0)
  const previousTotal = useMemo(() => {
    if (!overview) return null
    const n = RANGE_DAYS[range]
    return sumWindow(addDays(overview.date, -(2 * n - 1)), addDays(overview.date, -n))
  }, [overview, range, sumWindow])
  const periodTrend =
    previousTotal && previousTotal > 0
      ? Math.round(((periodTotal - previousTotal) / previousTotal) * 1000) / 10
      : null

  const months = useMemo(
    () => (date ? monthsBack(new Date().toLocaleDateString('en-CA'), 12).reverse() : []),
    [date],
  )

  const byModule = overview?.byModule ?? []
  const moduleTotal = byModule.reduce((a, row) => a + row.ca, 0)
  const maxModule = Math.max(1, ...byModule.map((row) => row.ca))

  const lastPayments = payments.slice(0, 5)

  const kpi = overview?.kpi
  const share = kpi && kpi.month.count ? Math.round((kpi.day.count / kpi.month.count) * 100) : 0

  const insight =
    !kpi || kpi.month.trend === null
      ? 'Pas encore de mois précédent comparable : la tendance s’affichera dès qu’il y aura des paiements à comparer.'
      : `Le chiffre d’affaires de ${monthName(date)} est en ${kpi.month.trend >= 0 ? 'hausse' : 'baisse'} de ${String(Math.abs(kpi.month.trend)).replace('.', ',')} % par rapport au mois précédent sur la même période.`

  const onMonthChange = (value: string) => setDashDate(lastDayOf(value))

  return (
    <>
      <header className="cx-page-header cx-dash-head">
        <div className="cx-dash-title">
          <h1>Tableau de bord</h1>
          <p>Chiffre d’affaires, paiements et répartition des offres.</p>
        </div>
        <div className="cx-page-actions">
          <label className="cx-date-pill cx-dp-chev cx-mob-date" title="Date du tableau de bord">
            <CalendarDays aria-hidden />
            <input
              type="date"
              value={date}
              max={new Date().toLocaleDateString('en-CA')}
              onChange={(e) => e.target.value && setDashDate(e.target.value)}
              aria-label="Date du tableau de bord"
            />
          </label>
          <button type="button" className="cx-refresh" onClick={() => void load()}>
            <RefreshCw aria-hidden />
            Actualiser
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading && !overview ? <SkeletonBlock rows={6} /> : null}

      {overview && kpi ? (
        <>
          <div className="cx-kc-grid">
            <KpiCard
              icon={<Coins aria-hidden />}
              tone="blue"
              label="CA du jour"
              value={nf(kpi.day.ca)}
              unit="FCFA"
              trend={kpi.day.trend}
              vs="vs la veille"
              spark={overview.spark.day}
              color="#0b2f6b"
            />
            <KpiCard
              icon={<Wallet aria-hidden />}
              tone="green"
              label="CA du mois"
              value={nf(kpi.month.ca)}
              unit="FCFA"
              trend={kpi.month.trend}
              vs="vs mois précédent"
              spark={overview.spark.month}
              color="#10a779"
            />
            <KpiCard
              icon={<CalendarDays aria-hidden />}
              tone="sky"
              label="CA de l’année"
              value={nf(kpi.year.ca)}
              unit="FCFA"
              trend={kpi.year.trend}
              vs={`vs ${Number(overview.year) - 1}`}
              spark={overview.spark.year}
              color="#35a4dd"
            />
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-gold">
                <CreditCard aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Paiements réussis</span>
                <span className="cx-kc-value">
                  {nf(kpi.day.count)} <small>/ {nf(kpi.month.count)}</small>
                </span>
                <span className="cx-kc-sub">{share} % des paiements du mois</span>
                <span className="cx-kc-bar">
                  <i style={{ width: `${Math.min(100, share)}%` }} />
                </span>
              </div>
            </div>
          </div>

          <div className="cx-dash-row">
            <section className="cx-panel cx-dash-chart">
              <PanelHead
                icon={<TrendingUp aria-hidden />}
                tile
                title="Évolution du chiffre d’affaires"
                sub="Sur la période choisie (en FCFA)"
                extra={
                  <div className="cx-seg" role="group" aria-label="Période du graphique">
                    {(Object.keys(RANGE_DAYS) as RangeKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={key === range ? 'cx-on' : ''}
                        aria-pressed={key === range}
                        onClick={() => setRange(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                }
              />
              <EvoChart points={points} />
              <div className="cx-evo-foot">
                <div className="cx-ef">
                  <span className="cx-ef-ic">
                    <Coins aria-hidden />
                  </span>
                  <div>
                    <small>Chiffre d’affaires total (période)</small>
                    <b>{fcfa(periodTotal)}</b>
                  </div>
                </div>
                <div className="cx-ef">
                  <span className="cx-ef-ic">
                    <TrendingUp aria-hidden />
                  </span>
                  <div>
                    <small>Évolution vs période précédente</small>
                    <b className={periodTrend !== null && periodTrend < 0 ? 'cx-neg' : 'cx-pos'}>
                      {periodTrend === null
                        ? 'sans comparaison'
                        : `${periodTrend >= 0 ? '↑ ' : '↓ '}${pctText(periodTrend)}`}
                    </b>
                  </div>
                </div>
              </div>
            </section>

            <section className="cx-panel cx-dash-donut">
              <PanelHead
                icon={<PieChart aria-hidden />}
                tile
                title="Répartition par offre"
                sub="CA du mois (en FCFA)"
                extra={
                  <label className="cx-mo-wrap">
                    <CalendarDays aria-hidden />
                    <select
                      className="cx-mo-sel"
                      aria-label="Mois"
                      value={overview.month}
                      onChange={(e) => onMonthChange(e.target.value)}
                    >
                      {months.map((mo) => (
                        <option key={mo} value={mo}>
                          {new Date(`${mo}-15`).toLocaleDateString('fr-FR', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                }
              />
              {moduleTotal > 0 ? (
                <div className="cx-dn2">
                  <div className="cx-dn2-ring">
                    <Ring
                      label="Répartition du chiffre d'affaires par offre"
                      slices={byModule.map((row, i) => ({
                        l: row.label,
                        v: row.ca,
                        c: SLICE_COLORS[i % SLICE_COLORS.length],
                      }))}
                    />
                    <span className="cx-dn2-c">
                      <b>{compactAmount(moduleTotal)}</b>
                      <small>FCFA</small>
                      <hr />
                      <em>100 %</em>
                    </span>
                  </div>
                  <ul className="cx-dn2-leg">
                    {byModule.map((row, i) => (
                      <li key={row.key}>
                        <i style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                        <div>
                          <span>{row.label}</span>
                          <b>{nf(row.ca)} FCFA</b>
                        </div>
                        <em>{Math.round((row.ca / moduleTotal) * 100)}%</em>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="cx-muted">Aucun paiement ce mois.</p>
              )}
            </section>
          </div>

          <div className="cx-dash-row cx-dash-row2">
            <section className="cx-panel cx-dash-last">
              <PanelHead
                icon={<CreditCard aria-hidden />}
                title="Derniers paiements"
                sub="Opérations les plus récentes"
                extra={
                  <button type="button" className="cx-link-all" onClick={() => navigate('/abonnements?tab=payments')}>
                    Voir tout <ArrowRight aria-hidden />
                  </button>
                }
              />
              <div className="cx-table-wrap">
                <table className="cx-t2">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Apprenant</th>
                      <th>Offre</th>
                      <th>Moyen</th>
                      <th>Quand</th>
                      <th>Statut</th>
                      <th className="cx-n">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="cx-muted">
                          Aucun paiement récent
                        </td>
                      </tr>
                    ) : (
                      lastPayments.map((p, i) => (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>{learnerName(p)}</td>
                          <td>{paymentOffer(p)}</td>
                          <td>{paymentChannelLabel(p)}</td>
                          <td>{formatRelativeTime(p.updatedAt || p.createdAt)}</td>
                          <td>
                            {p.status === 'approved' ? (
                              <span className="cx-chip-ok">
                                <Check aria-hidden />
                                {paymentStatusLabel(p.status)}
                              </span>
                            ) : (
                              <span className={`cx-chip-ok cx-chip-${p.status === 'pending' ? 'wait' : 'ko'}`}>
                                {paymentStatusLabel(p.status)}
                              </span>
                            )}
                          </td>
                          <td className="cx-n">{fcfa(p.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="cx-dash-side">
              <section className="cx-panel">
                <PanelHead
                  icon={<Wallet aria-hidden />}
                  title="Offres vendues"
                  sub={`Répartition du CA de ${monthName(date)}`}
                />
                {byModule.length ? (
                  <div className="cx-ct">
                    {byModule.map((row, i) => (
                      <div className="cx-ct-row" key={row.key}>
                        <span className="cx-ct-ic" style={{ color: SLICE_COLORS[i % SLICE_COLORS.length] }}>
                          {moduleIcon(row.key)}
                        </span>
                        <div className="cx-ct-mid">
                          <div className="cx-ct-top">
                            <span>{row.label}</span>
                            <em>{fcfa(row.ca)}</em>
                          </div>
                          <span className="cx-ct-bar">
                            <i
                              style={{
                                width: `${Math.max(3, (row.ca / maxModule) * 100)}%`,
                                background: SLICE_COLORS[i % SLICE_COLORS.length],
                              }}
                            />
                          </span>
                        </div>
                        <b>{Math.round((row.ca / moduleTotal) * 100)} %</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cx-muted">Aucune vente ce mois.</p>
                )}
              </section>
              <section className="cx-panel cx-retain">
                <span className="cx-rt-ico">
                  <Lightbulb aria-hidden />
                </span>
                <div>
                  <b>À retenir</b>
                  <p>{insight}</p>
                </div>
                <span className="cx-rt-tr">
                  <Sparkles aria-hidden />
                </span>
              </section>
            </div>
          </div>

        </>
      ) : null}
    </>
  )
}
