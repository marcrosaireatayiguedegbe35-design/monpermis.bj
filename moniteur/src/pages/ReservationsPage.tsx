import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, RefreshCw, X } from 'lucide-react'
import {
  confirmReservation,
  fetchReservations,
  refuseReservation,
  type ReservationItem,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { dateParts, Empty, formatMoney, Notice } from '../components/model/Kit'

type Tab = 'pending' | 'confirmed'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toMinutes(value: string) {
  const [h, m] = value.split(':').map((v) => parseInt(v, 10) || 0)
  return h * 60 + m
}

function durationLabel(start: string, end: string) {
  const hours = Math.max(0, (toMinutes(end) - toMinutes(start)) / 60)
  if (!hours) return ''
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace('.', ',')} h`
}

export function ReservationsPage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pending')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReservations(token, 'all_active')
      setItems(data.reservations)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(() => items.filter((item) => item.status === 'pending_moniteur'), [items])
  const confirmed = useMemo(() => items.filter((item) => item.status === 'confirmed'), [items])
  const visible = tab === 'pending' ? pending : confirmed

  const handleConfirm = async (item: ReservationItem) => {
    const token = getMoniteurToken()
    if (!token) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await confirmReservation(token, item.id)
      setSuccess(`Réservation confirmée pour ${item.user?.fullName || 'l’apprenant'}.`)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Confirmation impossible')
    } finally {
      setBusyId(null)
    }
  }

  const handleRefuse = async (item: ReservationItem) => {
    const token = getMoniteurToken()
    if (!token) return
    const reason = window.prompt('Motif du refus (optionnel) :', 'Indisponible sur ce créneau')
    if (reason === null) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await refuseReservation(token, item.id, reason)
      setSuccess('Demande refusée. Le créneau a été libéré.')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Refus impossible')
    } finally {
      setBusyId(null)
    }
  }

  // Regroupement par jour, dans l'ordre chronologique.
  const groups = useMemo(() => {
    const map = new Map<string, ReservationItem[]>()
    for (const item of visible) {
      const key = item.creneau?.date || ''
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => ({
        date,
        list: list.sort((a, b) => (a.creneau?.startTime || '').localeCompare(b.creneau?.startTime || '')),
      }))
  }, [visible])

  return (
    <PageSection
      kicker="Réservations"
      title="Mes rendez-vous"
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} success={success} />

      <div className="mp-ag-seg" role="group" aria-label="Filtrer les réservations">
        <button
          type="button"
          className={tab === 'pending' ? 'is-on' : ''}
          aria-pressed={tab === 'pending'}
          onClick={() => {
            setTab('pending')
            setOpenId(null)
          }}
        >
          À confirmer <b>{pending.length}</b>
        </button>
        <button
          type="button"
          className={tab === 'confirmed' ? 'is-on' : ''}
          aria-pressed={tab === 'confirmed'}
          onClick={() => {
            setTab('confirmed')
            setOpenId(null)
          }}
        >
          Confirmées <b>{confirmed.length}</b>
        </button>
      </div>

      {loading && items.length === 0 ? <p className="cx-loading">Chargement…</p> : null}
      {!loading && visible.length === 0 ? (
        <section className="cx-panel">
          <Empty>{tab === 'pending' ? 'Aucune demande en attente.' : 'Aucune séance confirmée.'}</Empty>
        </section>
      ) : null}

      <div className="mp-ag">
        {groups.map((group) => {
          const parts = group.date ? dateParts(group.date) : null
          const label = !group.date
            ? 'Date inconnue'
            : group.date === todayKey()
              ? `Aujourd’hui · ${parts?.long}`
              : parts?.long
          return (
            <section key={group.date || 'none'}>
              <h3 className="mp-ag-day">{label}</h3>
              {group.list.map((item) => {
                const isPending = tab === 'pending'
                const open = openId === item.id
                const start = item.creneau?.startTime
                const end = item.creneau?.endTime
                return (
                  <article key={item.id} className={`mp-ag-item${isPending ? ' is-pending' : ''}${open ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="mp-ag-row"
                      aria-expanded={isPending ? open : undefined}
                      onClick={() => isPending && setOpenId(open ? null : item.id)}
                    >
                      <span className="mp-ag-time">
                        <b>{start || '—'}</b>
                        <small>{end || ''}</small>
                      </span>
                      <span className="mp-ag-who">
                        <b>{item.user?.fullName || 'Apprenant'}</b>
                        <small>
                          {[item.user?.phone || item.user?.email, start && end ? durationLabel(start, end) : ''].filter(Boolean).join(' · ')}
                        </small>
                      </span>
                      <span className="mp-ag-side">
                        <b>{formatMoney(item.priceFcfa)}</b>
                        <em className={isPending ? 'wait' : 'ok'}>{isPending ? 'En attente' : 'Confirmée'}</em>
                      </span>
                      {isPending ? <ChevronDown className="mp-ag-chev" aria-hidden /> : null}
                    </button>
                    {isPending && open ? (
                      <div className="mp-ag-actions">
                        <button
                          type="button"
                          className="mp-ag-refuse"
                          disabled={busyId === item.id}
                          onClick={() => void handleRefuse(item)}
                        >
                          <X aria-hidden />
                          Refuser
                        </button>
                        <button
                          type="button"
                          className="mp-ag-accept"
                          disabled={busyId === item.id}
                          onClick={() => void handleConfirm(item)}
                        >
                          <Check aria-hidden />
                          Accepter
                        </button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
      {tab === 'pending' && visible.length > 0 ? (
        <p className="mp-ag-hint">Touchez une demande pour répondre.</p>
      ) : null}
    </PageSection>
  )
}
