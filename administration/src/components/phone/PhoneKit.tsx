import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useIsPhone } from '../../pages/MobileHome'
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
  full,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  full?: boolean
}) {
  if (!open) return null
  return (
    <div className="ap-sheet-wrap">
      <button type="button" className="ap-sheet-back" aria-label="Fermer" onClick={onClose} />
      <div className={`ap-sheet${full ? ' is-full' : ''}`} role="dialog" aria-label={title || 'Fenêtre'}>
        <div className="ap-sheet-grab" />
        {title ? <p className="ap-sheet-name">{title}</p> : null}
        {children}
      </div>
    </div>
  )
}

export type HubTile = {
  to: string
  icon: ReactNode
  title: string
  sub: string
  hot?: boolean
}

export type HubTodo = { key: string; to: string; title: string; sub: string }

/** Page « rubrique » : tuiles des sous-pages et courte liste « À traiter », en un seul écran. */
export function PhoneHub({
  title,
  tiles,
  todo,
  allDone,
  error,
}: {
  title: string
  tiles: HubTile[]
  todo: HubTodo[]
  allDone: string
  error?: string | null
}) {
  return (
    <div className="ap-page">
      <div className="ap-page-head">
        <h1>{title}</h1>
      </div>
      {error ? <p className="cx-note cx-note-err">{error}</p> : null}
      <div className="ap-hub-grid" style={{ gridTemplateRows: `repeat(${Math.ceil(tiles.length / 2)}, 1fr)` }}>
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className={`ap-home-tile${t.hot ? ' is-hot' : ''}`}>
            <span className="ap-home-ico">{t.icon}</span>
            <b>{t.title}</b>
            <small>{t.sub}</small>
          </Link>
        ))}
      </div>
      <p className="ap-label">À traiter</p>
      <div className="ap-list ap-todo-list">
        {todo.length === 0 ? (
          <p className="ap-empty">{allDone}</p>
        ) : (
          todo.slice(0, 3).map((item) => (
            <Link key={item.key} to={item.to} className="ap-row ap-row-tall">
              <span className="ap-row-t">
                <b className="ap-wrap">{item.title}</b>
                <small className="ap-wrap">{item.sub}</small>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

/** Liste puis détail sur téléphone : une seule des deux colonnes à la fois. */
export function useMasterDetail() {
  const isPhone = useIsPhone()
  const [detail, setDetail] = useState(false)
  return {
    isPhone,
    detail,
    openDetail: () => setDetail(true),
    closeDetail: () => setDetail(false),
    splitClass: isPhone ? (detail ? ' ap-md is-detail' : ' ap-md is-list') : '',
  }
}

export function PhoneBack({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="ap-md-back" onClick={onClick}>
      ‹ {label}
    </button>
  )
}

export type PhotoTone = 'pink' | 'orange' | 'green' | 'cyan' | 'navy'

export type PhotoCard = {
  to: string
  title: string
  sub?: string
  image: string
  tone: PhotoTone
  icon: ReactNode
  badge?: number
}

/**
 * Page d'accueil de rubrique au format de l'application apprenant : bandeau, cartes photo
 * (dégradé coloré, icône ronde, flèche) et carte large en bas. Tout tient dans un écran.
 */
export function PhotoHub({
  title,
  subtitle,
  back = '/',
  banner,
  cards,
  wide,
  wides,
}: {
  title: string
  subtitle?: string
  back?: string | null
  banner: { title: string; text: string; to?: string; cta?: string; tone?: 'green' | 'alert'; image?: string; badge?: string }
  cards: PhotoCard[]
  wide?: PhotoCard
  wides?: PhotoCard[]
}) {
  const renderCard = (c: PhotoCard, cls: string) => (
    <Link key={c.to + c.title} to={c.to} className={`ap-ph-card tone-${c.tone} ${cls}`}>
      <img src={c.image} alt="" className="ap-ph-img" />
      <span className="ap-ph-shade" />
      <span className="ap-ph-body">
        <span className="ap-ph-ico">{c.icon}</span>
        <b>{c.title}</b>
        {c.sub ? <small>{c.sub}</small> : null}
        <span className="ap-ph-arrow">›</span>
      </span>
      {c.badge && c.badge > 0 ? <em className="ap-ph-badge">{c.badge > 99 ? '99+' : c.badge}</em> : null}
    </Link>
  )
  return (
    <div className="ap-ph">
      <div className="ap-ph-top">
        {back ? (
          <Link to={back} className="ap-ph-round" aria-label="Retour">
            ‹
          </Link>
        ) : null}
        <div className="ap-ph-titles">
          <b>{title}</b>
          {subtitle ? <small>{subtitle}</small> : null}
        </div>
      </div>
      {banner.image ? (
        <div className="ap-ph-banner is-photo">
          <img src={banner.image} alt="" />
          <span className="ap-ph-bbadge">
            <i />
            {banner.badge || 'Ton parcours'}
          </span>
          <div className="ap-ph-bcap">
            <b>{banner.title}</b>
            <p>{banner.text}</p>
          </div>
          {banner.to ? <Link to={banner.to} className="ap-ph-bgo" aria-label={banner.cta || 'Ouvrir'} /> : null}
        </div>
      ) : (
        <div className={`ap-ph-banner${banner.tone === 'alert' ? ' is-alert' : ''}`}>
        <div>
          <b>{banner.title}</b>
          <p>{banner.text}</p>
        </div>
        {banner.to ? (
          <Link to={banner.to} className="ap-ph-cta">
            {banner.cta || 'Ouvrir'}
          </Link>
        ) : null}
      </div>
      )}
      <div className="ap-ph-grid">{cards.map((c) => renderCard(c, ''))}</div>
      {wide ? renderCard(wide, 'is-wide') : null}
      {wides ? wides.map((w) => renderCard(w, 'is-wide')) : null}
    </div>
  )
}
