import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, ChevronDown, ChevronUp, ClipboardCheck, Minus, X } from 'lucide-react-native'
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  checkPracticeExamAnswer,
  completePracticeExam,
  ContentError,
  fetchPracticeExams,
  fetchResultAttemptReview,
  getStoredExamCategory,
  setStoredExamCategory,
  startPracticeExam,
  type PracticeExamAttempt,
  type PracticeExamsOverview,
  type ResultReviewQuestion,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { PageNavbar } from '../../components/PageNavbar'
import { ResultsHeader } from './ResultsHeader'
import { QuestionAudioSequence } from '../../components/QuestionAudioSequence'
import { QuestionPromptHtml } from '../../components/QuestionPromptHtml'
import { ScreenLoader } from '../../components/ScreenLoader'
import {
  enrichAnswersFromTranscript,
  resolveQuestionTranscript,
} from '../../data/codeRoute/questionTranscripts'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { stopAllQuizAudio } from '../../utils/quizSounds'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { resolveQuestionImageUri } from '../../utils/questionImages'
import { tracker } from '../../tracking/tracker'

type ListNav = NativeStackNavigationProp<RootStackParamList, 'ExamensTest'>
type TakeNav = NativeStackNavigationProp<RootStackParamList, 'ExamensTestTake'>
type TakeRoute = RouteProp<RootStackParamList, 'ExamensTestTake'>

export function ExamensTestScreen() {
  const navigation = useNavigation<ListNav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [data, setData] = useState<PracticeExamsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    void getStoredExamCategory().then(setCategory)
  }, [])

  const chooseCategory = (id: string | null) => {
    setCategory(id)
    void setStoredExamCategory(id)
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      // Liste construite sur l'appareil (instantanée) ; les notes du serveur la complètent ensuite.
      setData(await fetchPracticeExams((next) => setData(next)))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      if (!silent) setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useFocusRefresh(Boolean(user), () => {
    void load(true)
  })

  const handleStart = (examNumber: number) => {
    // Un seul start : l’écran d’épreuve appelle startPracticeExam au montage.
    navigation.navigate('ExamensTestTake', { examNumber })
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <PageNavbar
          title="Examens test"
          icon={ClipboardCheck}
          onBack={() => navigation.navigate('CodeRoute')}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load(true)
              }}
              tintColor={dark.green}
            />
          }
        >
          <Text style={styles.kicker}>Auto-évaluation</Text>
          <Text style={styles.title}>Examens test</Text>
          <Text style={styles.subtitle}>
            {data?.examTotal ?? 80} sujets · questions tirées au hasard à chaque essai ·{' '}
            {data?.requiredSize ?? 20} questions · note /20 · moyenne {data?.passScore ?? 14}/20
          </Text>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {data ? (
            <>
              {data.unlocked === false ? (
                <View style={styles.lockedBox}>
                  <Text style={styles.lockedTitle}>Examens test verrouillés</Text>
                  <Text style={styles.empty}>
                    {data.message ||
                      'Terminez tous les cours de chaque chapitre pour débloquer les examens test. Vous pouvez encore répondre aux questions et passer le sujet test de chaque chapitre.'}
                  </Text>
                  <Pressable
                    style={styles.revisionBtn}
                    onPress={() => navigation.navigate('RevisionChapitres')}
                  >
                    <Text style={styles.revisionBtnText}>Continuer la révision</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.banner}>
                    <View style={styles.bannerItem}>
                      <Text style={styles.bannerValue}>
                        {data.completedCount}/{data.examTotal}
                      </Text>
                      <Text style={styles.bannerLabel}>passés</Text>
                    </View>
                    <View style={styles.bannerItem}>
                      <Text style={styles.bannerValue}>
                        {data.passedCount}/{data.examTotal}
                      </Text>
                      <Text style={styles.bannerLabel}>réussis</Text>
                    </View>
                    <Pressable
                      style={styles.notesLink}
                      onPress={() => navigation.navigate('MesNotes')}
                    >
                      <Text style={styles.notesLinkText}>Mes notes</Text>
                    </Pressable>
                  </View>

                  {!category || !(data.categories || []).some((c) => c.id === category) ? (
                    <View style={styles.categoryBox}>
                      <Text style={styles.categoryTitle}>Quel permis préparez-vous ?</Text>
                      <Text style={styles.empty}>
                        Certaines questions ne concernent que certaines catégories (les deux-roues pour les
                        permis A1, A2 et A3). Choisissez votre catégorie avant de composer un examen.
                      </Text>
                      {(data.categories || []).map((item) => (
                        <Pressable
                          key={item.id}
                          style={styles.categoryOption}
                          onPress={() => chooseCategory(item.id)}
                        >
                          <Text style={styles.categoryOptionLabel}>{item.label}</Text>
                          {item.hint ? <Text style={styles.categoryOptionHint}>{item.hint}</Text> : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                  <>
                  <View style={styles.categoryCurrent}>
                    <Text style={styles.categoryCurrentText}>
                      Catégorie : {(data.categories || []).find((c) => c.id === category)?.label}
                    </Text>
                    <Pressable onPress={() => chooseCategory(null)}>
                      <Text style={styles.notesLinkText}>Changer</Text>
                    </Pressable>
                  </View>

                  {data.exams.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyTitle}>Examens en préparation</Text>
                      <Text style={styles.empty}>
                        {data.message ||
                          'Les examens test seront disponibles dès que ton auto-école aura publié les questions. Reviens bientôt !'}
                      </Text>
                    </View>
                  ) : null}

                  {data.message && data.exams.length > 0 ? (
                    <Text style={styles.empty}>{data.message}</Text>
                  ) : null}

                  {data.exams.map((exam) => (
                    <View
                      key={exam.id}
                      style={[
                        styles.examCard,
                        exam.status === 'completed' && styles.status_completed,
                        exam.status === 'in_progress' && styles.status_in_progress,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.examTitle}>Sujet {exam.examNumber}</Text>
                        <Text style={styles.examMeta}>
                          {exam.questionCount} questions
                          {exam.score
                            ? ` · ${exam.score.scoreLabel}${exam.score.passed ? ' · Réussi' : ''}`
                            : exam.status === 'in_progress'
                              ? ' · En cours'
                              : ''}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.startBtn}
                        disabled={data.examCount === 0}
                        onPress={() => handleStart(exam.examNumber)}
                      >
                        <Text style={styles.startBtnText}>
                          {exam.status === 'completed'
                            ? 'Repasser'
                            : exam.status === 'in_progress'
                              ? 'Continuer'
                              : 'Go'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                  </>
                  )}
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </DarkScreen>
  )
}

export function ExamensTestTakeScreen() {
  const navigation = useNavigation<TakeNav>()
  const route = useRoute<TakeRoute>()
  const { examNumber } = route.params
  const { user, loading: authLoading } = useRequireAuth(navigation)
  // Quitter vers l'accueil empile un autre écran sans démonter celui-ci : on coupe l'audio au blur.
  const isFocused = useIsFocused()
  const [attempt, setAttempt] = useState<PracticeExamAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // Examen : aucune correction ni note en direct (elles n'apparaissent qu'à la fin).
  const [review, setReview] = useState<ResultReviewQuestion[] | null>(null)
  const [openReview, setOpenReview] = useState<number | null>(null)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [finalScore, setFinalScore] = useState<{
    correct: number
    total: number
    scoreLabel: string
    passed: boolean
    passScore: number
  } | null>(null)
  const [sequenceLive, setSequenceLive] = useState(true)

  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds
  const submittedRef = useRef(submitted)
  submittedRef.current = submitted
  const checkingRef = useRef(checking)
  checkingRef.current = checking
  const indexRef = useRef(index)
  indexRef.current = index
  const questionsRef = useRef<PracticeExamAttempt['questions']>([])
  const attemptRef = useRef(attempt)
  attemptRef.current = attempt
  const sequenceLiveRef = useRef(sequenceLive)
  sequenceLiveRef.current = sequenceLive

  useEffect(() => {
    void import('../../utils/audioSession').then((m) => m.ensureAudioSession())
  }, [])

  const load = useCallback(async () => {
    stopAllQuizAudio()
    setLoading(true)
    setError(null)
    try {
      const { attempt: started } = await startPracticeExam(examNumber)
      setAttempt(started)
      const answered = started.answeredCount || 0
      setIndex(Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)))
      setSelectedIds([])
      setSubmitted(false)
      setAnsweredCount(answered)
      setFinished(started.status === 'completed')
      setSequenceLive(started.status !== 'completed')
      const baseContext = {
        attemptId: started.id,
        examNumber,
        examType: 'practice' as const,
      }
      if (started.status !== 'completed') {
        tracker.setActiveSession(baseContext)
        if (answered > 0) {
          tracker.track('exam_resume', baseContext, {
            answeredCount: answered,
            index: Math.min(answered, Math.max((started.questions?.length || 1) - 1, 0)),
          })
        } else {
          tracker.track('exam_start', baseContext, { answeredCount: 0 })
        }
        tracker.markQuestionStart()
      } else {
        tracker.setActiveSession(null)
      }
      if (started.status === 'completed') {
        setFinalScore({
          correct: started.correct,
          total: started.total,
          scoreLabel: started.scoreLabel,
          passed: started.passed,
          passScore: started.passScore,
        })
      }
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [examNumber])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => {
    setSequenceLive(true)
    setSelectedIds([])
    setSubmitted(false)
    // Pas de stopAllQuizAudio ici : coupe la nouvelle séquence au montage.
    tracker.markQuestionStart()
  }, [index])

  useEffect(() => {
    return () => {
      tracker.setActiveSession(null)
    }
  }, [])

  useEffect(() => {
    if (finished) stopAllQuizAudio()
  }, [finished])

  // Correction complète, uniquement une fois l'examen terminé.
  useEffect(() => {
    if (!finished || !attempt) return
    let cancelled = false
    void fetchResultAttemptReview(attempt.id)
      .then((list) => {
        if (!cancelled) setReview(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [finished, attempt])

  useEffect(() => {
    if (!isFocused) stopAllQuizAudio()
  }, [isFocused])

  // Sélection d’une réponse : ne coupe PAS l’audio (2 lectures complètes jusqu’à Continuer / fin de séquence).

  const questions = attempt?.questions || []
  questionsRef.current = questions
  const question = questions[index]

  // Images de l'énoncé (panneaux, situations de route) : fichier embarqué, réseau en secours.
  const [resolvedImages, setResolvedImages] = useState<{ key: string; uri: string }[]>([])
  useEffect(() => {
    let cancelled = false
    const urls = question?.prompt?.imageUrls || []
    if (!question || urls.length === 0) {
      setResolvedImages([])
      return
    }
    ;(async () => {
      const next: { key: string; uri: string }[] = []
      for (const url of urls) {
        const uri = await resolveQuestionImageUri(question.id, url)
        if (uri) next.push({ key: url, uri })
      }
      if (!cancelled) setResolvedImages(next)
    })()
    return () => {
      cancelled = true
    }
  }, [question?.id, question?.prompt?.imageUrls])
  // Préchargement de la question suivante (image + audio) pendant que le candidat répond :
  // les fichiers sont déjà en cache quand il passe à la suite, au lieu de charger après le clic.
  useEffect(() => {
    const next = questions[index + 1]
    if (!next) return
    let cancelled = false
    ;(async () => {
      for (const url of next.prompt?.imageUrls || []) {
        const uri = await resolveQuestionImageUri(next.id, url).catch(() => undefined)
        if (cancelled) return
        if (uri && /^https?:/i.test(uri)) void Image.prefetch(uri).catch(() => undefined)
      }
      const audio = resolveMediaUrl(next.prompt?.audioUrl)
      if (!cancelled && audio) void fetch(audio).catch(() => undefined)
    })()
    return () => {
      cancelled = true
    }
  }, [index, questions])
  const displayAnswers = useMemo(() => {
    if (!question) return []
    const transcript = resolveQuestionTranscript({
      id: question.id,
      order: question.order,
      prompt: question.prompt,
    })
    return enrichAnswersFromTranscript(question.answers, transcript)
  }, [question])
  const progressLabel = useMemo(() => {
    if (!questions.length) return ''
    return `Question ${Math.min(index + 1, questions.length)} / ${questions.length}`
  }, [index, questions.length])

  const toggleAnswer = (answerId: string) => {
    if (submitted || checking) return
    setSelectedIds((current) =>
      current.includes(answerId)
        ? current.filter((id) => id !== answerId)
        : [...current, answerId],
    )
  }

  const finishOrAdvance = useCallback(async () => {
    const currentAttempt = attemptRef.current
    const currentIndex = indexRef.current
    const list = questionsRef.current
    if (!currentAttempt) return

    if (currentIndex + 1 >= list.length) {
      stopAllQuizAudio()
      setSequenceLive(false)
      try {
        const { attempt: score } = await completePracticeExam(currentAttempt.id)
        tracker.track(
          'exam_complete',
          {
            attemptId: currentAttempt.id,
            examNumber,
            examType: 'practice',
          },
          {
            correct: score.correct,
            total: score.total,
            passed: score.passed,
            scoreLabel: score.scoreLabel,
          },
        )
        tracker.setActiveSession(null)
        setFinalScore(score)
        setFinished(true)
      } catch (err) {
        setError(err instanceof ContentError ? err.message : 'Validation impossible')
      }
      return
    }
    stopAllQuizAudio()
    setIndex((value) => value + 1)
    setSelectedIds([])
    setSubmitted(false)
    setSequenceLive(true)
  }, [examNumber])

  const skipMissed = useCallback(async () => {
    const currentAttempt = attemptRef.current
    const currentQuestion = questionsRef.current[indexRef.current]
    if (
      !currentAttempt ||
      !currentQuestion ||
      checkingRef.current ||
      submittedRef.current
    )
      return

    setChecking(true)
    setSubmitted(true)
    setSequenceLive(false)
    stopAllQuizAudio()
    try {
      const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, [])
      tracker.track(
        'exam_skip',
        {
          attemptId: currentAttempt.id,
          examNumber,
          examType: 'practice',
          questionId: currentQuestion.id,
        },
        { index: indexRef.current, elapsedMs: tracker.consumeElapsedMs() },
      )
      setAnsweredCount(data.answeredCount)
      await finishOrAdvance()
    } catch (err) {
      setSubmitted(false)
      setError(err instanceof ContentError ? err.message : 'Vérification impossible')
    } finally {
      setChecking(false)
    }
  }, [examNumber, finishOrAdvance])

  const resolveSelection = useCallback(
    async (ids: string[]) => {
      const currentAttempt = attemptRef.current
      const currentQuestion = questionsRef.current[indexRef.current]
      if (
        !currentAttempt ||
        !currentQuestion ||
        ids.length === 0 ||
        checkingRef.current ||
        submittedRef.current
      )
        return

      setChecking(true)
      setSubmitted(true)
      setSequenceLive(false)
      stopAllQuizAudio()
      try {
        const data = await checkPracticeExamAnswer(currentAttempt.id, currentQuestion.id, ids)
        tracker.track(
          'exam_answer',
          {
            attemptId: currentAttempt.id,
            examNumber,
            examType: 'practice',
            questionId: currentQuestion.id,
          },
          {
            answerIds: ids,
            isCorrect: data.isCorrect,
            index: indexRef.current,
            answeredCount: data.answeredCount,
            elapsedMs: tracker.consumeElapsedMs(),
          },
        )
        setAnsweredCount(data.answeredCount)
        // Pas de correction pendant l'examen : on passe directement à la question suivante.
        await finishOrAdvance()
      } catch (err) {
        setSubmitted(false)
        setError(err instanceof ContentError ? err.message : 'Vérification impossible')
        setSequenceLive(selectedIdsRef.current.length === 0)
      } finally {
        setChecking(false)
      }
    },
    [examNumber, finishOrAdvance],
  )

  const handleSequenceComplete = useCallback(() => {
    if (!sequenceLiveRef.current) return
    const ids = selectedIdsRef.current
    if (ids.length > 0) {
      void resolveSelection(ids)
      return
    }
    void skipMissed()
  }, [resolveSelection, skipMissed])

  const handleContinue = () => {
    const ids = selectedIdsRef.current
    if (ids.length === 0 || checking || submitted) return
    setSequenceLive(false)
    stopAllQuizAudio()
    void resolveSelection(ids)
  }

  const leaveMessage =
    answeredCount > 0
      ? `Quitter ? Vos ${answeredCount} réponses seront conservées dans vos notes, mais cet examen ne pourra pas être repris : de nouvelles questions seront tirées au prochain essai.`
      : 'Quitter ? Cet examen ne pourra pas être repris : de nouvelles questions seront tirées au prochain essai.'
  useLeaveGuard(Boolean(attempt) && !finished && !loading, leaveMessage, () => {
    const currentAttempt = attemptRef.current
    tracker.track(
      'exam_quit',
      {
        attemptId: currentAttempt?.id || '',
        examNumber,
        examType: 'practice',
      },
      {
        answeredCount,
        index: indexRef.current,
        elapsedMs: tracker.consumeElapsedMs(),
      },
    )
    tracker.setActiveSession(null)
  })

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <ConfettiBurst active={Boolean(finished && finalScore?.passed)} />
        <ResultsHeader
          title={`Examen ${examNumber}`}
          subtitle={finished ? 'Résultat • Correction' : 'Examen blanc'}
          onBack={() => navigation.navigate('ExamensTest')}
        />

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>Examen blanc</Text>
          <Text style={styles.title}>Examen {examNumber}</Text>
          <Text style={styles.subtitle}>
            Seuil de réussite : {attempt?.passScore ?? 14}/20 · Note finale à la fin
          </Text>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !finished && answeredCount > 0 ? (
            <Text style={styles.success}>
              Reprise à la question {Math.min(index + 1, attempt?.total || 20)} · {answeredCount}{' '}
              réponse{answeredCount > 1 ? 's' : ''} enregistrée{answeredCount > 1 ? 's' : ''}.
            </Text>
          ) : null}

          {finished && finalScore ? (
            <ExamResult
              examNumber={examNumber}
              score={finalScore}
              review={review}
              openReview={openReview}
              onToggle={(i) => setOpenReview((current) => (current === i ? null : i))}
              onNotes={() => navigation.navigate('MesNotes')}
              onList={() => navigation.navigate('ExamensTest')}
              onRetry={() => {
                setReview(null)
                setOpenReview(null)
                setFinished(false)
                setFinalScore(null)
                setIndex(0)
                setAnsweredCount(0)
                void load()
              }}
            />
          ) : null}

          {!loading && question && !finished ? (
            <View style={styles.quizBox}>
              <Text style={styles.progress}>{progressLabel}</Text>
              {(question.correctCount ?? 1) > 1 ? (
                <Text style={styles.multiBadge}>
                  {question.correctCount} bonnes réponses à cocher
                </Text>
              ) : null}
              {question.prompt?.text ? (
                <QuestionPromptHtml text={question.prompt.text} style={styles.prompt} />
              ) : null}
              {isFocused && sequenceLive && !submitted ? (
                <QuestionAudioSequence
                  questionKey={question.id}
                  promptUri={question.prompt?.audioUrl}
                  offlineOnly
                  onSequenceComplete={handleSequenceComplete}
                />
              ) : null}
              {resolvedImages.length > 0 ? (
                <View style={styles.images}>
                  {resolvedImages.map((img) => (
                    <Image
                      key={img.key}
                      source={{ uri: img.uri }}
                      style={styles.image}
                      resizeMode="contain"
                      onError={() => setResolvedImages((prev) => prev.filter((item) => item.key !== img.key))}
                    />
                  ))}
                </View>
              ) : null}
              {displayAnswers.map((answer) => {
                const selected = selectedIds.includes(answer.id)
                return (
                  <Pressable
                    key={answer.id}
                    style={[styles.answer, selected && styles.answerSelected]}
                    onPress={() => toggleAnswer(answer.id)}
                    disabled={submitted || checking}
                  >
                    <Text style={styles.answerLabel}>{answer.label.toUpperCase()}</Text>
                    {answer.text ? <Text style={styles.answerMeta}>{answer.text}</Text> : null}
                  </Pressable>
                )
              })}

              {!submitted && selectedIds.length > 0 ? (
                <Pressable
                  style={[styles.primaryBtn, checking && styles.primaryBtnDisabled]}
                  disabled={checking}
                  onPress={handleContinue}
                >
                  {checking ? (
                    <ActivityIndicator color={'#0B0F1A'} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {index + 1 >= (attempt?.questions.length ?? 0) ? 'Valider et terminer' : 'Valider'}
                    </Text>
                  )}
                </Pressable>
              ) : null}
              {!submitted ? (
                <Text style={styles.awaitingText}>
                  Vous pouvez répondre dès maintenant. La correction et votre note n’apparaissent qu’à la fin de l’examen.
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </DarkScreen>
  )
}



type ExamScore = { correct: number; total: number; scoreLabel: string; passed: boolean; passScore: number }

/**
 * Page de résultat final (même univers visuel que la liste des examens : bandeau doux, cartes blanches).
 * C'est la SEULE page qui montre la note et la correction : rien n'est révélé pendant l'examen.
 */
function ExamResult({
  examNumber,
  score,
  review,
  openReview,
  onToggle,
  onNotes,
  onList,
  onRetry,
}: {
  examNumber: number
  score: ExamScore
  review: ResultReviewQuestion[] | null
  openReview: number | null
  onToggle: (index: number) => void
  onNotes: () => void
  onList: () => void
  onRetry: () => void
}) {
  const passed = score.passed
  const tone = passed ? dark.green : dark.coral
  const wrong = review ? review.filter((q) => q.state === 'wrong').length : null
  const skipped = review ? review.filter((q) => q.state === 'unanswered' || q.state === 'skipped').length : null
  const ratio = score.total > 0 ? Math.min(1, score.correct / score.total) : 0

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.resHero, { backgroundColor: passed ? dark.greenSoft : dark.coralSoft, borderColor: tone }]}>
        <View style={[styles.resBadge, { backgroundColor: tone }]}>
          {passed ? <Check size={22} color="#FFFFFF" /> : <X size={22} color="#FFFFFF" />}
        </View>
        <Text style={styles.resKicker}>Résultat · Examen {examNumber}</Text>
        <Text style={[styles.resTitle, { color: tone }]}>{passed ? 'Examen réussi' : 'Examen non réussi'}</Text>
        <Text style={styles.resScore}>
          {score.correct}
          <Text style={styles.resScoreTotal}>/{score.total}</Text>
        </Text>
        <View style={styles.resTrack}>
          <View style={[styles.resFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: tone }]} />
          <View style={[styles.resThreshold, { left: `${Math.round((score.passScore / score.total) * 100)}%` }]} />
        </View>
        <Text style={styles.resCaption}>
          Seuil de réussite : {score.passScore}/{score.total}
          {passed ? ' — bravo !' : ` — il manquait ${Math.max(0, score.passScore - score.correct)} point${score.passScore - score.correct > 1 ? 's' : ''}.`}
        </Text>
      </View>

      <View style={styles.resStats}>
        <View style={styles.resStat}>
          <Text style={[styles.resStatValue, { color: dark.green }]}>{score.correct}</Text>
          <Text style={styles.resStatLabel}>Bonnes réponses</Text>
        </View>
        <View style={styles.resStatDivider} />
        <View style={styles.resStat}>
          <Text style={[styles.resStatValue, { color: dark.coral }]}>{wrong ?? '–'}</Text>
          <Text style={styles.resStatLabel}>Mauvaises</Text>
        </View>
        <View style={styles.resStatDivider} />
        <View style={styles.resStat}>
          <Text style={styles.resStatValue}>{skipped ?? '–'}</Text>
          <Text style={styles.resStatLabel}>Sans réponse</Text>
        </View>
      </View>

      <Pressable style={styles.primaryBtn} onPress={onNotes}>
        <Text style={styles.primaryBtnText}>Voir mes notes</Text>
      </Pressable>
      <View style={styles.resActions}>
        <Pressable style={styles.resGhostBtn} onPress={onRetry}>
          <Text style={styles.resGhostText}>Refaire un examen</Text>
        </Pressable>
        <Pressable style={styles.resGhostBtn} onPress={onList}>
          <Text style={styles.resGhostText}>Autres examens</Text>
        </Pressable>
      </View>

      <Text style={styles.resSection}>Correction question par question</Text>
      {!review ? <ActivityIndicator color={dark.green} /> : null}
      {review?.map((q) => {
        const open = openReview === q.index
        const stateColor = q.state === 'correct' ? dark.green : q.state === 'wrong' ? dark.coral : dark.textMuted
        return (
          <View key={q.questionId} style={styles.resCard}>
            <Pressable style={styles.resCardHead} onPress={() => onToggle(q.index)}>
              <View style={[styles.resIndex, { backgroundColor: stateColor }]}>
                {q.state === 'correct' ? (
                  <Check size={14} color="#FFFFFF" />
                ) : q.state === 'wrong' ? (
                  <X size={14} color="#FFFFFF" />
                ) : (
                  <Minus size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.resCardTitle} numberOfLines={open ? undefined : 2}>
                {q.index}. {q.prompt.text || 'Question'}
              </Text>
              {open ? <ChevronUp size={18} color={dark.textMuted} /> : <ChevronDown size={18} color={dark.textMuted} />}
            </Pressable>
            {open ? (
              <View style={styles.resAnswers}>
                {q.answers.map((answer) => (
                  <View
                    key={answer.id}
                    style={[
                      styles.resAnswer,
                      answer.isCorrect && styles.resAnswerGood,
                      answer.selected && !answer.isCorrect && styles.resAnswerBad,
                    ]}
                  >
                    <Text style={styles.resAnswerLabel}>{answer.label}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resAnswerText}>{answer.text}</Text>
                      {answer.isCorrect || answer.selected ? (
                        <Text style={[styles.resAnswerTag, { color: answer.isCorrect ? dark.green : dark.coral }]}>
                          {answer.isCorrect ? 'Bonne réponse' : ''}
                          {answer.isCorrect && answer.selected ? ' · ' : ''}
                          {answer.selected ? 'Votre choix' : ''}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
                {q.state === 'unanswered' ? <Text style={styles.resAnswerTag}>Question sans réponse.</Text> : null}
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  resHero: {
    borderRadius: 30,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  resBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  resKicker: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.6, color: dark.textMuted, textTransform: 'uppercase' },
  resTitle: { fontFamily: fonts.displayBold, fontSize: 22 },
  resScore: { fontFamily: fonts.displayBold, fontSize: 64, color: dark.textPrimary, lineHeight: 62 },
  resScoreTotal: { fontSize: 24, color: dark.textMuted },
  resTrack: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: 'rgba(0,16,48,0.08)', marginTop: 6, overflow: 'visible' },
  resFill: { height: 10, borderRadius: 5 },
  resThreshold: { position: 'absolute', top: -3, width: 2, height: 16, backgroundColor: dark.textPrimary, borderRadius: 1 },
  resCaption: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted, textAlign: 'center', marginTop: 4 },
  resStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  resStat: { flex: 1, alignItems: 'center', gap: 2 },
  resStatValue: { fontFamily: fonts.displayBold, fontSize: 24, color: dark.textPrimary },
  resStatLabel: { fontFamily: fonts.body, fontSize: 12, color: dark.textMuted },
  resStatDivider: { width: 1, height: 32, backgroundColor: dark.border },
  resActions: { flexDirection: 'row', gap: 10 },
  resGhostBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.12)',
    backgroundColor: '#FFFFFF',
  },
  resGhostText: { fontFamily: fonts.bodyBold, fontSize: 13, color: dark.textPrimary },
  resSection: { fontFamily: fonts.bodyBold, fontSize: 16, color: dark.textPrimary, marginTop: 6 },
  resCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', backgroundColor: '#FFFFFF', overflow: 'hidden' },
  resCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  resIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resCardTitle: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: dark.textPrimary },
  resAnswers: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  resAnswer: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
  },
  resAnswerGood: { borderColor: dark.green, backgroundColor: dark.greenSoft },
  resAnswerBad: { borderColor: dark.coral, backgroundColor: dark.coralSoft },
  resAnswerLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.textPrimary, width: 18 },
  resAnswerText: { fontFamily: fonts.body, fontSize: 13, color: dark.textPrimary },
  resAnswerTag: { fontFamily: fonts.bodyBold, fontSize: 12, color: dark.textMuted, marginTop: 2 },
  categoryBox: {
    gap: 10,
    marginTop: 8,
  },
  categoryTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  categoryOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    gap: 2,
  },
  categoryOptionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  categoryOptionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  categoryCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryCurrentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  scroll: { paddingHorizontal: 22, paddingBottom: 28 },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    marginBottom: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: dark.greenSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: dark.border,
  },
  bannerItem: { flex: 1 },
  bannerValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  bannerLabel: { fontFamily: fonts.body, fontSize: 12, color: dark.textMuted },
  notesLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
  },
  notesLinkText: {
    fontFamily: fonts.bodyBold,
    color: dark.textPrimary,
    fontSize: 13,
  },
  emptyBox: {
    marginTop: 8,
    marginBottom: 4,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    gap: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  lockedBox: {
    marginTop: 8,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    gap: 12,
  },
  lockedTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  revisionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  revisionBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 10,
  },
  status_available: {},
  status_in_progress: {
    backgroundColor: dark.coralSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  status_completed: {
    backgroundColor: dark.greenSoft,
    borderColor: 'rgba(34,214,115,0.35)',
  },
  examTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  examMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginTop: 2,
  },
  startBtn: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  startBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  disabled: { opacity: 0.5 },
  empty: {
    fontFamily: fonts.body,
    color: dark.textMuted,
    marginBottom: 12,
  },
  error: { color: dark.coral, marginBottom: 10, fontFamily: fonts.body },
  success: { color: dark.green, marginBottom: 10, fontFamily: fonts.body },
  multiBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    overflow: 'hidden',
  },
  quizBox: { gap: 10 },
  progress: {
    fontFamily: fonts.bodyBold,
    color: dark.textMuted,
    marginBottom: 4,
  },
  prompt: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  answer: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: dark.surfaceRaised,
  },
  images: {
    gap: 8,
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  answerSelected: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  answerCorrect: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  answerWrong: {
    borderColor: dark.coral,
    backgroundColor: dark.coralSoft,
  },
  feedbackLine: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  feedbackOk: { color: dark.green },
  feedbackKo: { color: dark.coral },
  answerLabel: {
    fontFamily: fonts.displayBold,
    color: dark.textPrimary,
  },
  answerMeta: {
    marginTop: 4,
    fontSize: 13,
    color: dark.textMuted,
    fontFamily: fonts.body,
  },
  resultBox: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
    gap: 12,
    alignItems: 'flex-start',
  },
  resultTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  resultScore: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.green,
  },
  awaitingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
})
