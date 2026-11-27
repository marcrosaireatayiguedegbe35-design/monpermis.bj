import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, HelpCircle, Mic, Pause, Play, Square, SquareCheck } from 'lucide-react'
import type { ChapterQuestion } from '../../types/questions'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/question-phone.css'

const preview = (q: ChapterQuestion) => q.prompt?.text?.trim() || 'Énoncé audio'

/** Liste « Questions » d'un chapitre : même présentation que dans l'appli apprenant. */
export function QuestionListPhone({
  kicker,
  title,
  intro,
  questions,
  onOpen,
}: {
  kicker: string
  title: string
  intro: string
  questions: ChapterQuestion[]
  onOpen: (index: number) => void
}) {
  const withAudio = questions.filter((q) => q.prompt?.audioUrl).length
  const pct = questions.length ? Math.round((withAudio / questions.length) * 100) : 0
  return (
    <div className="qp-page">
      <div className="qp-intro">
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{intro}</p>
      </div>
      <div className="qp-stats">
        <HelpCircle aria-hidden />
        <b>{questions.length}</b>
        <small>Questions</small>
        <div className="qp-track">
          <i style={{ width: `${pct}%` }} />
        </div>
        <small>{withAudio} avec audio</small>
      </div>
      <div className="qp-list">
        {questions.map((q, i) => (
          <button key={q.id} type="button" className="qp-row" onClick={() => onOpen(i)}>
            <span className="qp-num">{q.order || i + 1}</span>
            <span className="qp-excerpt">{q.prompt?.text?.trim() ? preview(q) : `Question ${q.order || i + 1}`}</span>
            <ChevronRight aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Une question comme l'apprenant la voit (énoncé audio, sous-titres, réponses), bonnes réponses en vert. */
export function QuestionViewPhone({
  questions,
  index,
  onIndex,
  onClose,
  title,
}: {
  questions: ChapterQuestion[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  title: string
}) {
  const q = questions[index]
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(false)
  }, [index])
  useEffect(() => () => audioRef.current?.pause(), [])

  if (!q) return null
  const audioUrl = resolveMediaUrl(q.prompt?.audioUrl)
  const images = (q.prompt?.imageUrls || []).map((u) => resolveMediaUrl(u)).filter(Boolean)
  const correct = (q.answers || []).filter((a) => a.isCorrect)
  const pct = Math.round(((index + 1) / questions.length) * 100)

  const toggle = () => {
    if (!audioUrl) return
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    const a = audioRef.current ?? new Audio(audioUrl)
    audioRef.current = a
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    setPlaying(true)
    void a.play().catch(() => setPlaying(false))
  }

  return (
    <div className="qp-view">
      <div className="qp-vtop">
        <button type="button" className="qp-round" onClick={onClose} aria-label="Retour à la liste">
          <ChevronLeft aria-hidden />
        </button>
        <b>{title}</b>
        <span className="qp-count">
          {index + 1}/{questions.length}
        </span>
      </div>
      <div className="qp-vscroll">
        <p className="qp-plabel">
          Question {index + 1} / {questions.length}
        </p>
        <div className="qp-prow">
          <div className="qp-ptrack">
            <i style={{ width: `${pct}%` }} />
          </div>
          <span>{pct} %</span>
        </div>
        {correct.length > 1 ? <span className="qp-multi">{correct.length} bonnes réponses à cocher</span> : null}

        {audioUrl ? (
          <div className="qp-audio">
            <div className="qp-audio-head">
              <Mic aria-hidden />
              <b>ÉNONCÉ</b>
            </div>
            <p>{playing ? 'Lecture en cours…' : 'Écouter l’énoncé'}</p>
            <div className="qp-wave-row">
              <div className={`qp-wave${playing ? ' is-on' : ''}`} aria-hidden>
                {Array.from({ length: 22 }).map((_, i) => (
                  <i key={i} style={{ height: `${8 + ((i * 7) % 5) * 5}px` }} />
                ))}
              </div>
              <button type="button" className="qp-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Lire'}>
                {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
              </button>
            </div>
          </div>
        ) : (
          <p className="qp-noaudio">Audio manquant pour cette question.</p>
        )}

        {q.prompt?.text?.trim() ? (
          <div className="qp-sub">
            <small>SOUS-TITRES</small>
            <p>{q.prompt.text}</p>
          </div>
        ) : null}

        {images.length > 0 ? (
          <div className="qp-imgs">
            {images.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        ) : null}

        <h3 className="qp-atitle">Choisissez la ou les bonnes réponses</h3>
        <p className="qp-hint">Les bonnes réponses sont indiquées en vert.</p>
        {(q.answers || []).map((a) => (
          <div key={a.id || a.label} className={`qp-answer${a.isCorrect ? ' is-correct' : ''}`}>
            {a.isCorrect ? <SquareCheck aria-hidden /> : <Square aria-hidden />}
            <span>
              <b>{String(a.label || '').toUpperCase()}</b>
              {a.text ? <small>{a.text}</small> : null}
            </span>
          </div>
        ))}
      </div>
      <div className="qp-nav">
        <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)}>
          Précédente
        </button>
        <button type="button" className="is-primary" disabled={index >= questions.length - 1} onClick={() => onIndex(index + 1)}>
          Suivante
        </button>
      </div>
    </div>
  )
}
