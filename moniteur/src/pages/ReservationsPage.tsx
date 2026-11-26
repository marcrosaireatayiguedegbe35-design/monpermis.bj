import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Phone, RefreshCw, X } from 'lucide-react'
import {
  confirmReservation,
  fetchHistory,
  fetchReservations,
  refuseReservation,
  type ReservationItem,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { formatMoney, Notice } from '../components/model/Kit'

type Tab = 'upcoming' | 'pending' | 'done'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function initialsOf(name?: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'A').slice(0, 2).toUpperCase()
}

/** « Aujourd'hui », « Demain » ou « Jeu. 27 nov. » */
function dayLabel(date?: string) {
  if (!date) return ''
  const diff = Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${todayKey()}T12:00:00`).getTime()) / 86400000)
  if (diff === 0) return 'Aujourd’hui'
  if (diff === 1) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace(/^./, (c) => c.toUpperCase())
}

function sortByDate(list: ReservationItem[], reverse = false) {
  const key = (item: ReservationItem) => `${item.creneau?.date || ''} ${item.creneau?.startTime || ''}`
  return [...list].sort((a, b) => (reverse ? key(b).localeCompare(key(a)) : key(a).localeCompare(key(b))))
}

export function ReservationsPage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [done, setDone] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('upcoming')
  const firstLoad = useRef(true)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [active, completed] = await Promise.all([
        fetchReservations(token, 'all_active'),
        fetchHistory(token, 'completed').catch(() => ({ reservations: [] as ReservationItem[] })),
      ])
      setItems(active.reservations)
      setDone(completed.reservations)
      // À l'ouverture, on met en avant les demandes qui attendent une réponse.
      if (firstLoad.current) {
        firstLoad.current = false
        if (active.reservations.some((item) => item.status === 'pending_moniteur')) setTab('pending')
      }
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(() => sortByDate(items.filter((item) => item.status === 'pending_moniteur')), [items])
  const upcoming = useMemo(() => sortByDate(items.filter((item) => item.status === 'confirmed')), [items])
  const finished = useMemo(() => sortByDate(done, true), [done])
  const visible = tab === 'pending' ? pending : tab === 'upcoming' ? upcoming : finished

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

  const empty =
    tab === 'pending' ? 'Aucune demande en attente.' : tab === 'upcoming' ? 'Aucune séance à venir.' : 'Aucune séance terminée.'

  return (
    <PageSection
      kicker="Réservations"
      title="Séances"
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} success={success} />

      <div className="mp-ses-tabs" role="tablist" aria-label="Filtrer les séances">
        <button type="button" role="tab" aria-selected={tab === 'upcoming'} className={tab === 'upcoming' ? 'is-on' : ''} onClick={() => setTab('upcoming')}>
          À venir
        </button>
        <button type="button" role="tab" aria-selected={tab === 'pending'} className={tab === 'pending' ? 'is-on' : ''} onClick={() => setTab('pending')}>
          À confirmer{pending.length ? <b>{pending.length}</b> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'done'} className={tab === 'done' ? 'is-on' : ''} onClick={() => setTab('done')}>
          Terminées
        </button>
      </div>

      {loading && items.length === 0 && done.length === 0 ? <p className="cx-loading">Chargement…</p> : null}
      {!loading && visible.length === 0 ? <p className="mp-ses-empty">{empty}</p> : null}

      <div className="mp-ses-list">
        {visible.map((item) => {
          const isPending = tab === 'pending'
          const start = item.creneau?.startTime
          const end = item.creneau?.endTime
          const phone = item.user?.phone
          return (
            <article key={item.id} className={`mp-ses${isPending ? ' is-pending' : ''}${tab === 'done' ? ' is-done' : ''}`}>
              <div className="mp-ses-top">
                <span className={`mp-ses-chip${isPending ? ' is-wait' : ''}`}>
                  {isPending ? 'À confirmer' : tab === 'done' ? 'Terminée' : 'Confirmée'}
                </span>
                <small>{dayLabel(item.creneau?.date)}</small>
              </div>
              <div className="mp-ses-who">
                <span className="mp-ses-avatar" aria-hidden="true">
                  {initialsOf(item.user?.fullName)}
                </span>
                <span className="mp-ses-info">
                  <b>{item.user?.fullName || 'Apprenant'}</b>
                  <small>
                    {start || '—'} – {end || '—'} · {formatMoney(item.priceFcfa)}
                  </small>
                </span>
                {phone && !isPending && tab !== 'done' ? (
                  <a className="mp-ses-call" href={`tel:${phone}`} aria-label={`Appeler ${item.user?.fullName || 'l’apprenant'}`}>
                    <Phone aria-hidden />
                  </a>
                ) : null}
              </div>
              {isPending ? (
                <div className="mp-ses-actions">
                  <button type="button" className="is-accept" disabled={busyId === item.id} onClick={() => void handleConfirm(item)}>
                    <Check aria-hidden />
                    Accepter
                  </button>
                  <button type="button" className="is-refuse" disabled={busyId === item.id} onClick={() => void handleRefuse(item)}>
                    <X aria-hidden />
                    Refuser
                  </button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </PageSection>
  )
}
