import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Pause, Play } from 'lucide-react'
import { CodeSection } from '../../components/model/CodeSection'
import { PANNEAUX_CATEGORIES, getPanneauCategory } from '../../data/panneauxCatalog'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/panneaux-phone.css'

const TOTAL = PANNEAUX_CATEGORIES.reduce((sum, c) => sum + c.count, 0)

/** Révision panneaux : catégories (comme dans l'application apprenant). */
export function PanneauxPage() {
  return (
    <CodeSection title="Révision panneaux" subtitle={`${TOTAL} panneaux · ${PANNEAUX_CATEGORIES.length} catégories`}>
      <div className="pn-page">
        <div className="pn-hero">
          <img src="/phone/panneaux.png" alt="" />
        </div>
        <div className="pn-list">
          {PANNEAUX_CATEGORIES.map((cat) => (
            <Link key={cat.id} to={`/code/panneaux/${cat.id}`} className="pn-row">
              <span className="pn-prefix">{cat.codePrefix}</span>
              <span className="pn-txt">
                <b>{cat.label}</b>
                <small>
                  {cat.count} {cat.count > 1 ? 'panneaux' : 'panneau'}
                </small>
              </span>
              <ChevronRight aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </CodeSection>
  )
}

/** Panneaux d'une catégorie : image, code, définition et lecture audio. */
export function PanneauxCategoryPage() {
  const { categoryId = '' } = useParams()
  const category = getPanneauCategory(categoryId)
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(
    () => () => {
      audio.current?.pause()
    },
    [],
  )

  if (!category) {
    return (
      <CodeSection title="Introuvable">
        <p className="pn-empty">
          Catégorie introuvable. <Link to="/code/panneaux">Retour aux catégories</Link>
        </p>
      </CodeSection>
    )
  }

  const toggle = (code: string, src?: string) => {
    audio.current?.pause()
    if (playing === code || !src) {
      setPlaying(null)
      return
    }
    const a = new Audio(resolveMediaUrl(src))
    audio.current = a
    a.onended = () => setPlaying((c) => (c === code ? null : c))
    a.onerror = () => setPlaying(null)
    setPlaying(code)
    void a.play().catch(() => setPlaying(null))
  }

  return (
    <CodeSection title={category.label} subtitle={`${category.count} panneaux — définition et audio`}>
      <div className="pn-page">
        <p className="pn-kicker">Code {category.codePrefix}</p>
        <div className="pn-signs">
          {category.signs.map((sign) => (
            <div key={sign.code} className="pn-sign">
              <img src={resolveMediaUrl(sign.image)} alt={sign.code} loading="lazy" />
              <span className="pn-sign-txt">
                <b>{sign.code}</b>
                <small>{sign.definition && sign.definition !== sign.code ? sign.definition : 'Définition à compléter.'}</small>
              </span>
              {sign.audio ? (
                <button type="button" className="pn-play" onClick={() => toggle(sign.code, sign.audio)} aria-label={playing === sign.code ? 'Arrêter' : 'Écouter'}>
                  {playing === sign.code ? <Pause aria-hidden /> : <Play aria-hidden />}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </CodeSection>
  )
}
