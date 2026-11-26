import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchHistory, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { formatMoney, Notice } from '../components/model/Kit'

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'completed', label: 'Terminées' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'cancelled', label: 'Annulées' },
] as const

function initialsOf(name?: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'A').slice(0, 2).toUpperCase()
}

function statusLabel(status: string) {
  if (status === 'completed') return 'Terminée'
  if (status === 'confirmed') return 'Confirmée'
  if (status === 'cancelled') return 'Annulée'
  return status
}

function monthKey(date?: string) {
  return date ? date.slice(0, 7) : ''
}

function monthTitle(key: string) {
  if (!key) return 'Date inconnue'
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

function dayText(date?: string) {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace(/^./, (c) => c.toUpperCase())
}

export function HistoriquePage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory(token, status || undefined)
      setItems(data.reservations)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  // Séances regroupées par mois, les plus récentes d'abord.
  const groups = useMemo(() => {
    const map = new Map<string, ReservationItem[]>()
    for (const item of items) {
      const key = monthKey(item.creneau?.date)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => ({
        key,
        list: list.sort((a, b) =>
          `${b.creneau?.date || ''} ${b.creneau?.startTime || ''}`.localeCompare(`${a.creneau?.date || ''} ${a.creneau?.startTime || ''}`),
        ),
      }))
  }, [items])

  return (
    <PageSection
      kicker="Historique"
      title="Historique des séances"
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} />

      <Link to="/profil" className="mp-wk-back">
        <ChevronLeft aria-hidden />
        Retour au profil
      </Link>

      <div className="mp-ses-tabs" role="tablist" aria-label="Filtrer par statut">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            className={status === filter.value ? 'is-on' : ''}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 ? <p className="cx-loading">Chargement…</p> : null}
      {!loading && items.length === 0 ? <p className="mp-ses-empty">Aucune séance dans cet historique.</p> : null}

      {groups.map((group) => (
        <section key={group.key || 'none'} className="mp-hs-group">
          <h3 className="mp-hs-month">
            {monthTitle(group.key)}
            <small>{group.list.length}</small>
          </h3>
          <div className="mp-ses-list">
            {group.list.map((item) => (
              <article key={item.id} className={`mp-ses is-done${item.status === 'cancelled' ? ' is-cancelled' : ''}`}>
                <div className="mp-ses-top">
                  <span className={`mp-ses-chip${item.status === 'cancelled' ? ' is-off' : item.status === 'confirmed' ? '' : ' is-wait'}`}>
                    {statusLabel(item.status)}
                  </span>
                  <small>{dayText(item.creneau?.date)}</small>
                </div>
                <div className="mp-ses-who">
                  <span className="mp-ses-avatar" aria-hidden="true">
                    {initialsOf(item.user?.fullName)}
                  </span>
                  <span className="mp-ses-info">
                    <b>{item.user?.fullName || 'Apprenant'}</b>
                    <small>
                      {item.creneau ? `${item.creneau.startTime} – ${item.creneau.endTime} · ` : ''}
                      {formatMoney(item.priceFcfa)}
                    </small>
                  </span>
                </div>
                {item.cancellationReason ? <p className="mp-hs-reason">Motif : {item.cancellationReason}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </PageSection>
  )
}
