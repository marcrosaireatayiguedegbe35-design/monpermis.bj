import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, Percent, RefreshCw } from 'lucide-react'
import { fetchSettlements, paySettlement, saveFeePercent, type SettlementsData } from '../api/conduiteFinance'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../ui'

const money = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0)

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Règlement du soir : l'administrateur verse leur part aux moniteurs pour les séances terminées. */
export function SettlementsPanel() {
  const [data, setData] = useState<SettlementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [fee, setFee] = useState('')
  const [savingFee, setSavingFee] = useState(false)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const next = await fetchSettlements(token)
      setData(next)
      setFee(String(next.feePercent))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handlePay = async (moniteurId: string, name: string, ids: string[] | undefined, amount: number) => {
    const token = getAdminToken()
    if (!token) return
    if (!window.confirm(`Confirmer le règlement de ${money(amount)} à ${name} ?\n\nÀ faire APRÈS avoir envoyé l’argent (Mobile Money). Cette action est enregistrée.`)) return
    setBusyId(moniteurId)
    setError(null)
    setSuccess(null)
    try {
      const result = await paySettlement(token, { moniteurId, reservationIds: ids })
      setSuccess(`${money(result.amountFcfa)} réglés à ${name} (${result.settledCount} séance${result.settledCount > 1 ? 's' : ''}).`)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Règlement impossible')
    } finally {
      setBusyId(null)
    }
  }

  const handleFee = async () => {
    const token = getAdminToken()
    if (!token) return
    setSavingFee(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await saveFeePercent(token, Number(fee))
      setSuccess(`Commission enregistrée : ${result.platformFeePercent} %. Elle s’applique aux séances terminées à partir de maintenant.`)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSavingFee(false)
    }
  }

  if (loading && !data) return <SkeletonBlock rows={4} />

  return (
    <div className="cx-view" style={{ gap: '1rem' }}>
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-kc-grid cx-kc-grid-3">
        <div className="cx-panel cx-split-card">
          <small>À régler maintenant</small>
          <b className="cx-split-big">{money(data?.totals.dueNowAmount ?? 0)}</b>
          <span className="cx-muted">{data?.totals.dueNowCount ?? 0} séance(s) échue(s) à 18 h ou avant</span>
        </div>
        <div className="cx-panel cx-split-card">
          <small>Séances à venir à régler</small>
          <b className="cx-split-big">{money(data?.totals.laterAmount ?? 0)}</b>
          <span className="cx-muted">Terminées, échéance ce soir à 18 h</span>
        </div>
        <div className="cx-panel cx-split-card">
          <small>Commission de la plateforme</small>
          <div className="cx-field-row" style={{ alignItems: 'center' }}>
            <input className="cx-input" style={{ maxWidth: '6rem' }} type="number" min={0} max={60} step={1} value={fee} onChange={(e) => setFee(e.target.value)} aria-label="Commission en pourcentage" />
            <span>%</span>
            <button type="button" className="cx-btn cx-btn-sm" onClick={() => void handleFee()} disabled={savingFee || Number(fee) === data?.feePercent}>
              <Percent aria-hidden />
              {savingFee ? '…' : 'Enregistrer'}
            </button>
          </div>
          <span className="cx-muted">Le reste va au moniteur ({100 - (Number(fee) || 0)} %).</span>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <div className="cx-ph-txt">
            <h3 className="cx-panel-title">Règlements des moniteurs</h3>
            <p className="cx-muted">Envoyez la part du moniteur (Mobile Money), puis confirmez ici pour garder la trace.</p>
          </div>
          <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden />
            Actualiser
          </button>
        </div>

        {!data?.moniteurs.length ? (
          <EmptyState icon={<CheckCircle2 size={28} />} title="Tout est réglé" description="Aucune séance terminée en attente de règlement." />
        ) : (
          <div className="cx-settle-list">
            {data.moniteurs.map((m) => {
              const open = openId === m.moniteurId
              const dueIds = m.sessions.filter((s) => s.dueNow).map((s) => s.id)
              return (
                <article key={m.moniteurId} className="cx-settle">
                  <header>
                    <div>
                      <b>{m.moniteurName}</b>
                      <small>{m.phone || 'Téléphone non renseigné'}</small>
                    </div>
                    <div className="cx-settle-amount">
                      <b>{money(m.dueNowAmount + m.laterAmount)}</b>
                      <small>{m.dueNowCount + m.laterCount} séance(s)</small>
                    </div>
                  </header>
                  <div className="cx-settle-actions">
                    <button type="button" className="cx-btn cx-btn-fill" disabled={busyId === m.moniteurId || m.sessions.length === 0} onClick={() => void handlePay(m.moniteurId, m.moniteurName, m.dueNowCount > 0 ? dueIds : m.sessions.map((s) => s.id), m.dueNowCount > 0 ? m.dueNowAmount : m.dueNowAmount + m.laterAmount)}>
                      <CheckCircle2 aria-hidden />
                      {m.dueNowCount > 0 ? `Régler ${money(m.dueNowAmount)}` : `Régler d’avance ${money(m.laterAmount)}`}
                    </button>
                    <button type="button" className="cx-btn" onClick={() => setOpenId(open ? null : m.moniteurId)} aria-expanded={open}>
                      Détail
                      <ChevronDown aria-hidden style={{ transform: open ? 'rotate(180deg)' : undefined }} />
                    </button>
                  </div>
                  {open ? (
                    <table className="cx-mini-table">
                      <thead>
                        <tr><th>Séance</th><th>Apprenant</th><th>Prix</th><th>Part moniteur</th><th>Avis</th></tr>
                      </thead>
                      <tbody>
                        {m.sessions.map((s) => (
                          <tr key={s.id}>
                            <td>{dayLabel(s.date)} · {s.startTime}–{s.endTime}{s.dueNow ? '' : ' (ce soir)'}</td>
                            <td>{s.learnerName}</td>
                            <td>{money(s.priceFcfa)}</td>
                            <td><b>{money(s.moniteurShareFcfa)}</b></td>
                            <td>{s.reviewed ? 'Reçu' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {data?.recentSettled.length ? (
        <section className="cx-panel">
          <h3 className="cx-panel-title">Derniers règlements</h3>
          <table className="cx-mini-table">
            <tbody>
              {data.recentSettled.map((r) => (
                <tr key={r.id}>
                  <td>{r.moniteurName}</td>
                  <td>{dayLabel(r.date)}</td>
                  <td>{money(r.amount)}</td>
                  <td>{r.settledAt ? new Date(r.settledAt).toLocaleDateString('fr-FR') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  )
}
