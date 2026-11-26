import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, History, ImagePlus, LogOut, Trash2 } from 'lucide-react'
import { fetchProfile, updateProfile, uploadMoniteurPhoto, type MoniteurProfile } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { PageSection } from '../components/model/PageSection'
import { formatMoney, Notice } from '../components/model/Kit'

type UploadTarget = 'portrait' | 'vehicle' | 'gallery'

function initialsOf(fullName?: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'MO').slice(0, 2).toUpperCase()
}

function UploadButton({
  label,
  busy,
  onFile,
  className = 'mp-pf-up',
}: {
  label: string
  busy: boolean
  onFile: (file: File | null) => void
  className?: string
}) {
  return (
    <label className={className}>
      <ImagePlus aria-hidden />
      {busy ? 'Import…' : label}
      <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} disabled={busy} />
    </label>
  )
}

type Tab = 'infos' | 'vehicle' | 'photos' | 'security'

export function ProfilPage() {
  const { moniteur, signOut } = useMoniteurAuth()
  const [profile, setProfile] = useState<MoniteurProfile | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleType, setVehicleType] = useState('voiture')
  const [specialties, setSpecialties] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [defaultPriceFcfa, setDefaultPriceFcfa] = useState('5000')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<UploadTarget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('infos')
  const [savedSnap, setSavedSnap] = useState('')

  const applyProfile = (data: MoniteurProfile) => {
    setProfile(data)
    setFirstName(data.firstName === 'Nouveau' ? '' : data.firstName || '')
    setLastName(data.lastName === 'moniteur' && data.firstName === 'Nouveau' ? '' : data.lastName || '')
    setPhone(data.phone || '')
    setCity(data.city || '')
    setBio(data.bio || '')
    setVehicleBrand(data.vehicleBrand || '')
    setVehicleType((data.vehicleTypes && data.vehicleTypes[0]) || 'voiture')
    setSpecialties((data.specialties || []).join(', '))
    setPhotoUrl(data.photoUrl || '')
    setVehiclePhotoUrl(data.vehiclePhotoUrl || '')
    setPhotos(data.photos || [])
    setDefaultPriceFcfa(String(data.defaultPriceFcfa || 5000))
    setSavedSnap(
      JSON.stringify([
        data.firstName === 'Nouveau' ? '' : data.firstName || '',
        data.lastName === 'moniteur' && data.firstName === 'Nouveau' ? '' : data.lastName || '',
        data.phone || '',
        data.city || '',
        data.bio || '',
        data.vehicleBrand || '',
        (data.vehicleTypes && data.vehicleTypes[0]) || 'voiture',
        (data.specialties || []).join(', '),
        data.photoUrl || '',
        data.vehiclePhotoUrl || '',
        data.photos || [],
        String(data.defaultPriceFcfa || 5000),
      ]),
    )
  }

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProfile(token)
      applyProfile(data.profile)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const uploadTo = async (file: File | null, target: UploadTarget) => {
    if (!file) return
    const token = getMoniteurToken()
    if (!token) return
    setUploading(target)
    setError(null)
    try {
      const { imageUrl } = await uploadMoniteurPhoto(token, file)
      if (target === 'portrait') setPhotoUrl(imageUrl)
      else if (target === 'vehicle') setVehiclePhotoUrl(imageUrl)
      else setPhotos((prev) => [...prev, imageUrl].slice(0, 12))
      setSuccess('Photo importée — pensez à enregistrer le profil.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    if (
      newPassword &&
      (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword))
    ) {
      setSuccess(null)
      setError('Mot de passe : minimum 8 caractères, avec majuscule, minuscule et chiffre')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: Parameters<typeof updateProfile>[1] = {
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
        photoUrl,
        vehicleBrand: vehicleBrand.trim(),
        vehiclePhotoUrl,
        vehicleTypes: [vehicleType.trim().toLowerCase() || 'voiture'],
        specialties: specialties
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        photos,
        defaultPriceFcfa: Math.max(0, Math.round(Number(defaultPriceFcfa) || 0)),
      }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      const data = await updateProfile(token, payload)
      applyProfile(data.profile)
      setCurrentPassword('')
      setNewPassword('')
      setSuccess('Profil mis à jour. Ces infos apparaissent dans l’application apprenant.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setSaving(false)
    }
  }

  const fullName = profile?.fullName || moniteur?.fullName || ''
  const displayName = firstName || lastName ? `${firstName} ${lastName}`.trim() : fullName
  const dirty =
    Boolean(profile) &&
    (JSON.stringify([firstName, lastName, phone, city, bio, vehicleBrand, vehicleType, specialties, photoUrl, vehiclePhotoUrl, photos, defaultPriceFcfa]) !== savedSnap ||
      Boolean(newPassword))

  // Complétude du profil : ce que les apprenants voient en priorité.
  const checklist = [
    { label: 'photo', done: Boolean(photoUrl) },
    { label: 'nom', done: Boolean(firstName.trim() && lastName.trim()) },
    { label: 'ville', done: Boolean(city.trim()) },
    { label: 'présentation', done: bio.trim().length >= 20 },
    { label: 'véhicule', done: Boolean(vehicleBrand.trim()) },
    { label: 'photo du véhicule', done: Boolean(vehiclePhotoUrl) },
  ]
  const doneCount = checklist.filter((item) => item.done).length
  const completion = Math.round((doneCount / checklist.length) * 100)
  const missing = checklist.filter((item) => !item.done).map((item) => item.label)

  const tabs: [Tab, string][] = [
    ['infos', 'Infos'],
    ['vehicle', 'Véhicule'],
    ['photos', 'Photos'],
    ['security', 'Sécurité'],
  ]

  return (
    <PageSection kicker="Compte" title="Mon profil">
      <Notice error={error} success={success} />
      {loading ? <p className="cx-loading">Chargement…</p> : null}

      {!loading && profile ? (
        <>
          <section className="mp-pf-hero">
            <div className="mp-pf-id">
              <div className="mp-pf-avatar">
                {photoUrl ? (
                  <img src={resolveMediaUrl(photoUrl)} alt={`Portrait de ${fullName}`} />
                ) : (
                  <span aria-hidden="true">{initialsOf(displayName)}</span>
                )}
                <label className="mp-pf-cam" aria-label={photoUrl ? 'Changer la photo' : 'Ajouter une photo'}>
                  <Camera aria-hidden />
                  <input type="file" accept="image/*" hidden onChange={(e) => void uploadTo(e.target.files?.[0] ?? null, 'portrait')} disabled={uploading === 'portrait'} />
                </label>
              </div>
              <div className="mp-pf-who">
                <b>{displayName || 'Moniteur'}</b>
                <small>{[city, vehicleBrand].filter(Boolean).join(' · ') || 'Complétez votre profil'}</small>
                <span className="mp-pf-id-line">{profile.phone || profile.email} · {formatMoney(Number(defaultPriceFcfa) || 0)}/h</span>
              </div>
            </div>
            <div className="mp-pf-meter">
              <div className="mp-pf-meter-top">
                <span>Profil complet à</span>
                <b>{completion} %</b>
              </div>
              <div className="mp-pf-bar" role="img" aria-label={`Profil complet à ${completion} %`}>
                <i style={{ width: `${completion}%` }} />
              </div>
              <p>{missing.length ? `À ajouter : ${missing.join(', ')}.` : 'Votre profil est complet. Les apprenants vous voient en entier.'}</p>
            </div>
          </section>

          <div className="mp-pf-tabs" role="tablist" aria-label="Sections du profil">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>

          <form id="mp-profile-form" className="mp-pf-form" onSubmit={handleSubmit}>
            {tab === 'infos' ? (
              <div className="mp-av-card">
                <div className="mp-av-two">
                  <label className="mp-av-field">
                    Prénom
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" autoComplete="given-name" />
                  </label>
                  <label className="mp-av-field">
                    Nom
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" autoComplete="family-name" />
                  </label>
                </div>
                <label className="mp-av-field">
                  Téléphone
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                </label>
                <label className="mp-av-field">
                  Ville / zone
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex. Cotonou, Calavi…" />
                </label>
                <label className="mp-av-field">
                  Tarif horaire (FCFA)
                  <input type="number" inputMode="numeric" min={0} step={500} value={defaultPriceFcfa} onChange={(e) => setDefaultPriceFcfa(e.target.value)} />
                </label>
                <label className="mp-av-field">
                  Spécialités <em>(séparées par des virgules)</em>
                  <input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="conduite en ville, créneau…" />
                </label>
                <label className="mp-av-field">
                  Présentation
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder="Expérience, méthode, zones desservies…"
                  />
                  <span className="mp-pf-count">{bio.length} / 2000</span>
                </label>
              </div>
            ) : null}

            {tab === 'vehicle' ? (
              <div className="mp-av-card">
                <label className="mp-av-field">
                  Marque et modèle
                  <input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="ex. Toyota Corolla" />
                </label>
                <label className="mp-av-field">
                  Type de véhicule
                  <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="voiture, moto…" />
                </label>
                <div className="mp-pf-media-head">
                  <b>Photo du véhicule</b>
                  <UploadButton label={vehiclePhotoUrl ? 'Changer' : 'Ajouter'} busy={uploading === 'vehicle'} onFile={(file) => void uploadTo(file, 'vehicle')} />
                </div>
                {vehiclePhotoUrl ? (
                  <figure className="mp-pf-media mp-pf-media-wide">
                    <img src={resolveMediaUrl(vehiclePhotoUrl)} alt="Véhicule" />
                    <button type="button" aria-label="Retirer la photo du véhicule" onClick={() => setVehiclePhotoUrl('')}>
                      <Trash2 aria-hidden />
                    </button>
                  </figure>
                ) : (
                  <p className="mp-pf-hint">Une photo de votre véhicule rassure les apprenants.</p>
                )}
              </div>
            ) : null}

            {tab === 'photos' ? (
              <div className="mp-av-card">
                <div className="mp-pf-media-head">
                  <b>Galerie ({photos.length} / 12)</b>
                  <UploadButton label="Ajouter" busy={uploading === 'gallery'} onFile={(file) => void uploadTo(file, 'gallery')} />
                </div>
                {photos.length === 0 ? (
                  <p className="mp-pf-hint">Aucune photo dans la galerie pour le moment.</p>
                ) : (
                  <div className="mp-pf-grid">
                    {photos.map((url, index) => (
                      <figure key={url} className="mp-pf-media">
                        <img src={resolveMediaUrl(url)} alt={`Galerie ${index + 1}`} />
                        <button type="button" aria-label={`Retirer la photo ${index + 1}`} onClick={() => setPhotos((prev) => prev.filter((item) => item !== url))}>
                          <Trash2 aria-hidden />
                        </button>
                      </figure>
                    ))}
                  </div>
                )}
                <p className="mp-pf-hint">Le portrait se change avec l’icône appareil photo, en haut de la page.</p>
              </div>
            ) : null}

            {tab === 'security' ? (
              <div className="mp-av-card">
                <h3>Changer le mot de passe</h3>
                <label className="mp-av-field">
                  Mot de passe actuel
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                </label>
                <label className="mp-av-field">
                  Nouveau mot de passe
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} />
                </label>
                <p className="mp-pf-hint">8 caractères minimum, avec une majuscule, une minuscule et un chiffre. Laissez vide pour le conserver.</p>
              </div>
            ) : null}
          </form>

          <div className="mp-pf-links">
            <Link to="/historique" className="mp-pf-link">
              <History aria-hidden />
              Historique des séances
            </Link>
            <button type="button" className="mp-pf-link is-danger" onClick={signOut}>
              <LogOut aria-hidden />
              Se déconnecter
            </button>
          </div>

          {dirty ? (
            <div className="mp-av-save">
              <button type="submit" form="mp-profile-form" disabled={saving || Boolean(uploading)}>
                {saving ? 'Enregistrement…' : 'Enregistrer mon profil'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </PageSection>
  )
}
