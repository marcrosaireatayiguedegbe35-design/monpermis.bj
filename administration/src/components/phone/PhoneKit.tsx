import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

/** Page téléphone : en-tête fixe, zone centrale, et seule la liste défile. */
export function PhonePage({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="ap-page">
      <div className="ap-page-head">
        <h1>{title}</h1>
        {action}
      </div>
      {children}
    </div>
  )
}

export function PhoneSearch({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  id: string
}) {
  return (
    <label className="ap-search" htmlFor={id}>
      <Search aria-hidden />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  )
}

export function PhoneSeg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="ap-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          className={value === o.id ? 'is-on' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Feuille qui monte du bas pour les actions d'une ligne. */
export function PhoneSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="ap-sheet-wrap">
      <button type="button" className="ap-sheet-back" aria-label="Fermer" onClick={onClose} />
      <div className="ap-sheet" role="dialog" aria-label={title}>
        <div className="ap-sheet-grab" />
        <p className="ap-sheet-name">{title}</p>
        {children}
      </div>
    </div>
  )
}
