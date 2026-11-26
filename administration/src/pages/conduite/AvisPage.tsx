import { useEffect, useState } from 'react'
import { MessageSquareHeart } from 'lucide-react'
import { fetchReviews, type ReviewItem, type ReviewStat } from '../../api/conduiteFinance'
import { ConduiteSection } from '../../components/model/ConduiteSection'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../../ui'

function Stars({ value }: { value: number }) {
  const full = Math.round(value)
  return (
    <span className="cx-stars" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= full ? '' : 'off'}>★</span>
      ))}
    </span>
  )
}

function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Avis des apprenants après séance : lus uniquement par l'administration, jamais par les moniteurs. */
export function AvisPage() {
  const [stats, setStats] = useState<ReviewStat[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    fetchReviews(token, filter || undefined)
      .then((data) => {
        setReviews(data.reviews)
        if (!filter) setStats(data.stats)
      })
      .catch((err) => setError(isAuthError(err) ? err.message : 'Chargement impossible'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <ConduiteSection title="Avis des apprenants" subtitle="Donnés après chaque séance. Confidentiels : les moniteurs ne les voient pas.">
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {loading && reviews.length === 0 ? <SkeletonBlock rows={4} /> : null}

      {stats.length > 0 ? (
        <div className="cx-kc-grid">
          {stats.map((s) => (
            <button key={s.moniteurId} type="button" className={`cx-panel cx-split-card${filter === s.moniteurId ? ' cx-active' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setFilter(filter === s.moniteurId ? '' : s.moniteurId)}>
              <small>{s.moniteurName}</small>
              <b className="cx-split-big">{s.rating.toFixed(1)} / 5</b>
              <Stars value={s.rating} />
              <span className="cx-muted">
                {s.count} avis · ponctualité {s.punctuality.toFixed(1)} · pédagogie {s.pedagogy.toFixed(1)} · véhicule {s.vehicle.toFixed(1)} · {s.recommendPercent} % recommandent
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!loading && reviews.length === 0 ? (
        <EmptyState icon={<MessageSquareHeart size={28} />} title="Aucun avis pour le moment" description="Les avis apparaissent ici dès qu’un apprenant note une séance terminée." />
      ) : null}

      <div className="cx-view" style={{ gap: '.8rem' }}>
        {reviews.map((r) => (
          <article key={r.id} className="cx-review">
            <header>
              <div>
                <b>{r.learnerName}</b> <span className="cx-muted">→ {r.moniteurName}</span>
                <div className="cx-muted">{r.date ? `${dayLabel(r.date)} · ${r.startTime}–${r.endTime}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Stars value={r.rating} /> <b>{r.rating}/5</b>
                <div className="cx-muted">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
            </header>
            <div className="cx-review-scores">
              <span>Ponctualité {r.punctuality}/5</span>
              <span>Pédagogie {r.pedagogy}/5</span>
              <span>Véhicule {r.vehicle}/5</span>
              <span>{r.wouldRecommend ? 'Recommande' : 'Ne recommande pas'}</span>
            </div>
            {r.comment ? <p>{r.comment}</p> : null}
          </article>
        ))}
      </div>
    </ConduiteSection>
  )
}
