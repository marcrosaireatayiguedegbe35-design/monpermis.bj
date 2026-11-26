import { useCallback, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react'
import { fetchEarnings, type EarningsData } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { formatMoney, nf, Notice } from '../components/model/Kit'

function initialsOf(name?: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'A').slice(0, 2).toUpperCase()
}

function shortDay(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
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

  return (
    <PageSection
      kicker="Finances"
      title="Revenus"
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
          <section className="mp-rv-hero">
            <small>Gagné ce mois-ci</small>
            <b>{formatMoney(totals.monthEarned)}</b>
            {trend !== null ? (
              <em className={trend >= 0 ? 'up' : 'down'}>
                {trend >= 0 ? <ArrowUpRight aria-hidden /> : <ArrowDownRight aria-hidden />}
                {Math.abs(Math.round(trend))} % par rapport au mois dernier
              </em>
            ) : (
              <em>Mois dernier : {formatMoney(totals.prevMonthEarned)}</em>
            )}
            <div className="mp-rv-split">
              <div>
                <small>Déjà versé</small>
                <b>{formatMoney(totals.totalPaid)}</b>
              </div>
              <div>
                <small>Reste à recevoir</small>
                <b>{formatMoney(totals.outstanding)}</b>
              </div>
            </div>
            <div className="mp-rv-bar" role="img" aria-label={`${paidShare} % des gains déjà versés`}>
              <i style={{ width: `${paidShare}%` }} />
            </div>
          </section>

          <p className="mp-rv-note">
            {totals.pendingEarned > 0
              ? `+ ${formatMoney(totals.pendingEarned)} de séances confirmées à venir · `
              : ''}
            {nf(totals.completedSessions)} séance{totals.completedSessions > 1 ? 's' : ''} terminée{totals.completedSessions > 1 ? 's' : ''} ·{' '}
            {nf(totals.hoursCompleted)} h
          </p>

          <div className="mp-ses-tabs" role="tablist" aria-label="Détail des revenus">
            <button type="button" role="tab" aria-selected={tab === 'sessions'} className={tab === 'sessions' ? 'is-on' : ''} onClick={() => setTab('sessions')}>
              Séances
            </button>
            <button type="button" role="tab" aria-selected={tab === 'payouts'} className={tab === 'payouts' ? 'is-on' : ''} onClick={() => setTab('payouts')}>
              Versements
            </button>
          </div>

          {tab === 'sessions' ? (
            sessions.length === 0 ? (
              <p className="mp-ses-empty">Aucune séance terminée pour le moment.</p>
            ) : (
              <div className="mp-rv-list">
                {sessions.map((item) => (
                  <div key={item.id} className="mp-rv-row">
                    <span className="mp-rv-avatar" aria-hidden="true">
                      {initialsOf(item.user?.fullName)}
                    </span>
                    <span className="mp-rv-info">
                      <b>{item.user?.fullName || 'Apprenant'}</b>
                      <small>
                        {shortDay(item.creneau?.date || item.completedAt)} · {item.heures} h
                      </small>
                    </span>
                    <span className="mp-rv-amount">+ {formatMoney(item.priceFcfa)}</span>
                  </div>
                ))}
              </div>
            )
          ) : payouts.length === 0 ? (
            <p className="mp-ses-empty">Aucun versement enregistré.</p>
          ) : (
            <div className="mp-rv-list">
              {payouts.map((item) => (
                <div key={item.id} className="mp-rv-row">
                  <span className="mp-rv-avatar is-paid" aria-hidden="true">
                    ✓
                  </span>
                  <span className="mp-rv-info">
                    <b>{formatMoney(item.amountFcfa)}</b>
                    <small>{[shortDay(item.paidAt), item.periodLabel, item.note].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className="mp-rv-amount is-paid">Versé</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </PageSection>
  )
}
