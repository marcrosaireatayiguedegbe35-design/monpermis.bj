import { useCallback, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Coins, HandCoins, RefreshCw, Wallet } from 'lucide-react'
import { fetchEarnings, type EarningsData } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { dateParts, Empty, formatMoney, nf, Notice } from '../components/model/Kit'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isoDay(value?: string | null) {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sizeClass(label: string) {
  return label.length > 13 ? 'mp-t-xs' : label.length > 10 ? 'mp-t-sm' : undefined
}

export function RevenusPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'sessions' | 'payouts'>('sessions')

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchEarnings(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totals = data?.totals
  const trend =
    totals && totals.prevMonthEarned ? ((totals.monthEarned - totals.prevMonthEarned) / totals.prevMonthEarned) * 100 : null
  const paidShare = totals && totals.totalEarned ? Math.min(100, Math.round((totals.totalPaid / totals.totalEarned) * 100)) : 0
  const sessions = data?.recentSessions ?? []
  const payouts = data?.payouts ?? []
  const outstandingLabel = formatMoney(totals?.outstanding ?? 0)
  const heroSize = outstandingLabel.length > 15 ? ' mp-xs' : outstandingLabel.length > 12 ? ' mp-sm' : ''

  return (
    <PageSection
      kicker="Finances"
      title="Mes revenus"
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} />
      {loading && !data ? <p className="cx-loading">Chargement…</p> : null}

      {totals ? (
        <>
          <section className={`mp-rev-hero${heroSize}`}>
            <div className="mp-rev-top">
              <span className="mp-rev-ico">
                <HandCoins aria-hidden />
              </span>
              <div>
                <small>Reste à recevoir</small>
                <b>{outstandingLabel}</b>
              </div>
            </div>
            <p>
              {totals.pendingEarned > 0
                ? `+ ${formatMoney(totals.pendingEarned)} de séances confirmées à venir`
                : 'Aucune séance confirmée en cours'}
            </p>
            <div className="mp-rev-bar" role="img" aria-label={`${paidShare} % des gains déjà versés`}>
              <i style={{ width: `${paidShare}%` }} />
            </div>
            <div className="mp-rev-bar-label">
              <span>Déjà versé : {formatMoney(totals.totalPaid)}</span>
              <span>{paidShare} %</span>
            </div>
          </section>

          <div className="mp-rev-tiles">
            <div className="mp-rev-tile">
              <span className="mp-rev-tile-ico">
                <Wallet aria-hidden />
              </span>
              <small>Ce mois</small>
              <b className={sizeClass(formatMoney(totals.monthEarned))}>{formatMoney(totals.monthEarned)}</b>
              {trend !== null ? (
                <em className={trend >= 0 ? 'up' : 'down'}>
                  {trend >= 0 ? <ArrowUpRight aria-hidden /> : <ArrowDownRight aria-hidden />}
                  {Math.abs(Math.round(trend))} % vs mois dernier
                </em>
              ) : (
                <em className="flat">Mois dernier : {formatMoney(totals.prevMonthEarned)}</em>
              )}
            </div>
            <div className="mp-rev-tile">
              <span className="mp-rev-tile-ico">
                <Coins aria-hidden />
              </span>
              <small>Gains cumulés</small>
              <b className={sizeClass(formatMoney(totals.totalEarned))}>{formatMoney(totals.totalEarned)}</b>
              <em className="flat">
                {nf(totals.completedSessions)} séance{totals.completedSessions > 1 ? 's' : ''} · {nf(totals.hoursCompleted)} h
              </em>
            </div>
          </div>

          <div className="mp-ag-seg" role="group" aria-label="Détail des revenus">
            <button type="button" className={tab === 'sessions' ? 'is-on' : ''} aria-pressed={tab === 'sessions'} onClick={() => setTab('sessions')}>
              Séances <b>{sessions.length}</b>
            </button>
            <button type="button" className={tab === 'payouts' ? 'is-on' : ''} aria-pressed={tab === 'payouts'} onClick={() => setTab('payouts')}>
              Versements <b>{payouts.length}</b>
            </button>
          </div>

          {tab === 'sessions' ? (
            sessions.length === 0 ? (
              <section className="cx-panel">
                <Empty>Aucune séance terminée pour le moment.</Empty>
              </section>
            ) : (
              <div className="mp-ag">
                {sessions.map((item) => {
                  const day = item.creneau?.date || isoDay(item.completedAt)
                  const parts = day ? dateParts(day) : null
                  return (
                    <article key={item.id} className="mp-ag-item">
                      <div className="mp-ag-row">
                        <span className="mp-ag-time">
                          <b>{parts?.day ?? '—'}</b>
                          <small>{parts?.month ?? ''}</small>
                        </span>
                        <span className="mp-ag-who">
                          <b>{item.user?.fullName || 'Apprenant'}</b>
                          <small>
                            {item.creneau ? `${item.creneau.startTime} – ${item.creneau.endTime} · ` : ''}
                            {item.heures} h
                          </small>
                        </span>
                        <span className="mp-ag-side">
                          <b>{formatMoney(item.priceFcfa)}</b>
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          ) : payouts.length === 0 ? (
            <section className="cx-panel">
              <Empty>Aucun versement enregistré.</Empty>
            </section>
          ) : (
            <div className="mp-ag">
              {payouts.map((item) => {
                const day = isoDay(item.paidAt)
                const parts = day ? dateParts(day) : null
                return (
                  <article key={item.id} className="mp-ag-item mp-ag-paid">
                    <div className="mp-ag-row">
                      <span className="mp-ag-time">
                        <b>{parts?.day ?? '—'}</b>
                        <small>{parts?.month ?? ''}</small>
                      </span>
                      <span className="mp-ag-who">
                        <b>{formatMoney(item.amountFcfa)}</b>
                        <small>{[item.periodLabel, item.note].filter(Boolean).join(' · ') || formatDate(item.paidAt)}</small>
                      </span>
                      <span className="mp-ag-side">
                        <em className="ok">Versé</em>
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </PageSection>
  )
}
