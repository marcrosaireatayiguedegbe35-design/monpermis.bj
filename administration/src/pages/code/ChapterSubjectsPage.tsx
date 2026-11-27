import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { fetchCurrentTestSubject, fetchTestSubjectQuestions } from '../../api/questions'
import { CodeSection } from '../../components/model/CodeSection'
import { QuestionViewPhone } from '../../components/phone/QuestionPhone'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { ChapterQuestion, TestSubjectSummary } from '../../types/questions'
import { useIsPhone } from '../MobileHome'
import '../../styles/question-phone.css'

/** Sujets test d'un chapitre (téléphone) : mêmes cartes vertes que dans l'appli apprenant ; un sujet s'ouvre question par question. */
export function ChapterSubjectsPage() {
  const { chapterId = '', subjectNumber } = useParams()
  const isPhone = useIsPhone()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [subjects, setSubjects] = useState<TestSubjectSummary[]>([])
  const [questions, setQuestions] = useState<ChapterQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const number = subjectNumber ? Number(subjectNumber) : null

  useEffect(() => {
    const token = getAdminToken()
    if (!token || !chapterId) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setIndex(0)
    const run = async () => {
      try {
        if (number) {
          const data = await fetchTestSubjectQuestions(token, chapterId, number)
          if (cancelled) return
          setName(data.chapter.name)
          setQuestions(data.subject.questions)
        } else {
          const data = await fetchCurrentTestSubject(token, chapterId)
          if (cancelled) return
          setName(data.chapter.name)
          setSubjects(Array.isArray(data.subjects) ? data.subjects : [])
        }
      } catch (err) {
        if (!cancelled) setError(isAuthError(err) ? err.message : 'Chargement impossible')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [chapterId, number])

  if (!isPhone) return <Navigate to={`/code/revision-chapitres?chapter=${chapterId}`} replace />

  if (number && !loading && !error && questions.length > 0) {
    return (
      <QuestionViewPhone
        questions={questions}
        index={index}
        onIndex={setIndex}
        onClose={() => navigate(`/code/revision-chapitres/${chapterId}/sujets`)}
        title={`Sujet ${number}`}
      />
    )
  }

  return (
    <CodeSection title={name || 'Sujets test'}>
      <div className="qp-page">
        <div className="qp-intro">
          <span>Évaluation</span>
          <h2>Sujets test</h2>
          <p>
            {subjects.length > 0
              ? `${subjects.length} sujet${subjects.length > 1 ? 's' : ''} — touchez-en un pour voir ses questions.`
              : 'Chaque sujet propose un jeu de questions différent.'}
          </p>
        </div>
        {loading ? <p className="ap-empty">Chargement…</p> : null}
        {error ? <p className="cx-note cx-note-err">{error}</p> : null}
        {!loading && !error && number && questions.length === 0 ? <p className="ap-empty">Sujet vide.</p> : null}
        {!loading && !error && !number && subjects.length === 0 ? <p className="ap-empty">Aucun sujet test : aucune question publiée pour ce chapitre.</p> : null}
        {!number
          ? subjects.map((subject) => (
              <Link key={subject.id || subject.number} to={`/code/revision-chapitres/${chapterId}/sujets/${subject.number}`} className="qp-subject">
                <ClipboardList aria-hidden />
                <span>
                  <b>{subject.label}</b>
                  <small>
                    {subject.questionCount} question{subject.questionCount !== 1 ? 's' : ''}
                  </small>
                </span>
                <ChevronRight aria-hidden />
              </Link>
            ))
          : null}
      </div>
    </CodeSection>
  )
}
