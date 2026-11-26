import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { formatMoney, Notice } from '../components/model/Kit'

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

type Tab = 'agenda' | 'week'

const DAY_ABBR = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']

function parseLocal(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function fmtLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(value: string, days: number) {
  const date = parseLocal(value)
  date.setDate(date.getDate() + days)
  return fmtLocal(date)
}

/** Les 7 jours (lundi → dimanche) de la semaine qui contient `value`. */
function weekOf(value: string) {
  const date = parseLocal(value)
  const shift = (date.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => addDays(value, i - shift))
}

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
  const [tab, setTab] = useState<Tab>('agenda')
  const [selected, setSelected] = useState(todayLocal())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openDay, setOpenDay] = useState<number | null>(null)
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

  const weekDays = useMemo(() => weekOf(selected), [selected])
  const datesWithItems = useMemo(() => new Set(items.map((item) => item.date)), [items])
  const dayItems = useMemo(
    () => items.filter((item) => item.date === selected).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [items, selected],
  )
  const usualHours = useMemo(() => {
    const day = dayHours.find((d) => d.dayOfWeek === parseLocal(selected).getDay())
    if (!day || !day.enabled) return null
    const parts = [`${day.morning.start} – ${day.morning.end}`]
    if (day.afternoonEnabled) parts.push(`${day.afternoon.start} – ${day.afternoon.end}`)
    return parts.join('  ·  ')
  }, [dayHours, selected])
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(parseLocal(selected))
  const activeDays = dayHours.filter((day) => day.enabled).length
  const dirty = savedHours !== '' && JSON.stringify(dayHours) !== savedHours

  const resetForm = () => {
    setEditingId(null)
    setDate(selected)
    setStartTime('08:00')
    setEndTime('09:00')
    setSheetOpen(false)
  }

  const openNew = () => {
    setEditingId(null)
    setDate(selected)
    setStartTime('08:00')
    setEndTime('09:00')
    setError(null)
    setSuccess(null)
    setSheetOpen(true)
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
    setTab('agenda')
    setSheetOpen(true)
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
    <PageSection kicker={tab === 'agenda' ? 'Disponibilités' : 'Disponibilités'} title={tab === 'agenda' ? 'Agenda' : 'Mes horaires'}>
      <Notice error={error} success={success} />
      {tab === 'week' ? (
        <button type="button" className="mp-wk-back" onClick={() => setTab('agenda')}>
          <ChevronLeft aria-hidden />
          Retour à l’agenda
        </button>
      ) : null}

      {tab === 'week' ? (
        <form id="mp-week-form" className="mp-av" onSubmit={handleWeeklySave}>
          <p className="mp-av-intro">
            Choisissez un jour pour régler ses horaires ({activeDays} ouvert{activeDays > 1 ? 's' : ''}).
          </p>
          {(() => {
            const selected = dayHours.find((d) => d.dayOfWeek === (openDay ?? dayHours.find((x) => x.enabled)?.dayOfWeek ?? 1)) ?? dayHours[0]
            const selLabel = WEEK_DAYS.find((d) => d.dayOfWeek === selected.dayOfWeek)?.label || ''
            return (
              <>
                <div className="mp-days" role="tablist" aria-label="Jours de la semaine">
                  {dayHours.map((day) => {
                    const label = WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label || ''
                    const on = selected.dayOfWeek === day.dayOfWeek
                    return (
                      <button
                        key={day.dayOfWeek}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        className={`mp-day${on ? ' is-on' : ''}${day.enabled ? ' is-open' : ''}`}
                        onClick={() => setOpenDay(day.dayOfWeek)}
                      >
                        <small>{label.slice(0, 3)}</small>
                        <b>{day.enabled ? '●' : '–'}</b>
                      </button>
                    )
                  })}
                </div>

                <section className="mp-av-card">
                  <div className="mp-av-dayhead">
                    <div>
                      <h3>{selLabel}</h3>
                      <small className={selected.enabled ? 'is-open' : ''}>{summaryOf(selected)}</small>
                    </div>
                    <label className="mp-switch" aria-label={`${selLabel} ouvert`}>
                      <input
                        type="checkbox"
                        checked={selected.enabled}
                        onChange={(e) => updateDay(selected.dayOfWeek, { enabled: e.target.checked })}
                      />
                      <span aria-hidden="true" />
                    </label>
                  </div>
                  {selected.enabled ? (
                    <>
                      <p className="mp-av-sub">Horaires de la journée</p>
                      <Range label="Matin" value={selected.morning} onChange={(morning) => updateDay(selected.dayOfWeek, { morning })} />
                      <label className="mp-av-pmtoggle">
                        <input
                          type="checkbox"
                          checked={selected.afternoonEnabled}
                          onChange={(e) => updateDay(selected.dayOfWeek, { afternoonEnabled: e.target.checked })}
                        />
                        Ajouter l’après-midi
                      </label>
                      {selected.afternoonEnabled ? (
                        <Range label="Après-midi" value={selected.afternoon} onChange={(afternoon) => updateDay(selected.dayOfWeek, { afternoon })} />
                      ) : null}
                      <button type="button" className="mp-av-copy" onClick={() => copyToAll(selected)}>
                        <Copy aria-hidden />
                        Appliquer à tous les jours ouverts
                      </button>
                    </>
                  ) : (
                    <p className="mp-av-sub">Jour fermé : aucune réservation possible. Activez-le pour choisir vos horaires.</p>
                  )}
                </section>
              </>
            )
          })()}
        </form>
      ) : null}

      {tab === 'agenda' ? (
        <div className="mp-wk">
          <div className="mp-wk-head">
            <b>{monthLabel}</b>
            <span>
              <button type="button" aria-label="Semaine précédente" onClick={() => setSelected(addDays(selected, -7))}>
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" aria-label="Semaine suivante" onClick={() => setSelected(addDays(selected, 7))}>
                <ChevronRight aria-hidden />
              </button>
            </span>
          </div>
          <div className="mp-wk-strip" role="tablist" aria-label="Jours de la semaine">
            {weekDays.map((day) => {
              const on = day === selected
              const d = parseLocal(day)
              return (
                <button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={`mp-wk-day${on ? ' is-on' : ''}${day === todayLocal() ? ' is-today' : ''}`}
                  onClick={() => setSelected(day)}
                >
                  <small>{DAY_ABBR[d.getDay()]}</small>
                  <b>{d.getDate()}</b>
                  <i className={datesWithItems.has(day) ? 'has' : ''} aria-hidden="true" />
                </button>
              )
            })}
          </div>

          <p className="mp-wk-usual">
            <Clock3 aria-hidden />
            <span>{usualHours ? <>Horaires habituels : <b>{usualHours}</b></> : <>Jour fermé dans vos horaires habituels</>}</span>
          </p>

          {loading && items.length === 0 ? <p className="cx-loading">Chargement…</p> : null}
          {!loading && dayItems.length === 0 ? (
            <div className="mp-wk-empty">
              <b>Rien de prévu ce jour</b>
              <small>Les apprenants réservent sur vos horaires habituels. Ajoutez un créneau pour ouvrir une heure en plus.</small>
            </div>
          ) : null}
          <div className="mp-wk-list">
            {dayItems.map((item) => {
              const pending = item.status === 'reserve' && item.reservationStatus === 'pending_moniteur'
              const kind = item.status === 'bloque' ? 'blocked' : item.status === 'reserve' ? (pending ? 'wait' : 'booked') : 'free'
              const label = item.status === 'bloque' ? 'Bloqué' : item.status === 'reserve' ? (pending ? 'À confirmer' : 'Réservé') : 'Libre'
              return (
                <article key={item.id} className={`mp-wk-slot is-${kind}`}>
                  <span className="mp-wk-time">
                    <b>{item.startTime}</b>
                    <small>{item.endTime}</small>
                  </span>
                  <span className="mp-wk-body">
                    <b>{label}</b>
                    <small>{item.status === 'libre' ? formatMoney(item.priceFcfa) : 'Séance liée'}</small>
                  </span>
                  {item.editable ? (
                    <span className="mp-wk-tools">
                      <button type="button" aria-label="Modifier le créneau" onClick={() => startEdit(item)}>
                        <Pencil aria-hidden />
                      </button>
                      <button type="button" aria-label="Supprimer le créneau" onClick={() => void handleDelete(item)}>
                        <Trash2 aria-hidden />
                      </button>
                    </span>
                  ) : null}
                </article>
              )
            })}
          </div>

          <button type="button" className="mp-wk-hours" onClick={() => setTab('week')}>
            <Clock3 aria-hidden />
            Modifier mes horaires de la semaine
            <ChevronRight aria-hidden />
          </button>

          <button type="button" className="mp-wk-fab" onClick={openNew}>
            <Plus aria-hidden />
            Créneau
          </button>

          {sheetOpen ? (
            <div className="mp-sheet-bg" onClick={resetForm}>
              <form className="mp-sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                <h3>{editingId ? 'Modifier le créneau' : 'Nouveau créneau'}</h3>
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
                  <button type="button" className="mp-av-ghost" onClick={resetForm}>
                    Annuler
                  </button>
                  <button type="submit" className="mp-av-primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Publier'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
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
