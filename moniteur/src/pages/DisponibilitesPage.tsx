import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createCreneau,
  deleteCreneau,
  fetchAvailability,
  fetchMyCreneaux,
  saveAvailability,
  updateCreneau,
  type CreneauItem,
  type WeeklySlot,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { Empty, formatMoney, Notice } from '../components/model/Kit'

const WEEK_DAYS = [
  { dayOfWeek: 1, label: 'Lundi' },
  { dayOfWeek: 2, label: 'Mardi' },
  { dayOfWeek: 3, label: 'Mercredi' },
  { dayOfWeek: 4, label: 'Jeudi' },
  { dayOfWeek: 5, label: 'Vendredi' },
  { dayOfWeek: 6, label: 'Samedi' },
  { dayOfWeek: 0, label: 'Dimanche' },
] as const

type TimeInterval = { start: string; end: string }
type EditDayHours = {
  dayOfWeek: number
  enabled: boolean
  morning: TimeInterval
  afternoonEnabled: boolean
  afternoon: TimeInterval
}

function sortSlots(slots: WeeklySlot[]) {
  return [...slots].sort((a, b) => String(a.start).localeCompare(String(b.start)))
}

function toEditDayHours(slots: WeeklySlot[] | undefined): EditDayHours[] {
  return WEEK_DAYS.map(({ dayOfWeek }) => {
    const same = sortSlots((slots || []).filter((slot) => Number(slot.dayOfWeek) === dayOfWeek))
    const first = same[0]
    const second = same[1]
    return {
      dayOfWeek,
      enabled: same.length > 0,
      morning: { start: first?.start || '08:00', end: first?.end || '12:00' },
      afternoonEnabled: Boolean(second),
      afternoon: { start: second?.start || '14:00', end: second?.end || '18:00' },
    }
  })
}

function fromEditDayHours(days: EditDayHours[]): WeeklySlot[] {
  const result: WeeklySlot[] = []
  for (const day of days) {
    if (!day.enabled) continue
    result.push({ dayOfWeek: day.dayOfWeek, start: day.morning.start, end: day.morning.end })
    if (day.afternoonEnabled) {
      result.push({ dayOfWeek: day.dayOfWeek, start: day.afternoon.start, end: day.afternoon.end })
    }
  }
  return result
}

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function shortDate(date: string) {
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function summaryOf(day: EditDayHours) {
  if (!day.enabled) return 'Fermé'
  const parts = [`${day.morning.start} – ${day.morning.end}`]
  if (day.afternoonEnabled) parts.push(`${day.afternoon.start} – ${day.afternoon.end}`)
  return parts.join('  ·  ')
}

function Range({
  label,
  value,
  onChange,
}: {
  label: string
  value: TimeInterval
  onChange: (next: TimeInterval) => void
}) {
  return (
    <div className="mp-av-range">
      <span>{label}</span>
      <input type="time" value={value.start} aria-label={`${label} — début`} onChange={(e) => onChange({ ...value, start: e.target.value })} />
      <i aria-hidden="true">→</i>
      <input type="time" value={value.end} aria-label={`${label} — fin`} onChange={(e) => onChange({ ...value, end: e.target.value })} />
    </div>
  )
}

type Tab = 'week' | 'oneoff' | 'booked'
export function DisponibilitesPage() {
  const [items, setItems] = useState<CreneauItem[]>([])
  const [dayHours, setDayHours] = useState<EditDayHours[]>(() => toEditDayHours([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [date, setDate] = useState(todayLocal())
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('week')
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const [savedHours, setSavedHours] = useState('')

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [creneauxData, availability] = await Promise.all([
        fetchMyCreneaux(token, todayLocal()),
        fetchAvailability(token),
      ])
      setItems(creneauxData.creneaux)
      const loaded = toEditDayHours(availability.weeklyAvailability)
      setDayHours(loaded)
      setSavedHours(JSON.stringify(loaded))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const editable = useMemo(() => items.filter((item) => item.editable), [items])
  const reserved = useMemo(() => items.filter((item) => !item.editable), [items])
  const activeDays = dayHours.filter((day) => day.enabled).length
  const dirty = savedHours !== '' && JSON.stringify(dayHours) !== savedHours

  const resetForm = () => {
    setEditingId(null)
    setDate(todayLocal())
    setStartTime('08:00')
    setEndTime('09:00')
  }

  const handleWeeklySave = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    for (const day of dayHours) {
      if (!day.enabled) continue
      if (day.morning.end <= day.morning.start) {
        setError(`Horaires invalides pour ${WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label}`)
        return
      }
      if (day.afternoonEnabled && day.afternoon.end <= day.afternoon.start) {
        setError('Plage après-midi invalide')
        return
      }
    }
    setSavingWeekly(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await saveAvailability(token, fromEditDayHours(dayHours))
      const next = toEditDayHours(data.weeklyAvailability)
      setDayHours(next)
      setSavedHours(JSON.stringify(next))
      setSuccess('Disponibilités hebdomadaires enregistrées. Elles apparaissent dans l’app apprenant.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSavingWeekly(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (editingId) {
        await updateCreneau(token, editingId, { date, startTime, endTime })
        setSuccess('Créneau mis à jour.')
      } else {
        await createCreneau(token, { date, startTime, endTime })
        setSuccess('Créneau publié.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: CreneauItem) => {
    setTab('oneoff')
    setEditingId(item.id)
    setDate(item.date)
    setStartTime(item.startTime)
    setEndTime(item.endTime)
    setSuccess(null)
    setError(null)
  }

  const handleDelete = async (item: CreneauItem) => {
    const token = getMoniteurToken()
    if (!token) return
    if (!window.confirm(`Supprimer le créneau du ${item.date} ${item.startTime}–${item.endTime} ?`)) return
    setError(null)
    try {
      await deleteCreneau(token, item.id)
      setSuccess('Créneau supprimé.')
      if (editingId === item.id) resetForm()
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  const updateDay = (dayOfWeek: number, patch: Partial<EditDayHours>) => {
    setDayHours((prev) => prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)))
  }

  const copyToAll = (source: EditDayHours) => {
    setDayHours((prev) =>
      prev.map((day) =>
        day.enabled
          ? { ...day, morning: { ...source.morning }, afternoonEnabled: source.afternoonEnabled, afternoon: { ...source.afternoon } }
          : day,
      ),
    )
    setSuccess('Horaires appliqués à tous les jours ouverts. Pensez à enregistrer.')
  }

  return (
    <PageSection kicker="Disponibilités" title="Mes horaires">
      <Notice error={error} success={success} />

      <div className="mp-ag-seg" role="group" aria-label="Type de disponibilités">
        <button type="button" className={tab === 'week' ? 'is-on' : ''} aria-pressed={tab === 'week'} onClick={() => setTab('week')}>
          Semaine <b>{activeDays}</b>
        </button>
        <button type="button" className={tab === 'oneoff' ? 'is-on' : ''} aria-pressed={tab === 'oneoff'} onClick={() => setTab('oneoff')}>
          Ponctuels <b>{editable.length}</b>
        </button>
        <button type="button" className={tab === 'booked' ? 'is-on' : ''} aria-pressed={tab === 'booked'} onClick={() => setTab('booked')}>
          Réservés <b>{reserved.length}</b>
        </button>
      </div>

      {loading && items.length === 0 ? <p className="cx-loading">Chargement…</p> : null}

      {tab === 'week' ? (
        <form id="mp-week-form" className="mp-av" onSubmit={handleWeeklySave}>
          <p className="mp-av-intro">
            {activeDays} jour{activeDays > 1 ? 's' : ''} ouvert{activeDays > 1 ? 's' : ''} à la réservation. Touchez un jour pour régler ses horaires.
          </p>
          {dayHours.map((day) => {
            const label = WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label || ''
            const open = openDay === day.dayOfWeek && day.enabled
            return (
              <section key={day.dayOfWeek} className={`mp-av-day${day.enabled ? ' is-on' : ''}${open ? ' is-open' : ''}`}>
                <div className="mp-av-head">
                  <button
                    type="button"
                    className="mp-av-title"
                    aria-expanded={open}
                    disabled={!day.enabled}
                    onClick={() => setOpenDay(open ? null : day.dayOfWeek)}
                  >
                    <b>{label}</b>
                    <small>{summaryOf(day)}</small>
                    {day.enabled ? <ChevronDown aria-hidden /> : null}
                  </button>
                  <label className="mp-switch" aria-label={`${label} ouvert`}>
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => {
                        updateDay(day.dayOfWeek, { enabled: e.target.checked })
                        setOpenDay(e.target.checked ? day.dayOfWeek : null)
                      }}
                    />
                    <span aria-hidden="true" />
                  </label>
                </div>
                {open ? (
                  <div className="mp-av-body">
                    <Range label="Matin" value={day.morning} onChange={(morning) => updateDay(day.dayOfWeek, { morning })} />
                    <div className="mp-av-pm">
                      <label className="mp-av-pmtoggle">
                        <input
                          type="checkbox"
                          checked={day.afternoonEnabled}
                          onChange={(e) => updateDay(day.dayOfWeek, { afternoonEnabled: e.target.checked })}
                        />
                        Ajouter l’après-midi
                      </label>
                      {day.afternoonEnabled ? (
                        <Range label="Après-midi" value={day.afternoon} onChange={(afternoon) => updateDay(day.dayOfWeek, { afternoon })} />
                      ) : null}
                    </div>
                    <button type="button" className="mp-av-copy" onClick={() => copyToAll(day)}>
                      <Copy aria-hidden />
                      Appliquer à tous les jours ouverts
                    </button>
                  </div>
                ) : null}
              </section>
            )
          })}
        </form>
      ) : null}

      {tab === 'oneoff' ? (
        <>
          <form className="mp-av-card" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Modifier le créneau' : 'Nouveau créneau ponctuel'}</h3>
            <label className="mp-av-field">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <div className="mp-av-two">
              <label className="mp-av-field">
                Début
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </label>
              <label className="mp-av-field">
                Fin
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </label>
            </div>
            <div className="mp-av-actions">
              {editingId ? (
                <button type="button" className="mp-av-ghost" onClick={resetForm}>
                  Annuler
                </button>
              ) : null}
              <button type="submit" className="mp-av-primary" disabled={saving}>
                <Plus aria-hidden />
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Publier le créneau'}
              </button>
            </div>
          </form>

          {!loading && editable.length === 0 ? (
            <section className="cx-panel">
              <Empty>Aucun créneau ponctuel libre. Les plages de la semaine suffisent en général.</Empty>
            </section>
          ) : null}
          <div className="mp-ag">
            {editable.map((item) => {
              const open = openSlot === item.id
              return (
                <article key={item.id} className={`mp-ag-item${open ? ' is-open' : ''}`}>
                  <button type="button" className="mp-ag-row" aria-expanded={open} onClick={() => setOpenSlot(open ? null : item.id)}>
                    <span className="mp-ag-time">
                      <b>{item.startTime}</b>
                      <small>{item.endTime}</small>
                    </span>
                    <span className="mp-ag-who">
                      <b>{shortDate(item.date)}</b>
                      <small>{formatMoney(item.priceFcfa)}</small>
                    </span>
                    <span className="mp-ag-side">
                      <em className="ok">Libre</em>
                    </span>
                    <ChevronDown className="mp-ag-chev" aria-hidden />
                  </button>
                  {open ? (
                    <div className="mp-ag-actions">
                      <button type="button" className="mp-ag-refuse" onClick={() => void handleDelete(item)}>
                        <Trash2 aria-hidden />
                        Supprimer
                      </button>
                      <button type="button" className="mp-av-edit" onClick={() => startEdit(item)}>
                        <Pencil aria-hidden />
                        Modifier
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </>
      ) : null}

      {tab === 'booked' ? (
        <>
          {!loading && reserved.length === 0 ? (
            <section className="cx-panel">
              <Empty>Aucun créneau réservé ou bloqué pour le moment.</Empty>
            </section>
          ) : null}
          <div className="mp-ag">
            {reserved.map((item) => (
              <article key={item.id} className="mp-ag-item is-booked">
                <div className="mp-ag-row">
                  <span className="mp-ag-time">
                    <b>{item.startTime}</b>
                    <small>{item.endTime}</small>
                  </span>
                  <span className="mp-ag-who">
                    <b>{shortDate(item.date)}</b>
                    <small>Séance liée</small>
                  </span>
                  <span className="mp-ag-side">
                    {item.status === 'bloque' ? (
                      <em className="blocked">Bloqué</em>
                    ) : item.reservationStatus === 'pending_moniteur' ? (
                      <em className="wait">À confirmer</em>
                    ) : (
                      <em className="ok">Réservé</em>
                    )}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'week' && dirty ? (
        <div className="mp-av-save">
          <button type="submit" form="mp-week-form" disabled={savingWeekly || loading}>
            {savingWeekly ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      ) : null}
    </PageSection>
  )
}
