import type { ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import logoUrl from '../assets/logo.png'

/** Cadre des pages de connexion : logo centré, titre, champs en pilule (même modèle que l'app apprenant). */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="mp-auth">
      <div className="mp-auth-col">
        <img className="mp-auth-logo" src={logoUrl} alt="Monpermis.bj" />
        <h1>{title}</h1>
        {subtitle ? <p className="mp-auth-sub">{subtitle}</p> : null}
        {children}
        {footer ? <p className="mp-auth-foot">{footer}</p> : null}
      </div>
    </div>
  )
}

/** Champ en pilule : icône à gauche, placeholder seul, œil pour les mots de passe. */
export function PillField({
  icon,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  autoFocus,
}: {
  icon: ReactNode
  label: string
  type?: 'text' | 'tel' | 'password'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'tel'
  autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label className="mp-pill">
      {icon}
      <input
        aria-label={label}
        type={isPassword && show ? 'text' : type}
        inputMode={inputMode}
        placeholder={placeholder ?? label}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {isPassword ? (
        <button
          type="button"
          className="mp-eye"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
      ) : null}
    </label>
  )
}
