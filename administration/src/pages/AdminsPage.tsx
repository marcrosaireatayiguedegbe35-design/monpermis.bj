import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  KeyRound,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  ScrollText,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { fetchAdmins, updateAdmin, type AdminAccount } from '../api/admins'
import { createAdmin, fetchRegistrationStatus } from '../api/auth'
import { PhonePage, PhoneSearch, PhoneSeg, PhoneSheet } from '../components/phone/PhoneKit'
import { useIsPhone } from './MobileHome'
import { normalizePhone, PHONE_PLACEHOLDER, validateName, validatePassword, validatePhone } from '../utils/validation'
import { DirectionSection } from '../components/model/DirectionSection'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { roleLabel } from '../utils/roles'
import { EmptyState, SkeletonBlock } from '../ui'

function formatDateParts(value?: string | null) {
  if (!value) return null
  try {
    const d = new Date(value)
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  } catch {
    return null
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'AD').slice(0, 2).toUpperCase()
}

function DateCell({ value, icon }: { value?: string | null; icon: 'created' | 'login' }) {
  const parts = formatDateParts(value)
  if (!parts) return <span className="cx-dim">—</span>
  const Icon = icon === 'created' ? CalendarDays : Clock3
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
      <Icon className="cx-ico-inline" aria-hidden />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span>{parts.date}</span>
        <small style={{ color: 'var(--ink-soft)' }}>{parts.time}</small>
      </span>
    </span>
  )
}

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isPhone = useIsPhone()
  const [params, setParams] = useSearchParams()
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'super'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [nFullName, setNFullName] = useState('')
  const [nPhone, setNPhone] = useState('')
  const [nPassword, setNPassword] = useState('')
  const [nConfirm, setNConfirm] = useState('')
  const [nRole, setNRole] = useState<'admin' | 'superadmin'>('admin')
  const [formError, setFormError] = useState<string | null>(null)
  const [registrationAllowed, setRegistrationAllowed] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdmins(token)
      setAdmins(data.admins)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Anciennes adresses (fiche d'un administrateur, création) : ouvrent la feuille correspondante sur téléphone.
  useEffect(() => {
    if (!isPhone) return
    if (params.get('create') === '1') {
      setCreateOpen(true)
      params.delete('create')
      setParams(params, { replace: true })
    }
    const open = params.get('open')
    if (open && admins.some((a) => a.id === open)) {
      setSelectedId(open)
      params.delete('open')
      setParams(params, { replace: true })
    }
  }, [isPhone, params, setParams, admins])

  useEffect(() => {
    const token = getAdminToken()
    if (!token || !isPhone) return
    fetchRegistrationStatus(token)
      .then(({ allowed }) => setRegistrationAllowed(allowed))
      .catch(() => setRegistrationAllowed(null))
  }, [isPhone])

  const activeCount = useMemo(() => admins.filter((a) => a.isActive).length, [admins])
  const superCount = useMemo(
    () => admins.filter((a) => a.role === 'superadmin').length,
    [admins],
  )
  const activationRate = admins.length ? Math.round((activeCount / admins.length) * 100) : 0
  const lastActivityLabel = useMemo(() => {
    const dates = admins.map((a) => a.lastLoginAt).filter((v): v is string => Boolean(v))
    if (dates.length === 0) return '—'
    const latest = dates.reduce((max, d) => (new Date(d) > new Date(max) ? d : max))
    return new Date(latest).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }, [admins])

  const applyUpdate = async (adminId: string, payload: Parameters<typeof updateAdmin>[2], okMessage: string) => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return false
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await updateAdmin(token, adminId, payload)
      setAdmins((prev) => prev.map((a) => (a.id === adminId ? data.admin : a)))
      setSuccess(okMessage)
      return true
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handlePhonePassword = async (adminId: string) => {
    setError(null)
    setSuccess(null)
    const pwdError = validatePassword(pwd)
    if (pwdError) return setError(pwdError)
    if (pwd !== pwd2) return setError('Les mots de passe ne correspondent pas')
    if (await applyUpdate(adminId, { password: pwd }, 'Mot de passe mis à jour.')) {
      setPwd('')
      setPwd2('')
      setSelectedId(null)
    }
  }

  const handlePhoneCreate = async () => {
    setFormError(null)
    const problem =
      validateName(nFullName) ||
      validatePhone(nPhone) ||
      validatePassword(nPassword) ||
      (!nConfirm ? 'Confirmez le mot de passe' : nConfirm !== nPassword ? 'Les mots de passe ne correspondent pas' : undefined)
    if (problem) return setFormError(problem)
    const token = getAdminToken()
    if (!token) return setFormError('Session expirée. Reconnectez-vous.')
    setBusy(true)
    try {
      const { admin } = await createAdmin(token, nFullName.trim(), normalizePhone(nPhone), nPassword, nConfirm, nRole)
      setSuccess(`Administrateur « ${admin.fullName} » créé (${nRole === 'superadmin' ? 'superadmin' : 'admin'}).`)
      setCreateOpen(false)
      setNFullName('')
      setNPhone('')
      setNPassword('')
      setNConfirm('')
      setNRole('admin')
      await load()
    } catch (err) {
      setFormError(isAuthError(err) ? err.message : 'Création impossible. Vérifiez votre connexion réseau.')
    } finally {
      setBusy(false)
    }
  }

  if (isPhone) {
    const q = query.trim().toLowerCase()
    const shown = admins.filter((a) => {
      if (filter === 'active' && !a.isActive) return false
      if (filter === 'inactive' && a.isActive) return false
      if (filter === 'super' && a.role !== 'superadmin') return false
      return !q || a.fullName.toLowerCase().includes(q) || a.phone.includes(q)
    })
    const selected = admins.find((a) => a.id === selectedId) || null
    const closeSheet = () => {
      setSelectedId(null)
      setPwd('')
      setPwd2('')
    }
    return (
      <PhonePage
        title="Administrateurs"
        action={
          <button type="button" className="ap-add" onClick={() => { setFormError(null); setCreateOpen(true) }} aria-label="Créer un administrateur">
            <Plus aria-hidden />
          </button>
        }
      >
        {!createOpen && !selected && error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
        {!createOpen && !selected && success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}
        <PhoneSearch id="adm-search-m" value={query} onChange={setQuery} placeholder="Nom ou téléphone" />
        <PhoneSeg
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: `Tous (${admins.length})` },
            { id: 'active', label: 'Actifs' },
            { id: 'inactive', label: 'Inactifs' },
            { id: 'super', label: 'Superadmins' },
          ]}
        />
        <div className="ap-list">
          {loading && admins.length === 0 ? (
            <p className="ap-empty">Chargement…</p>
          ) : shown.length === 0 ? (
            <p className="ap-empty">{admins.length === 0 ? 'Aucun administrateur. Touchez « + » pour en créer un.' : 'Aucun résultat.'}</p>
          ) : (
            shown.map((a) => {
              const last = formatDateParts(a.lastLoginAt)
              return (
                <button key={a.id} type="button" className="ap-row" onClick={() => { setError(null); setSuccess(null); setSelectedId(a.id) }}>
                  <span className={`ap-av${a.isActive ? '' : ' is-bad'}`}>{initials(a.fullName)}</span>
                  <span className="ap-row-t">
                    <b>{a.fullName}</b>
                    <small>{a.phone} · {last ? `vu le ${last.date}` : 'jamais connecté'}</small>
                  </span>
                  <span className={`ap-tag${a.isActive ? (a.role === 'superadmin' ? ' is-warn' : '') : ' is-red'}`}>
                    {a.isActive ? roleLabel(a.role) : 'Inactif'}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <PhoneSheet open={Boolean(selected)} title={selected?.fullName || ''} onClose={closeSheet}>
          {selected ? (
            <>
              <div className="ap-count">
                {selected.phone} · {roleLabel(selected.role)} · créé le {formatDateParts(selected.createdAt)?.date ?? '—'}
                {selected.lastLoginAt ? ` · dernière connexion le ${formatDateParts(selected.lastLoginAt)?.date}` : ''}
              </div>
              {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
              <button
                type="button"
                className={`ap-sheet-act${selected.isActive ? ' is-danger' : ' is-fill'}`}
                disabled={busy}
                onClick={() => void applyUpdate(selected.id, { isActive: !selected.isActive }, selected.isActive ? 'Compte désactivé.' : 'Compte activé.')}
              >
                <ShieldCheck aria-hidden />
                {selected.isActive ? 'Désactiver le compte' : 'Activer le compte'}
              </button>

              <p className="ap-label">Rôle</p>
              <PhoneSeg
                value={selected.role === 'superadmin' ? 'superadmin' : 'admin'}
                onChange={(next) => {
                  if (next !== selected.role) void applyUpdate(selected.id, { role: next }, `Rôle mis à jour : ${roleLabel(next)}.`)
                }}
                options={[
                  { id: 'admin', label: 'Admin' },
                  { id: 'superadmin', label: 'Superadmin' },
                ]}
              />

              <p className="ap-label">Nouveau mot de passe</p>
              <div className="ap-form">
                <input className="ap-input" type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                <input className="ap-input" type="password" autoComplete="new-password" placeholder="Confirmer" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
                <button type="button" className="ap-sheet-act" disabled={busy || !pwd} onClick={() => void handlePhonePassword(selected.id)}>
                  <KeyRound aria-hidden />
                  Définir le mot de passe
                </button>
              </div>

              <Link to={`/journal-audit?adminId=${selected.id}`} className="ap-sheet-act" onClick={closeSheet}>
                <ScrollText aria-hidden />
                Voir son activité
              </Link>
            </>
          ) : null}
        </PhoneSheet>

        <PhoneSheet open={createOpen} title="Nouvel administrateur" onClose={() => setCreateOpen(false)} full>
          {registrationAllowed === false ? (
            <p className="cx-note cx-note-err" role="alert">La création d’administrateurs est désactivée sur ce serveur.</p>
          ) : null}
          <div className="ap-form">
            <input className="ap-input" type="text" autoComplete="name" placeholder="Nom complet" value={nFullName} onChange={(e) => setNFullName(e.target.value)} />
            <input className="ap-input" type="tel" inputMode="numeric" autoComplete="tel" placeholder={PHONE_PLACEHOLDER} value={nPhone} onChange={(e) => setNPhone(normalizePhone(e.target.value))} />
            <p className="ap-label">Rôle</p>
            <PhoneSeg
              value={nRole}
              onChange={setNRole}
              options={[
                { id: 'admin', label: 'Admin — opérations' },
                { id: 'superadmin', label: 'Superadmin — tout' },
              ]}
            />
            <input className="ap-input" type="password" autoComplete="new-password" placeholder="Mot de passe (8 caractères min.)" value={nPassword} onChange={(e) => setNPassword(e.target.value)} />
            <input className="ap-input" type="password" autoComplete="new-password" placeholder="Confirmer le mot de passe" value={nConfirm} onChange={(e) => setNConfirm(e.target.value)} />
            {formError ? <p className="cx-note cx-note-err" role="alert">{formError}</p> : null}
            <button type="button" className="ap-sheet-act is-fill" disabled={busy || registrationAllowed === false} onClick={() => void handlePhoneCreate()}>
              <UserPlus aria-hidden />
              {busy ? 'Création…' : 'Créer l’administrateur'}
            </button>
          </div>
        </PhoneSheet>
      </PhonePage>
    )
  }

  return (
    <DirectionSection
      kicker="Sécurité"
      title="Administrateurs"
      subtitle="Gestion des comptes : rôles, activation et journal d’activité. Réservé aux super-administrateurs."
      actions={
        <>
          <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
          <Link to="/creer-admin" className="cx-btn cx-btn-fill">
            <Plus aria-hidden />
            Créer un admin
          </Link>
        </>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Users aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Administrateurs</span>
            <span className="cx-kc-value">{admins.length}</span>
            <span className="cx-kc-sub">
              {superCount} superadmin{superCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <UserCheck aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Actifs</span>
            <span className="cx-kc-value">{activeCount}</span>
            <span className="cx-kc-sub">comptes activés</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <ShieldCheck aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Taux d’activation</span>
            <span className="cx-kc-value">{activationRate}%</span>
            <span className="cx-kc-bar">
              <i style={{ width: `${activationRate}%` }} />
            </span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Clock3 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Dernière activité</span>
            <span className="cx-kc-value" style={{ fontSize: '1.05rem' }}>{lastActivityLabel}</span>
            <span className="cx-kc-sub">connexion la plus récente</span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <ShieldCheck aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Comptes ({admins.length})</h2>
            <p className="cx-muted">
              {activeCount} actif{activeCount > 1 ? 's' : ''}
              {superCount > 0 ? ` · ${superCount} superadmin${superCount > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        {loading && admins.length === 0 ? (
          <SkeletonBlock rows={4} />
        ) : admins.length === 0 ? (
          <EmptyState title="Aucun administrateur" description="Créez le premier compte administrateur." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Administrateur</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Créé le</th>
                  <th>Dernière connexion</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="cx-person">
                        <span className="cx-avatar">{initials(admin.fullName)}</span>
                        <div>
                          <strong>{admin.fullName}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cx-dim">
                        <Phone className="cx-ico-inline" aria-hidden />
                        {admin.phone}
                      </span>
                    </td>
                    <td>
                      <span className={`cx-chip ${admin.role === 'superadmin' ? 'cx-amber' : ''}`.trim()}>
                        {roleLabel(admin.role)}
                      </span>
                    </td>
                    <td>
                      <DateCell value={admin.createdAt} icon="created" />
                    </td>
                    <td>
                      <DateCell value={admin.lastLoginAt} icon="login" />
                    </td>
                    <td>
                      <span className={`cx-chip ${admin.isActive ? 'cx-green' : 'cx-red'}`}>
                        {admin.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/administrateurs/${admin.id}`} className="cx-btn cx-btn-sm">
                        <Settings2 aria-hidden />
                        Gérer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DirectionSection>
  )
}
