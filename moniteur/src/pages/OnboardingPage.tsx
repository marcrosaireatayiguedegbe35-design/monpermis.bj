import { useEffect, useState } from 'react'
import { Camera, Car, ChevronRight, Clock3, ImagePlus } from 'lucide-react'
import { PillField } from '../components/AuthShell'
import { OnboardShell } from '../components/OnboardShell'
import { fetchProfile, saveAvailability, updateProfile, uploadMoniteurPhoto, type WeeklySlot } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'

const DAYS = [
  { dayOfWeek: 1, label: 'Lundi' },
  { dayOfWeek: 2, label: 'Mardi' },
  { dayOfWeek: 3, label: 'Mercredi' },
  { dayOfWeek: 4, label: 'Jeudi' },
  { dayOfWeek: 5, label: 'Vendredi' },
  { dayOfWeek: 6, label: 'Samedi' },
  { dayOfWeek: 0, label: 'Dimanche' },
] as const

type DayRow = { dayOfWeek: number; label: string; enabled: boolean; start: string; end: string }

const STEPS = ['Photo', 'Véhicule', 'Horaires'] as const

/**
 * Première connexion, après le choix du mot de passe : photo de profil, véhicule conduit (sans photo)
 * puis horaires de la semaine. À la fin, le moniteur arrive sur son tableau de bord.
 */
export function OnboardingPage() {
  const { moniteur, completeOnboarding, signOut } = useMoniteurAuth()
  const [step, setStep] = useState(0)
  const [photoUrl, setPhotoUrl] = useState(moniteur?.photoUrl || '')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleType, setVehicleType] = useState('voiture')
  const [days, setDays] = useState<DayRow[]>(
    DAYS.map((d) => ({ ...d, enabled: d.dayOfWeek >= 1 && d.dayOfWeek <= 5, start: '08:00', end: '17:00' })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reprise après une interruption : on retrouve ce qui est déjà enregistré.
  useEffect(() => {
    const token = getMoniteurToken()
    if (!token) return
    fetchProfile(token)
      .then(({ profile }) => {
        if (profile.photoUrl) setPhotoUrl(profile.photoUrl)
        if (profile.vehicleBrand) setVehicleBrand(profile.vehicleBrand)
        if (profile.vehicleTypes?.[0]) setVehicleType(profile.vehicleTypes[0])
      })
      .catch(() => undefined)
  }, [])

  const fail = (err: unknown, fallback: string) =>
    setError(isAuthError(err) || err instanceof Error ? (err as Error).message : fallback)

  const onPhoto = async (file: File | null) => {
    const token = getMoniteurToken()
    if (!file || !token) return
    setBusy(true)
    setError(null)
    try {
      const { imageUrl } = await uploadMoniteurPhoto(token, file)
      await updateProfile(token, { photoUrl: imageUrl })
      setPhotoUrl(imageUrl)
    } catch (err) {
      fail(err, 'Import de la photo impossible')
    } finally {
      setBusy(false)
    }
  }

  const next = async () => {
    const token = getMoniteurToken()
    if (!token) return
    setError(null)
    if (step === 0) {
      if (!photoUrl) return setError('Ajoute ta photo de profil pour continuer.')
      return setStep(1)
    }
    setBusy(true)
    try {
      if (step === 1) {
        if (!vehicleBrand.trim()) {
          setError('Indique le véhicule que tu conduis.')
          return
        }
        await updateProfile(token, {
          vehicleBrand: vehicleBrand.trim(),
          vehicleTypes: [vehicleType.trim().toLowerCase() || 'voiture'],
        })
        setStep(2)
        return
      }
      const slots: WeeklySlot[] = days
        .filter((d) => d.enabled)
        .map((d) => ({ dayOfWeek: d.dayOfWeek, start: d.start, end: d.end }))
      if (!slots.length) {
        setError('Choisis au moins un jour de travail.')
        return
      }
      if (slots.some((s) => !s.start || !s.end || s.start >= s.end)) {
        setError("L'heure de fin doit être après l'heure de début.")
        return
      }
      await saveAvailability(token, slots)
      await completeOnboarding()
    } catch (err) {
      fail(err, 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  const patchDay = (dayOfWeek: number, patch: Partial<DayRow>) =>
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)))

  const titles = [
    ['Ta photo de profil', 'Les apprenants verront cette photo dans l’application.'],
    ['Ton véhicule', 'Indique le véhicule avec lequel tu donnes tes séances.'],
    ['Tes horaires', 'Choisis les jours et les heures où tu es disponible.'],
  ] as const

  const fileInput = (
    <input
      type="file"
      accept="image/*"
      hidden
      disabled={busy}
      onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
    />
  )

  return (
    <OnboardShell
      title={titles[step][0]}
      subtitle={titles[step][1]}
      step={step + 1}
      chip={`Étape ${step + 1} sur ${STEPS.length} • ${STEPS[step]}`}
      onSignOut={step === 0 ? signOut : undefined}
    >
      {error ? (
        <p className="mp-auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <>
          <label className="ob-photo" aria-label="Choisir une photo">
            <span className={`ob-photo-in${photoUrl ? ' has' : ''}`}>
              {photoUrl ? (
                <img src={resolveMediaUrl(photoUrl)} alt="Ta photo" />
              ) : (
                <>
                  <Camera size={46} aria-hidden />
                  Choisir une photo
                </>
              )}
            </span>
            {fileInput}
          </label>
          <label className="ob-btn" style={{ cursor: busy ? 'default' : 'pointer' }}>
            <ImagePlus size={22} aria-hidden />
            {busy ? 'Import…' : photoUrl ? 'Changer la photo' : 'Choisir une photo'}
            {fileInput}
          </label>
          <button type="button" className="ob-btn-line" disabled={busy} onClick={() => void next()}>
            Continuer
            <ChevronRight size={22} aria-hidden />
          </button>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <PillField
            icon={<Car aria-hidden />}
            label="Marque et modèle"
            placeholder="ex. Toyota Corolla"
            value={vehicleBrand}
            onChange={setVehicleBrand}
          />
          <PillField
            icon={<Car aria-hidden />}
            label="Type de véhicule"
            placeholder="voiture, moto…"
            value={vehicleType}
            onChange={setVehicleType}
          />
        </>
      ) : null}

      {step === 2 ? (
        <div className="ob-days">
          {days.map((d) => (
            <div key={d.dayOfWeek} className={`ob-day${d.enabled ? ' on' : ''}`}>
              <label className="mp-check">
                <input type="checkbox" checked={d.enabled} onChange={(e) => patchDay(d.dayOfWeek, { enabled: e.target.checked })} />
                {d.label}
              </label>
              {d.enabled ? (
                <span className="ob-day-time">
                  <Clock3 size={16} aria-hidden />
                  <input type="time" value={d.start} aria-label={`${d.label} — début`} onChange={(e) => patchDay(d.dayOfWeek, { start: e.target.value })} />
                  <span>→</span>
                  <input type="time" value={d.end} aria-label={`${d.label} — fin`} onChange={(e) => patchDay(d.dayOfWeek, { end: e.target.value })} />
                </span>
              ) : (
                <span className="ob-day-off">Repos</span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {step > 0 ? (
        <>
          <button type="button" className="ob-btn" disabled={busy} onClick={() => void next()}>
            {busy ? 'Enregistrement…' : step === STEPS.length - 1 ? 'Terminer' : 'Continuer'}
          </button>
          <button type="button" className="ob-btn-line" disabled={busy} onClick={() => setStep(step - 1)}>
            Retour
          </button>
        </>
      ) : null}
    </OnboardShell>
  )
}
