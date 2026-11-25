import { useEffect, useState } from 'react'
import { Camera, Car, Clock3, ImagePlus } from 'lucide-react'
import { AuthShell, PillField } from '../components/AuthShell'
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

  return (
    <AuthShell title={titles[step][0]} subtitle={titles[step][1]}>
      <p className="mp-auth-sub" style={{ margin: 0, fontWeight: 600 }}>
        Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
      </p>
      {error ? (
        <p className="mp-auth-error" role="alert">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--mp-pill)',
              display: 'grid',
              placeItems: 'center',
              color: '#7a8590',
              boxShadow: '0 3px 8px rgba(10,31,51,.08)',
            }}
          >
            {photoUrl ? (
              <img src={resolveMediaUrl(photoUrl)} alt="Ta photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Camera size={44} aria-hidden />
            )}
          </span>
          <label className="mp-btn" style={{ cursor: busy ? 'default' : 'pointer', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImagePlus size={20} aria-hidden />
            {busy ? 'Import…' : photoUrl ? 'Changer la photo' : 'Choisir une photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={busy}
              onChange={(e) => void onPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {days.map((d) => (
            <div
              key={d.dayOfWeek}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                padding: '8px 14px',
                borderRadius: 18,
                background: 'var(--mp-pill)',
                boxShadow: '0 3px 8px rgba(10,31,51,.06)',
              }}
            >
              <label className="mp-check" style={{ flex: '1 1 110px' }}>
                <input type="checkbox" checked={d.enabled} onChange={(e) => patchDay(d.dayOfWeek, { enabled: e.target.checked })} />
                {d.label}
              </label>
              {d.enabled ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock3 size={16} aria-hidden />
                  <input type="time" value={d.start} aria-label={`${d.label} — début`} onChange={(e) => patchDay(d.dayOfWeek, { start: e.target.value })} />
                  <span>→</span>
                  <input type="time" value={d.end} aria-label={`${d.label} — fin`} onChange={(e) => patchDay(d.dayOfWeek, { end: e.target.value })} />
                </span>
              ) : (
                <span style={{ color: 'var(--mp-muted)', fontSize: 13 }}>Repos</span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <button type="button" className="mp-btn" disabled={busy} onClick={() => void next()}>
        {busy && step !== 0 ? 'Enregistrement…' : step === STEPS.length - 1 ? 'Terminer' : 'Continuer'}
      </button>
      {step > 0 ? (
        <button type="button" className="mp-btn mp-btn-ghost" disabled={busy} onClick={() => setStep(step - 1)}>
          Retour
        </button>
      ) : (
        <button type="button" className="mp-btn mp-btn-ghost" onClick={signOut}>
          Se déconnecter
        </button>
      )}
    </AuthShell>
  )
}
