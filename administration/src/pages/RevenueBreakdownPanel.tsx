import { useEffect, useState } from 'react'
import { fetchRevenueBreakdown, type RevenueBreakdown } from '../api/conduiteFinance'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { SkeletonBlock } from '../ui'

const money = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0)

type Key = 'today' | 'week' | 'month' | 'all'
const LABELS: [Key, string][] = [
  ['today', 'Aujourd’hui'],
  ['week', 'Cette semaine'],
  ['month', 'Ce mois'],
  ['all', 'Depuis le début'],
]

/** Où va l'argent : cours du Code d'un côté, conduite de l'autre (avec la part des moniteurs et la commission). */
export function RevenueBreakdownPanel() {
  const [data, setData] = useState<RevenueBreakdown | null>(null)
  const [period, setPeriod] = useState<Key>('month')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    fetchRevenueBreakdown(token)
      .then(setData)
      .catch((err) => setError(isAuthError(err) ? err.message : 'Chargement impossible'))
  }, [])

  if (error) return <p className="cx-note cx-note-err" role="alert">{error}</p>
  if (!data) return <SkeletonBlock rows={4} />

  const p = data.periods[period]
  const total = p.revenue.total || 1
  const codePct = Math.round((p.revenue.code / total) * 100)
  const drivePct = Math.round((p.revenue.conduite / total) * 100)

  return (
    <div className="cx-view" style={{ gap: '1rem' }}>
      <div className="cx-tabs" role="tablist" aria-label="Période">
        {LABELS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={period === key} className={period === key ? 'cx-active' : ''} onClick={() => setPeriod(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="cx-kc-grid cx-kc-grid-3">
        <div className="cx-panel cx-split-card">
          <small>Encaissé au total</small>
          <b className="cx-split-big">{money(p.revenue.total)}</b>
          <span className="cx-muted">Code + conduite{p.revenue.other ? ' + autres' : ''}</span>
        </div>
        <div className="cx-panel cx-split-card">
          <small>Cours du Code</small>
          <b className="cx-split-big">{money(p.revenue.code)}</b>
          <span className="cx-muted">{p.revenue.total ? `${codePct} % des encaissements` : '—'}</span>
        </div>
        <div className="cx-panel cx-split-card">
          <small>Conduite</small>
          <b className="cx-split-big">{money(p.revenue.conduite)}</b>
          <span className="cx-muted">{p.revenue.total ? `${drivePct} % des encaissements` : '—'}</span>
        </div>
      </div>

      <div className="cx-split-bar" role="img" aria-label={`Code ${codePct} %, conduite ${drivePct} %`}>
        <i style={{ width: `${codePct}%`, background: '#2563eb' }} />
        <i style={{ width: `${drivePct}%`, background: '#00a047' }} />
      </div>
      <p className="cx-muted" style={{ margin: 0 }}>
        <span className="cx-dot" style={{ background: '#2563eb' }} /> Code &nbsp; <span className="cx-dot" style={{ background: '#00a047' }} /> Conduite
      </p>

      <div className="cx-grid-2">
        <section className="cx-panel">
          <h3 className="cx-panel-title">Détail de la conduite</h3>
          <table className="cx-mini-table">
            <tbody>
              <tr><td>Packs d’heures</td><td>{money(p.revenue.conduiteDetail.packsHeures)}</td></tr>
              <tr><td>Réservations payées directement</td><td>{money(p.revenue.conduiteDetail.reservationsDirectes)}</td></tr>
              <tr><td>Vidéos pédagogiques</td><td>{money(p.revenue.conduiteDetail.videos)}</td></tr>
              <tr className="cx-total"><td>Total conduite</td><td>{money(p.revenue.conduite)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="cx-panel">
          <h3 className="cx-panel-title">Séances effectuées : répartition</h3>
          <table className="cx-mini-table">
            <tbody>
              <tr><td>Séances terminées</td><td>{p.sessions.sessions}</td></tr>
              <tr><td>Valeur des séances</td><td>{money(p.sessions.price)}</td></tr>
              <tr><td>Part des moniteurs</td><td>{money(p.sessions.moniteurShare)}</td></tr>
              <tr className="cx-total"><td>Commission plateforme ({data.feePercent} %)</td><td>{money(p.sessions.platformFee)}</td></tr>
            </tbody>
          </table>
          <p className="cx-muted" style={{ margin: '.6rem 0 0' }}>
            Reste à régler aux moniteurs : <b>{money(data.dueToMoniteurs.amount)}</b> ({data.dueToMoniteurs.count} séance{data.dueToMoniteurs.count > 1 ? 's' : ''}).
          </p>
        </section>
      </div>
    </div>
  )
}
