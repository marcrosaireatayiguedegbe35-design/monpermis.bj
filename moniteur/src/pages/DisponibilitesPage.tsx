import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createCreneau,
  deleteCreneau,
  fetchAvailability,
  fetchMyCreneaux,
  fetchProfile,
  saveAvailability,
  updateProfile,
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

function plusTwoHours(start: string) {
  const [h, m] = start.split(':').map((v) => parseInt(v, 10) || 0)
  const total = Math.min(23 * 60 + 59, h * 60 + m + 120)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
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

function parseLocal(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function fmtLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Cases du calendrier du mois de `value` (lundi en premier) : null = case vide. */
function monthCells(value: string): (string | null)[] {
  const date = parseLocal(value)
  const y = date.getFullYear()
  const m = date.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const count = new Date(y, m + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= count; d += 1) cells.push(fmtLocal(new Date(y, m, d)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Même jour du mois suivant (ou précédent), ramené au dernier jour si le mois est plus court. */
function shiftMonth(value: string, delta: number) {
  const date = parseLocal(value)
  const target = new Date(date.getFullYear(), date.getMonth() + delta, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), last))
  return fmtLocal(target)
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
  const [acceptsGroup, setAcceptsGroup] = useState(false)
  const [kind, setKind] = useState<'solo' | 'group'>('solo')
  const [savedHours, setSavedHours] = useState('')

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [creneauxData, availability, profileData] = await Promise.all([
        fetchMyCreneaux(token, todayLocal()),
        fetchAvailability(token),
        fetchProfile(token).catch(() => null),
      ])
      if (profileData) setAcceptsGroup(Boolean(profileData.profile.acceptsGroup))
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

  const cells = useMemo(() => monthCells(selected), [selected])
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
  const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseLocal(selected))
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
    setKind('solo')
    setEditingId(null)
    setDate(selected)
    setStartTime('08:00')
    setEndTime('09:00')
    setError(null)
    setSuccess(null)
    setSheetOpen(true)
  }

  const toggleGroup = async (value: boolean) => {
    const token = getMoniteurToken()
    if (!token) return
    setAcceptsGroup(value)
    try {
      await updateProfile(token, { acceptsGroup: value })
    } catch (err) {
      setAcceptsGroup(!value)
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    }
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
        const isGroup = kind === 'group'
        await createCreneau(token, {
          date,
          startTime,
          endTime: isGroup ? plusTwoHours(startTime) : endTime,
          mode: isGroup ? 'group' : 'solo',
        })
        setSuccess(isGroup ? 'Bloc de groupe publié (2 h, 4 élèves).' : 'Créneau publié.')
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
        <form id="mp-week-form" className="mp-hr" onSubmit={handleWeeklySave}>
          <p className="mp-av-intro">
            Activez les jours où vous êtes disponible, puis réglez vos heures ({activeDays} jour{activeDays > 1 ? 's' : ''} ouvert{activeDays > 1 ? 's' : ''}).
          </p>
          {dayHours.map((day) => {
            const label = WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label || ''
            return (
              <section key={day.dayOfWeek} className={`mp-hr-day${day.enabled ? ' is-open' : ''}`}>
                <div className="mp-hr-head">
                  <div>
                    <b>{label}</b>
                    <small>{summaryOf(day)}</small>
                  </div>
                  <label className="mp-switch" aria-label={`${label} ouvert`}>
                    <input type="checkbox" checked={day.enabled} onChange={(e) => updateDay(day.dayOfWeek, { enabled: e.target.checked })} />
                    <span aria-hidden="true" />
                  </label>
                </div>
                {day.enabled ? (
                  <div className="mp-hr-body">
                    <Range label="Matin" value={day.morning} onChange={(morning) => updateDay(day.dayOfWeek, { morning })} />
                    {day.afternoonEnabled ? (
                      <>
                        <Range label="Après-midi" value={day.afternoon} onChange={(afternoon) => updateDay(day.dayOfWeek, { afternoon })} />
                        <button type="button" className="mp-hr-link" onClick={() => updateDay(day.dayOfWeek, { afternoonEnabled: false })}>
                          Retirer l’après-midi
                        </button>
                      </>
                    ) : (
                      <button type="button" className="mp-hr-link" onClick={() => updateDay(day.dayOfWeek, { afternoonEnabled: true })}>
                        + Ajouter l’après-midi
                      </button>
                    )}
                    <button type="button" className="mp-hr-link" onClick={() => copyToAll(day)}>
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

      {tab === 'agenda' ? (
        <div className="mp-wk">
          <div className="mp-wk-head">
            <b>{monthLabel}</b>
            <span>
              <button type="button" aria-label="Mois précédent" onClick={() => setSelected(shiftMonth(selected, -1))}>
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" aria-label="Mois suivant" onClick={() => setSelected(shiftMonth(selected, 1))}>
                <ChevronRight aria-hidden />
              </button>
            </span>
          </div>
          <div className="mp-mo" role="grid" aria-label="Calendrier du mois">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letter, index) => (
              <small key={`h${index}`} className="mp-mo-h">
                {letter}
              </small>
            ))}
            {cells.map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  aria-label={day}
                  aria-pressed={day === selected}
                  className={`mp-mo-d${day === selected ? ' is-on' : ''}${day === todayLocal() ? ' is-today' : ''}`}
                  onClick={() => setSelected(day)}
                >
                  <b>{parseLocal(day).getDate()}</b>
                  <i className={datesWithItems.has(day) ? 'has' : ''} aria-hidden="true" />
                </button>
              ) : (
                <span key={`e${index}`} aria-hidden="true" />
              ),
            )}
          </div>
          <h3 className="mp-mo-title">{dayLabel}</h3>

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
                    <b>{item.groupBlock ? `Groupe · ${label}` : label}</b>
                    <small>{item.groupBlock ? '2 000 F par élève · 4 places' : item.status === 'libre' ? formatMoney(item.priceFcfa) : 'Séance liée'}</small>
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

          <label className="mp-hr-head" style={{ margin: '4px 0 10px' }}>
            <div>
              <b>Je donne des séances en groupe</b>
              <small>Blocs de 2 h, 4 élèves, 2 000 F par élève</small>
            </div>
            <span className="mp-switch">
              <input type="checkbox" checked={acceptsGroup} onChange={(e) => void toggleGroup(e.target.checked)} />
              <span aria-hidden="true" />
            </span>
          </label>

          <button type="button" className="mp-wk-fab" onClick={openNew}>
            <Plus aria-hidden />
            Ajouter un créneau
          </button>

          <button type="button" className="mp-wk-hours" onClick={() => setTab('week')}>
            <Clock3 aria-hidden />
            Modifier mes horaires de la semaine
            <ChevronRight aria-hidden />
          </button>

          {sheetOpen ? (
            <div className="mp-sheet-bg" onClick={resetForm}>
              <form className="mp-sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                <h3>{editingId ? 'Modifier le créneau' : kind === 'group' ? 'Nouveau bloc de groupe' : 'Nouveau créneau'}</h3>
                {!editingId && acceptsGroup ? (
                  <div className="mp-av-two">
                    <button type="button" className={kind === 'solo' ? 'mp-av-primary' : 'mp-av-ghost'} onClick={() => setKind('solo')}>
                      Solo
                    </button>
                    <button type="button" className={kind === 'group' ? 'mp-av-primary' : 'mp-av-ghost'} onClick={() => setKind('group')}>
                      Groupe (2 h)
                    </button>
                  </div>
                ) : null}
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
                    <input
                      type="time"
                      value={!editingId && kind === 'group' ? plusTwoHours(startTime) : endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!editingId && kind === 'group'}
                      required
                    />
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
