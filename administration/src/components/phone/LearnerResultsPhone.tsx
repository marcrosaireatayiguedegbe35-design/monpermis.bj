import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
  MinusCircle,
  Radar,
  Search,
  TrendingDown,
  Trophy,
  XCircle,
} from 'lucide-react'
import { fetchLearnerReport, fetchRanking, type LearnerReport, type RankingEntry } from '../../api/learnerReport'
import { fetchUserProgress, type LearnerProgressDetail } from '../../api/users'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import '../../styles/results-phone.css'

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v).replace('.', ','))

/** Trois couleurs seulement, comme l'appli apprenant : rouge sous 14, orange de 14 à 17, vert dès 18. */
function tone(note: number | null | undefined) {
  if (note === null || note === undefined || Number.isNaN(note)) return { fg: '#64748B', deep: '#475569', cls: 'is-none' }
  if (note < 14) return { fg: '#DC2626', deep: '#B91C1C', cls: 'is-ko' }
  if (note < 18) return { fg: '#EA580C', deep: '#C2410C', cls: 'is-mid' }
  return { fg: '#16A34A', deep: '#15803D', cls: 'is-ok' }
}

const dateFr = (value?: string | null) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Liste « Résultats des apprenants » : un apprenant par carte avec sa moyenne, ses examens et son cours. */
export function LearnerListPhone() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<RankingEntry[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    try {
      setRows((await fetchRanking(token)).entries)
      setError(null)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => `${r.firstName} ${r.lastName} ${r.email} ${r.phone}`.toLowerCase().includes(needle))
  }, [rows, query])

  return (
    <div className="rp-page">
      <p className="rp-lead">Touchez un apprenant pour voir ses résultats, exactement comme il les voit dans son application.</p>
      <label className="rp-search">
        <Search aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un apprenant"
          aria-label="Rechercher un apprenant"
        />
      </label>
      {error ? <p className="rp-err">{error}</p> : null}
      {loading ? <p className="rp-empty">Chargement…</p> : null}
      {!loading && !error && filtered.length === 0 ? <p className="rp-empty">Aucun apprenant.</p> : null}
      <div className="rp-list">
        {filtered.map((r) => {
          const t = tone(r.average)
          const initials = `${r.firstName?.[0] || ''}${r.lastName?.[0] || ''}`.toUpperCase() || '·'
          return (
            <button key={r.userId} type="button" className="rp-lcard" onClick={() => navigate(`/code/suivi-apprenants/${r.userId}`)}>
              <span className="rp-lav">{initials}</span>
              <span className="rp-ltxt">
                <b>
                  {r.firstName} {r.lastName}
                </b>
                <small>
                  {r.evaluatedCount} examen{r.evaluatedCount > 1 ? 's' : ''} · cours {r.course.percent === null ? '—' : `${r.course.percent}%`}
                </small>
                {!r.isActive ? <em>Suspendu</em> : null}
              </span>
              <span className={`rp-lnote ${t.cls}`}>
                {fmt(r.average)}
                <i>/20</i>
              </span>
              <ChevronRight className="rp-lchev" aria-hidden />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Folder({ icon, label, value, kind }: { icon: React.ReactNode; label: string; value: string; kind?: 'ok' | 'ko' | 'warn' }) {
  return (
    <div className={`rp-folder${kind ? ` is-${kind}` : ''}`}>
      <span className="rp-folder-ico">{icon}</span>
      <b>{value}</b>
      <small>{label}</small>
    </div>
  )
}

function Row({ icon, title, sub, right, rightLabel }: { icon: React.ReactNode; title: string; sub?: string; right?: string; rightLabel?: string }) {
  return (
    <div className="rp-row">
      <span className="rp-row-ico">{icon}</span>
      <span className="rp-row-txt">
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      {right ? (
        <span className="rp-row-right">
          <b>{right}</b>
          {rightLabel ? <small>{rightLabel}</small> : null}
        </span>
      ) : null}
    </div>
  )
}

/** Fiche d'un apprenant : la page « Mes résultats » de son application (moyenne, examens, synthèse, cours). */
export function LearnerDetailPhone({ userId }: { userId: string }) {
  const [report, setReport] = useState<LearnerReport | null>(null)
  const [journey, setJourney] = useState<LearnerProgressDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [showRemaining, setShowRemaining] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      const token = getAdminToken()
      if (!token) {
        setError('Session expirée. Reconnectez-vous.')
        setLoading(false)
        return
      }
      try {
        const [r, j] = await Promise.all([
          fetchLearnerReport(token, userId),
          fetchUserProgress(token, userId).catch(() => null),
        ])
        setReport(r)
        setJourney(j)
        setError(null)
      } catch (err) {
        if (!silent) setError(isAuthError(err) ? err.message : 'Fiche indisponible')
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 15000)
    return () => window.clearInterval(timer)
  }, [load])

  if (loading && !report) return <p className="rp-empty">Chargement…</p>
  if (error || !report) return <p className="rp-err">{error || 'Apprenant introuvable.'}</p>

  const { learner, exams, course } = report
  const s = exams.summary
  const name = `${learner.firstName} ${learner.lastName}`.trim()
  const initials = `${learner.firstName?.[0] || ''}${learner.lastName?.[0] || ''}`.toUpperCase() || '·'
  const t = tone(s.average)
  const rows = [...exams.rows].sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')))
  const visible = showAll ? rows : rows.slice(0, 3)
  const remainingByChapter = Object.entries(
    course.remaining.reduce<Record<string, string[]>>((acc, l) => {
      ;(acc[l.chapterName] ||= []).push(l.title)
      return acc
    }, {}),
  )

  return (
    <div className="rp-page">
      <section className="rp-hero" style={{ background: `linear-gradient(135deg, ${t.fg}, ${t.deep})` }}>
        <span className="rp-hero-av">{initials}</span>
        <b className="rp-hero-name">{name || 'Apprenant'}</b>
        <span className="rp-hero-role">Élève · Code de la route</span>
        <div className="rp-hero-stats">
          <div>
            <b>{fmt(s.average)}</b>
            <small>Moyenne /20</small>
          </div>
          <div>
            <b>{s.evaluatedCount}</b>
            <small>Examens</small>
          </div>
          <div>
            <b>{course.percent === null ? '—' : `${course.percent}%`}</b>
            <small>Cours</small>
          </div>
        </div>
      </section>

      <p className="rp-meta">
        {learner.phone || '—'} · {learner.email || '—'} · inscrit le {dateFr(learner.registeredAt)}
      </p>
      <p className="rp-note">
        {s.average === null
          ? 'Aucun examen évalué pour le moment : la moyenne apparaîtra dès sa première réponse à un examen blanc.'
          : `Moyenne calculée sur ${s.evaluatedCount} examen${s.evaluatedCount > 1 ? 's' : ''} (meilleure tentative de chaque sujet). Seuil de réussite : ${exams.passScore}/20.`}
      </p>

      <div className="rp-sec">
        <h3>Examens blancs</h3>
        {rows.length > 3 ? (
          <button type="button" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Réduire' : 'Tout voir'}
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="rp-box">Aucun examen blanc composé pour le moment.</p>
      ) : (
        <div className="rp-exams">
          {visible.map((r) => {
            const rt = tone(r.note)
            return (
              <div key={r.attemptId} className="rp-exam">
                <span className={`rp-exam-note ${rt.cls}`}>
                  {fmt(r.note)}
                  <i>/20</i>
                </span>
                <span className="rp-exam-txt">
                  <b>Examen n° {r.examNumber}</b>
                  <small>
                    {r.correct}/{r.total} bonnes · {r.statusLabel} · {dateFr(r.lastAt)}
                  </small>
                </span>
                {r.passed === null ? null : <span className={`rp-chip ${r.passed ? 'is-ok' : 'is-ko'}`}>{r.passed ? 'Réussi' : 'Non réussi'}</span>}
              </div>
            )
          })}
        </div>
      )}

      <div className="rp-sec">
        <h3>Synthèse</h3>
      </div>
      <div className="rp-folders">
        <Folder icon={<HelpCircle aria-hidden />} label="Questions au total" value={String(s.totalQuestions)} />
        <Folder icon={<CheckCircle2 aria-hidden />} label="Correctes" value={String(s.totalCorrect)} kind="ok" />
        <Folder icon={<XCircle aria-hidden />} label="Incorrectes" value={String(s.totalIncorrect)} kind="ko" />
        <Folder icon={<MinusCircle aria-hidden />} label="Non traitées" value={String(s.totalUnanswered)} kind="warn" />
        <Folder icon={<ClipboardCheck aria-hidden />} label="Examens terminés" value={String(s.completedCount)} />
        <Folder icon={<ClipboardCheck aria-hidden />} label="Non terminés" value={String(s.unfinishedCount)} kind="warn" />
        <Folder icon={<Trophy aria-hidden />} label="Meilleure note" value={s.bestNote === null ? '—' : `${fmt(s.bestNote)}/20`} />
        <Folder icon={<TrendingDown aria-hidden />} label="Plus faible" value={s.lowestNote === null ? '—' : `${fmt(s.lowestNote)}/20`} />
      </div>

      <div className="rp-sec">
        <h3>Son cours</h3>
      </div>
      <div className="rp-listbox">
        <Row
          icon={<GraduationCap aria-hidden />}
          title={`Leçons terminées : ${course.completed}/${course.total}`}
          sub={course.statusLabel}
          right={course.percent === null ? '—' : `${course.percent}%`}
        />
        <Row
          icon={<BookOpen aria-hidden />}
          title="Suivi des leçons"
          sub={`${course.followed} suivie${course.followed > 1 ? 's' : ''} · ${course.inProgress} en cours · ${course.notStarted} non commencée${course.notStarted > 1 ? 's' : ''}`}
          right={`${course.chaptersValidated}/${course.chaptersTotal}`}
          rightLabel="chapitres validés"
        />
        {journey ? (
          <Row
            icon={<ClipboardCheck aria-hidden />}
            title="Où il en est"
            sub={journey.code.currentStop?.label ?? 'Aucun parcours code'}
            right={`${journey.code.chaptersDone}/${journey.code.chaptersTotal}`}
            rightLabel="chapitres"
          />
        ) : null}
        {journey && journey.conduite.chaptersTotal > 0 ? (
          <Row
            icon={<BookOpen aria-hidden />}
            title="Conduite / pratique"
            sub={journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}
            right={`${journey.conduite.chaptersDone}/${journey.conduite.chaptersTotal}`}
            rightLabel="chapitres"
          />
        ) : null}
      </div>

      {course.total > 0 ? (
        <button type="button" className="rp-toggle" onClick={() => setShowRemaining((v) => !v)}>
          Leçons restantes ({course.remaining.length}) <span>{showRemaining ? '▴' : '▾'}</span>
        </button>
      ) : null}
      {showRemaining
        ? remainingByChapter.map(([chapter, titles]) => (
            <div key={chapter} className="rp-chbox">
              <b>{chapter}</b>
              {titles.map((title) => (
                <small key={title}>• {title}</small>
              ))}
            </div>
          ))
        : null}

      {journey && journey.testScores.length > 0 ? (
        <>
          <div className="rp-sec">
            <h3>Sujets test par chapitre</h3>
          </div>
          <div className="rp-listbox">
            {journey.testScores.map((sc) => (
              <Row
                key={sc.chapterId}
                icon={<ClipboardCheck aria-hidden />}
                title={sc.chapterName}
                sub={`${sc.correct}/${sc.total} bonnes réponses`}
                right={sc.scoreLabel}
              />
            ))}
          </div>
        </>
      ) : null}

      <Link to={`/activite-apprenants?userId=${encodeURIComponent(userId)}`} className="rp-link">
        <Radar aria-hidden /> Voir son activité détaillée
      </Link>
    </div>
  )
}
