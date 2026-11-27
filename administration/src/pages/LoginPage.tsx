import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, Lock, Phone } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/logo.png'
import { isAuthError, useAdminAuth } from '../context/AdminAuthContext'
import { SITE_NAME } from '../theme/brand'
import { normalizePhone, PHONE_PLACEHOLDER } from '../utils/validation'
import '../styles/admin-login-mobile.css'

const REMEMBER_KEY = 'monpermis-admin-remember-phone'
const MOBILE_QUERY = '(max-width: 767px)'

/** Vrai sur téléphone : la page de connexion prend alors le même modèle que l'espace apprenant. */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return mobile
}

function readRemembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || ''
  } catch {
    return ''
  }
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      {open ? null : (
        <path d="m4 20 16-16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  )
}

/** Page de connexion — même modèle que le projet Canaan Mining, aux couleurs Monpermis. */
export function LoginPage() {
  const { admin, loading, signIn } = useAdminAuth()
  const navigate = useNavigate()
  const remembered = useMemo(readRemembered, [])
  const [phone, setPhone] = useState(remembered)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(remembered))
  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const mobile = useIsMobile()

  if (!loading && admin) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const result = await signIn(normalizePhone(phone), password)
      try {
        if (remember || mobile) localStorage.setItem(REMEMBER_KEY, normalizePhone(phone))
        else localStorage.removeItem(REMEMBER_KEY)
      } catch {
        /* stockage indisponible : la connexion n'en dépend pas */
      }
      navigate(result.homePath || '/', { replace: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Connexion impossible. Vérifiez votre connexion réseau.')
      // relance l'animation de secousse à chaque échec
      setShake(false)
      requestAnimationFrame(() => {
        void formRef.current?.offsetWidth
        setShake(true)
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (mobile) {
    return (
      <div className="ap-auth">
        <div className="ap-auth-col">
          <img className="ap-auth-logo" src={logoUrl} alt="Monpermis.bj" />
          <h1>Content de te revoir</h1>
          <p className="ap-auth-sub">Connecte-toi pour gérer les apprenants, les paiements et les équipes.</p>
          <form ref={formRef} className={shake ? 'cx-shake' : ''} onSubmit={handleSubmit} noValidate autoComplete="on" style={{ display: 'contents' }}>
            {error ? (
              <p className="ap-auth-error" role="alert">
                {error}
              </p>
            ) : null}
            <label className="ap-pill">
              <Phone aria-hidden />
              <input
                aria-label="Téléphone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="Numéro de téléphone"
                autoComplete="username"
                autoFocus
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
              />
            </label>
            <label className="ap-pill">
              <Lock aria-hidden />
              <input
                aria-label="Mot de passe"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="ap-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </label>
            <button type="button" className="ap-forgot" onClick={() => setShowHelp((v) => !v)}>
              Mot de passe oublié ?
            </button>
            {showHelp ? <p className="ap-help">Contactez un superadmin : il peut vous attribuer un nouveau mot de passe.</p> : null}
            <button type="submit" className="ap-btn" disabled={submitting}>
              {submitting ? 'Connexion en cours…' : 'Se connecter'}
            </button>
          </form>
          <p className="ap-foot">
            © {new Date().getFullYear()} Monpermis.bj · Gestion de l’auto-école {SITE_NAME}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cx-lg4">
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="lg4wave" clipPathUnits="objectBoundingBox">
            <path d="M0 0H0.6C0.57 0.1 0.5 0.22 0.5 0.34C0.5 0.46 0.585 0.51 0.58 0.6C0.572 0.69 0.49 0.76 0.5 0.86C0.505 0.93 0.54 0.98 0.56 1H0Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="cx-lg4-photo" aria-hidden="true" />
      <h2 className="cx-lg4-slogan">
        Chaque leçon compte,
        <br />
        chaque réussite aussi
      </h2>
      <header className="cx-lg4-top">
        <span className="cx-lg4-logo">
          <img src={logoUrl} alt="" />
        </span>
        <span className="cx-lg4-brand">MONPERMIS</span>
      </header>

      <main className="cx-lg4-main">
        <h1 className="cx-lg4-title">
          Bon
          <br />
          retour
        </h1>
        <p className="cx-lg4-sub">
          Connectez-vous pour suivre vos apprenants, vos paiements et vos équipes.
        </p>
        <form
          ref={formRef}
          className={`cx-lg4-form${shake ? ' cx-shake' : ''}`}
          onSubmit={handleSubmit}
          noValidate
          autoComplete="on"
        >
          <div aria-live="assertive">
            {error ? (
              <p className="cx-login-error" role="alert">
                <span className="cx-login-error-mark" aria-hidden="true">
                  !
                </span>
                {error}
              </p>
            ) : null}
          </div>

          <label className="cx-lg4-field">
            <span>Téléphone</span>
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder={PHONE_PLACEHOLDER}
              autoComplete="username"
              autoFocus
              required
              value={phone}
              onChange={(e) => setPhone(normalizePhone(e.target.value))}
            />
          </label>

          <div className="cx-lg4-field">
            <label htmlFor="admin-password">
              <span>Mot de passe</span>
            </label>
            <div className="cx-lg4-pw">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="cx-lg4-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div className="cx-lg4-meta">
            <label className="cx-lg4-remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Se souvenir de moi</span>
            </label>
            <button type="button" className="cx-lg4-forgot" onClick={() => setShowHelp((v) => !v)}>
              Mot de passe oublié ?
            </button>
          </div>
          <p className="cx-lg4-help" hidden={!showHelp}>
            Contactez un superadmin : il peut vous attribuer un nouveau mot de passe.
          </p>

          <button
            type="submit"
            className={`cx-lg4-go${submitting ? ' cx-busy' : ''}`}
            disabled={submitting}
          >
            <i className="cx-lg4-spin" aria-hidden="true" />
            <span>{submitting ? 'Connexion…' : 'Connexion'}</span>
          </button>
          <p className="cx-lg4-or">Gestion de l’auto-école {SITE_NAME}</p>
          <p className="cx-lg4-copy">© {new Date().getFullYear()} Monpermis.bj</p>
        </form>
      </main>

      <svg className="cx-lg4-deco" viewBox="0 0 300 300" aria-hidden="true">
        <circle cx="185" cy="185" r="150" fill="none" stroke="#ffc000" strokeWidth="1.2" />
        <circle cx="198" cy="198" r="150" fill="none" stroke="#00b050" strokeWidth="1.2" />
        <circle cx="212" cy="215" r="150" fill="#00a047" />
        <circle cx="262" cy="262" r="78" fill="#ffc000" opacity=".92" />
      </svg>
    </div>
  )
}
