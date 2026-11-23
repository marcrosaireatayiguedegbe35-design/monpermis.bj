import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiAuthed, ApiError } from './client'
import { mergeWithStandardChapters, getChapterOrderById } from '../data/codeRoute/chapterIndex'
import {
  checkLocalAnswers,
  getLocalBankByChapterOrder,
  toPublicLocalQuestion,
} from '../data/codeRoute/banks'
import { buildLocalSubject, buildLocalSubjectSummaries } from '../data/codeRoute/subjects'
import { listStandardChapterShells } from '../data/codeRoute/standardChapters'
import { cacheGetThenFetch, cacheGet, cacheSet, OFFLINE_TTL_MS } from '../utils/contentCache'
import {
  buildLocalResultsReport,
  checkLocalExamAnswer,
  completeLocalExam,
  isLocalAttemptId,
  localAttemptReview,
  localPracticeExamsOverview,
  markExamSynced,
  mergeServerReportWithLocal,
  pendingExamSyncs,
  rememberServerScores,
  startLocalExam,
} from '../utils/localExams'
import { getStoredUser } from './session'

export interface RevisionModule {
  id: string
  name: string
  title: string
  text: string
  mediaType: '' | 'video' | 'image'
  videoUrl: string
  imageUrl: string
  mediaBytes: number
  order: number
}

export interface RevisionCourse {
  id: string
  title: string
  order: number
  modules: RevisionModule[]
}

export interface RevisionChapter {
  id: string
  name: string
  order: number
  courses: RevisionCourse[]
}

export interface CourseProgressEntry {
  chapterId: string
  courseId: string
  completedAt?: string
}

export interface TestProgressEntry {
  chapterId: string
  correct: number
  total: number
  completedAt?: string
}

export interface CourseSessionEntry {
  chapterId: string
  courseId: string
  openedAt?: string
  secondsRemaining: number
}

export interface LearnerProgress {
  minCourseSeconds: number
  completedCourses: CourseProgressEntry[]
  completedTests: TestProgressEntry[]
  courseSessions: CourseSessionEntry[]
}

export interface CourseSessionStart {
  chapterId: string
  courseId: string
  openedAt: string | null
  secondsRemaining: number
  minCourseSeconds: number
  alreadyCompleted: boolean
}

export class ContentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContentError'
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { auth?: boolean },
): Promise<T> {
  const { auth: _auth, ...rest } = options ?? {}
  try {
    return await apiAuthed<T>(path, rest)
  } catch (error) {
    if (error instanceof ApiError) throw new ContentError(error.message)
    throw new ContentError('Contenu indisponible')
  }
}


function withStandardChapters(chapters: RevisionChapter[]) {
  return mergeWithStandardChapters(chapters)
}

export async function fetchRevisionChapters(): Promise<RevisionChapter[]> {
  try {
    return await cacheGetThenFetch('revision:chapters', async () => {
      const data = await request<{ chapters: RevisionChapter[] }>('/content/revision/chapters', {
        auth: true,
      })
      return withStandardChapters(data.chapters)
    })
  } catch {
    // Hors ligne : essayer le cache étendu, puis les chapitres locaux.
    const cached = await cacheGet<RevisionChapter[]>('revision:chapters', 7 * 24 * 60 * 60 * 1000)
    if (cached) return withStandardChapters(cached.data)
    return withStandardChapters(listStandardChapterShells() as RevisionChapter[])
  }
}

export interface CourseChapter {
  id: string
  name: string
  order: number
  courses: {
    id: string
    title: string
    order: number
    modules: RevisionChapter['courses'][number]['modules']
  }[]
}

/** Chapitres du parcours Cours, avec leurs notions publiées. */
export async function fetchCourseChapters(): Promise<CourseChapter[]> {
  const data = await request<{ chapters: CourseChapter[] }>(
    '/content/revision/course-chapters',
    { auth: true },
  )
  return data.chapters
}

/** Liste plate de toutes les notions publiées. */
export async function fetchRevisionCourses(): Promise<
  {
    id: string
    title: string
    order: number
    modules: RevisionChapter['courses'][number]['modules']
  }[]
> {
  const data = await request<{
    courses: {
      id: string
      title: string
      order: number
      modules: RevisionChapter['courses'][number]['modules']
    }[]
  }>('/content/revision/courses', { auth: true })
  return data.courses
}

/** Variante SWR : pousse le cache immédiatement via onData, puis le réseau. */
export async function fetchRevisionChaptersSWR(
  onData: (chapters: RevisionChapter[], meta: { fromCache: boolean }) => void,
) {
  // Les 19 chapitres sont connus dans le code : on les affiche tout de suite, le réseau enrichit ensuite.
  const hasCache = await cacheGet<RevisionChapter[]>('revision:chapters', OFFLINE_TTL_MS).catch(() => null)
  if (!hasCache) onData(withStandardChapters(listStandardChapterShells() as RevisionChapter[]), { fromCache: true })
  try {
    return await cacheGetThenFetch(
      'revision:chapters',
      async () => {
        const data = await request<{ chapters: RevisionChapter[] }>('/content/revision/chapters', {
          auth: true,
        })
        return withStandardChapters(data.chapters)
      },
      {
        onData: (data, meta) => onData(withStandardChapters(data), { fromCache: meta.fromCache }),
      },
    )
  } catch {
    const local = withStandardChapters(listStandardChapterShells() as RevisionChapter[])
    onData(local, { fromCache: true })
    return local
  }
}

export async function fetchLearnerProgress(chapterId?: string): Promise<LearnerProgress> {
  const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : ''
  try {
    return await request<LearnerProgress>(`/content/revision/progress${query}`, { auth: true })
  } catch {
    // Hors ligne : retourner une progression vide
    return {
      minCourseSeconds: 300,
      completedCourses: [],
      completedTests: [],
      courseSessions: [],
    }
  }
}

/** @deprecated Prefer fetchLearnerProgress */
export async function fetchCourseProgress(chapterId?: string): Promise<CourseProgressEntry[]> {
  const data = await fetchLearnerProgress(chapterId)
  return data.completedCourses
}

export async function startCourseSession(
  chapterId: string,
  courseId: string,
): Promise<CourseSessionStart> {
  return request<CourseSessionStart>('/content/revision/progress/start', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export async function markCourseCompleted(chapterId: string, courseId: string): Promise<void> {
  await request<{ completed: boolean }>('/content/revision/progress', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export async function markChapterTestCompleted(
  chapterId: string,
  correct: number,
  total: number,
): Promise<void> {
  await request<{ completed: boolean }>('/content/revision/progress/test', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, correct, total }),
  })
}

export interface LearnerJourneyStop {
  track: 'revision' | 'conduite'
  type: 'course' | 'test' | 'done'
  chapterId: string | null
  chapterName: string | null
  courseId: string | null
  courseTitle: string | null
  label: string
}

export interface LearnerJourney {
  code: {
    currentStop: LearnerJourneyStop | null
    chaptersDone: number
    chaptersTotal: number
  }
  conduite: {
    currentStop: LearnerJourneyStop | null
    chaptersDone: number
    chaptersTotal: number
  }
  testScores: {
    chapterId: string
    chapterName: string
    correct: number
    total: number
    scoreLabel: string
    completedAt?: string | null
  }[]
  practiceExams: {
    examTotal: number
    passScore: number
    completedCount: number
    passedCount: number
    scores: PracticeExamScore[]
  }
}

export interface PracticeExamScore {
  id: string
  examNumber: number
  correct: number
  total: number
  scoreLabel: string
  passed: boolean
  passScore: number
  completedAt?: string | null
}

export interface PracticeExamSummary {
  id: string
  examNumber: number
  questionCount: number
  status: 'available' | 'in_progress' | 'completed'
  attemptId: string | null
  score: {
    correct: number
    total: number
    scoreLabel: string
    passed: boolean
    completedAt?: string | null
  } | null
}

export interface ExamCategory {
  id: string
  label: string
  hint?: string
}

const EXAM_CATEGORY_KEY = 'monpermis.examCategory'

/** Catégorie de permis choisie pour les examens (mémorisée sur l'appareil). */
export async function getStoredExamCategory(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(EXAM_CATEGORY_KEY)
  } catch {
    return null
  }
}

export async function setStoredExamCategory(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(EXAM_CATEGORY_KEY, id)
    else await AsyncStorage.removeItem(EXAM_CATEGORY_KEY)
  } catch {
    /* stockage indisponible : le choix vaut pour cette session seulement */
  }
}

export interface PracticeExamsOverview {
  categories?: ExamCategory[]
  bankCount: number
  examCount: number
  requiredSize: number
  examTotal: number
  passScore: number
  unlocked?: boolean
  completedCount: number
  passedCount: number
  exams: PracticeExamSummary[]
  scores: PracticeExamScore[]
  message?: string
}

export interface PracticeExamAttempt {
  id: string
  examId: string
  examNumber: number
  status: 'in_progress' | 'completed'
  questionCount: number
  questions: RevisionQuestion[]
  answeredCount: number
  liveCorrect?: number
  correct: number
  total: number
  scoreLabel: string
  passed: boolean
  passScore: number
  completedAt?: string | null
  startedAt?: string | null
}

export async function fetchLearnerJourney(): Promise<LearnerJourney> {
  try {
    return await request<LearnerJourney>('/content/revision/progress/journey', { auth: true })
  } catch {
    // Hors ligne : retourner un voyage vide
    return {
      code: { currentStop: null, chaptersDone: 0, chaptersTotal: 19 },
      conduite: { currentStop: null, chaptersDone: 0, chaptersTotal: 0 },
      testScores: [],
      practiceExams: {
        examTotal: 0,
        passScore: 0.7,
        completedCount: 0,
        passedCount: 0,
        scores: [],
      },
    }
  }
}

/** « Mes résultats » : même rapport que celui de l'administration, limité à l'apprenant connecté. */
export interface ResultExamRow {
  attemptId: string
  examNumber: number
  subject: string
  author: string
  sceneName: string
  composedAt: string | null
  completedAt: string | null
  lastAt: string | null
  status: 'completed' | 'not_completed'
  statusLabel: string
  total: number
  treated: number
  correct: number
  incorrect: number
  unanswered: number
  failed: number
  note: number | null
  completed: boolean
  evaluated: boolean
  coefficient: number
  passed: boolean | null
  counted: boolean
}

export interface ResultExamSummary {
  evaluatedCount: number
  completedCount: number
  unfinishedCount: number
  totalQuestions: number
  totalCorrect: number
  totalIncorrect: number
  totalUnanswered: number
  totalFailed: number
  average: number | null
  bestNote: number | null
  lowestNote: number | null
}

export interface ResultLesson {
  chapterId: string
  chapterName: string
  chapterOrder: number
  courseId: string
  title: string
  state: 'not_started' | 'in_progress' | 'completed'
  validated: boolean
}

export interface ResultCourse {
  total: number
  followed: number
  completed: number
  inProgress: number
  notStarted: number
  validated: number
  percent: number | null
  status: 'not_started' | 'in_progress' | 'completed' | 'validated' | 'to_verify'
  statusLabel: string
  chaptersTotal: number
  chaptersValidated: number
  remaining: ResultLesson[]
}

export interface LearnerResultsReport {
  generatedAt: string
  learner: { id: string; firstName: string; lastName: string; registeredAt: string | null }
  exams: { passScore: number; questionsPerExam: number; rows: ResultExamRow[]; summary: ResultExamSummary }
  course: ResultCourse
}

export interface ResultReviewQuestion {
  index: number
  questionId: string
  found: boolean
  correctionAvailable: boolean
  hidden: boolean
  chapterOrder: number | null
  questionNumber: number | null
  prompt: { text: string; audioUrl: string; imageUrls: string[] }
  answers: { id: string; label: string; text: string; isCorrect: boolean; selected: boolean }[]
  state: 'correct' | 'wrong' | 'skipped' | 'unanswered'
  elapsedMs: number | null
}

const RESULTS_CACHE_KEY = 'results:report'

/** Rapport « Mes résultats » du serveur, fusionné avec les examens encore non envoyés. */
export async function fetchLearnerResults(): Promise<LearnerResultsReport> {
  const server = await request<LearnerResultsReport>('/content/revision/results/report', { auth: true })
  await cacheSet(RESULTS_CACHE_KEY, server).catch(() => undefined)
  return mergeServerReportWithLocal(server)
}

/**
 * « Mes résultats » en deux temps : le rapport calculé sur l'appareil s'affiche tout de suite (même hors
 * connexion), puis le rapport serveur (cours, examens d'autres appareils) le remplace quand il arrive.
 */
export async function fetchLearnerResultsSWR(
  onData: (report: LearnerResultsReport, meta: { fromServer: boolean }) => void,
): Promise<void> {
  const user = await getStoredUser().catch(() => null)
  const cached = await cacheGet<LearnerResultsReport>(RESULTS_CACHE_KEY, 30 * 24 * 60 * 60 * 1000).catch(() => null)
  if (user) {
    const local = await buildLocalResultsReport(
      { id: String(user.id), firstName: user.firstName ?? '', lastName: user.lastName ?? '' },
      cached?.data,
    )
    onData(local, { fromServer: false })
  }
  await syncPendingExams()
  const server = await fetchLearnerResults()
  onData(server, { fromServer: true })
}

export async function fetchResultAttemptReview(attemptId: string): Promise<ResultReviewQuestion[]> {
  if (isLocalAttemptId(attemptId)) return localAttemptReview(attemptId)
  const data = await request<{ attemptId: string; questions: ResultReviewQuestion[] }>(
    `/content/revision/results/attempts/${encodeURIComponent(attemptId)}`,
    { auth: true },
  )
  return data.questions
}

/** Envoie au serveur les examens passés sur l'appareil (idempotent). Silencieux si hors connexion. */
export async function syncPendingExams(): Promise<number> {
  let sent = 0
  for (const attempt of await pendingExamSyncs()) {
    try {
      await request('/content/revision/practice-exams/sync', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          clientId: attempt.id,
          examNumber: attempt.examNumber,
          category: attempt.category,
          questionIds: attempt.questionIds,
          responses: attempt.responses.map((r) => ({ questionId: r.questionId, answerIds: r.answerIds })),
          startedAt: attempt.createdAt,
          completedAt: attempt.completedAt,
        }),
      })
      await markExamSynced(attempt.id)
      sent += 1
    } catch {
      break // hors connexion ou serveur indisponible : on réessaiera plus tard
    }
  }
  return sent
}

/** Récupère les notes déjà présentes sur le serveur (autre appareil / examens précédents). */
async function pullServerExamScores() {
  try {
    const data = await request<PracticeExamsOverview>('/content/revision/practice-exams', { auth: true })
    const scores = (data.exams || [])
      .filter((exam) => exam.score)
      .map((exam) => ({
        id: exam.id,
        examNumber: exam.examNumber,
        correct: exam.score!.correct,
        total: exam.score!.total,
        scoreLabel: exam.score!.scoreLabel,
        passed: exam.score!.passed,
        passScore: data.passScore,
        completedAt: exam.score!.completedAt ?? null,
      }))
    await rememberServerScores(scores)
  } catch {
    /* hors connexion : les notes locales suffisent */
  }
}

/**
 * Liste des examens : construite sur l'appareil (instantanée, fonctionne hors connexion).
 * `onRefresh` est rappelé quand le serveur apporte des notes que l'appareil ne connaissait pas.
 */
export async function fetchPracticeExams(
  onRefresh?: (overview: PracticeExamsOverview) => void,
): Promise<PracticeExamsOverview> {
  const category = (await getStoredExamCategory()) || 'B'
  const overview = await localPracticeExamsOverview(category)
  void (async () => {
    await syncPendingExams()
    await pullServerExamScores()
    if (onRefresh) onRefresh(await localPracticeExamsOverview(category))
  })()
  return overview
}

export async function startPracticeExam(examNumber: number) {
  const category = (await getStoredExamCategory()) || 'B'
  return { attempt: await startLocalExam(examNumber, category) }
}

export async function checkPracticeExamAnswer(
  attemptId: string,
  questionId: string,
  answerIds: string[],
) {
  return checkLocalExamAnswer(attemptId, questionId, answerIds)
}

export async function completePracticeExam(attemptId: string) {
  const attempt = await completeLocalExam(attemptId)
  void syncPendingExams() // envoi au serveur en arrière-plan (sans bloquer l'écran de résultat)
  return { attempt }
}

export interface RevisionAnswer {
  id: string
  label: string
  text?: string
  audioUrl: string
}

export interface RevisionQuestion {
  id: string
  chapterId: string
  order: number
  /** Nombre de bonnes réponses (sans révéler lesquelles). */
  correctCount?: number
  prompt: {
    text?: string
    audioUrl: string
    imageUrls: string[]
  }
  answers: RevisionAnswer[]
}

export async function fetchChapterQuestions(chapterId: string): Promise<RevisionQuestion[]> {
  // Les questions sont dans le code de l'application : lecture instantanée, sans réseau.
  const order = getChapterOrderById(chapterId)
  const localBank = order ? getLocalBankByChapterOrder(order) : null
  if (localBank?.length) {
    return localBank.map((q) => toPublicLocalQuestion(q, chapterId))
  }
  // Chapitre sans banque embarquée : on interroge le serveur (puis le cache hors connexion).
  try {
    const data = await request<{ questions: RevisionQuestion[] }>(
      `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions`,
      { auth: true },
    )
    const questions = data.questions || []
    await cacheSet(`revision:questions:${chapterId}`, questions)
    return questions
  } catch {
    const cached = await cacheGet<RevisionQuestion[]>(`revision:questions:${chapterId}`, OFFLINE_TTL_MS)
    return cached?.data ?? []
  }
}

export type RevisionTestSubjectSummary = {
  number: number
  id: string
  label: string
  questionCount: number
}

export async function fetchChapterTestSubjects(chapterId: string) {
  const order = getChapterOrderById(chapterId)
  if (order && getLocalBankByChapterOrder(order)?.length) {
    return buildLocalSubjectSummaries(order, chapterId)
  }
  try {
    return await request<{
      publishedCount: number
      questionsPerSubject: number
      subjects: RevisionTestSubjectSummary[]
    }>(`/content/revision/chapters/${encodeURIComponent(chapterId)}/test-subjects`, { auth: true })
  } catch {
    throw new ContentError('Impossible de charger les sujets test')
  }
}

export async function fetchChapterTestSubject(
  chapterId: string,
  subjectNumber = 1,
): Promise<{ number: number; label: string; questions: RevisionQuestion[] }> {
  const order = getChapterOrderById(chapterId)
  if (order && getLocalBankByChapterOrder(order)?.length) {
    const subject = buildLocalSubject(order, chapterId, subjectNumber)
    if (subject) return subject
  }
  try {
    const data = await request<{
      subject: { number: number; label: string; questions: RevisionQuestion[] }
    }>(
      `/content/revision/chapters/${encodeURIComponent(chapterId)}/test-subjects/${encodeURIComponent(String(subjectNumber))}`,
      { auth: true },
    )
    return data.subject
  } catch (err) {
    if (err instanceof ContentError) throw err
    throw new ContentError('Sujet test introuvable')
  }
}

export async function checkQuestionAnswers(
  chapterId: string,
  questionId: string,
  answerIds: string[],
): Promise<{ isCorrect: boolean; correctAnswerIds: string[] }> {
  // Correction instantanée : les bonnes réponses sont dans le code de l'application.
  const local = checkLocalAnswers(questionId, answerIds)
  if (local) return local
  try {
    return await request<{ isCorrect: boolean; correctAnswerIds: string[] }>(
      `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions/check`,
      {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ questionId, answerIds }),
      },
    )
  } catch {
    throw new ContentError('Vérification impossible')
  }
}
