import AsyncStorage from '@react-native-async-storage/async-storage'
import { getStoredUser } from '../api/session'
import {
  CHAPTER_CATEGORY_RULES,
  EXAM_CATEGORIES,
  findLocalQuestionById,
  getLocalBankByChapterOrder,
  toPublicLocalQuestion,
  type LocalQuestion,
} from '../data/codeRoute/banks'
import {
  enrichAnswersFromTranscript,
  getQuestionTranscript,
  resolveQuestionTranscript,
  splitTranscriptParts,
} from '../data/codeRoute/questionTranscripts'
import type {
  LearnerResultsReport,
  PracticeExamAttempt,
  PracticeExamScore,
  PracticeExamsOverview,
  ResultExamRow,
  ResultExamSummary,
  ResultReviewQuestion,
  RevisionQuestion,
} from '../api/revision'

/**
 * Examens blancs « maison » : tout se passe sur l'appareil (questions, correction, notes), donc instantané
 * et utilisable sans connexion. Les examens terminés sont ensuite envoyés au serveur (voir `syncPendingExams`).
 * Les règles (20 questions, 80 sujets, moyenne 14/20, chapitres réservés par catégorie) sont celles du serveur.
 */
export const LOCAL_EXAM_COUNT = 80
export const LOCAL_EXAM_SIZE = 20
export const LOCAL_EXAM_PASS_SCORE = 14
const MAX_STORED_ATTEMPTS = 200
const CHAPTER_COUNT = 19
const IDLE_MS = 20 * 60 * 1000

export type LocalExamResponse = { questionId: string; answerIds: string[]; isCorrect: boolean }

export type LocalExamAttempt = {
  id: string
  examNumber: number
  category: string
  questionIds: string[]
  responses: LocalExamResponse[]
  status: 'in_progress' | 'completed'
  correct: number
  total: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  /** true une fois reçu par le serveur. */
  synced: boolean
}

type Store = {
  attempts: LocalExamAttempt[]
  /** Meilleures notes connues côté serveur (examens passés ailleurs / avant). */
  serverScores: Record<string, { correct: number; total: number; completedAt?: string | null }>
}

const storeKey = (userId: string) => `@mp/exams/v1:${userId}`
const memory = new Map<string, Store>()

async function currentUserId(): Promise<string> {
  const user = await getStoredUser().catch(() => null)
  return String(user?.id || 'anonymous')
}

async function loadStore(userId: string): Promise<Store> {
  const cached = memory.get(userId)
  if (cached) return cached
  let store: Store = { attempts: [], serverScores: {} }
  try {
    const raw = await AsyncStorage.getItem(storeKey(userId))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>
      store = {
        attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
        serverScores: parsed.serverScores && typeof parsed.serverScores === 'object' ? parsed.serverScores : {},
      }
    }
  } catch {
    /* stockage illisible : on repart d'un historique vide */
  }
  memory.set(userId, store)
  return store
}

async function saveStore(userId: string, store: Store) {
  store.attempts = store.attempts
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-MAX_STORED_ATTEMPTS)
  memory.set(userId, store)
  try {
    await AsyncStorage.setItem(storeKey(userId), JSON.stringify(store))
  } catch {
    /* quota / stockage indisponible : l'examen reste en mémoire pour la session */
  }
}

// ───────────────────────── Banque et tirage ─────────────────────────

type PoolEntry = { id: string; chapterOrder: number; question: LocalQuestion; key: string }

function isChapterAllowed(order: number, category: string) {
  const allowed = CHAPTER_CATEGORY_RULES[order]
  return !allowed || allowed.includes(category)
}

export function normalizeCategory(value?: string | null) {
  const id = String(value || '').trim().toUpperCase()
  return EXAM_CATEGORIES.some((c) => c.id === id) ? id : 'B'
}

/** Clé de contenu : deux questions au même énoncé (chapitres 17/18) ne sont pas tirées ensemble. */
function contentKey(chapterOrder: number, order: number) {
  return getQuestionTranscript(chapterOrder, order)
    .toLowerCase()
    .replace(/[^a-z0-9àâçéèêëîïôûùüÿœ]+/g, ' ')
    .trim()
}

let poolCache: PoolEntry[] | null = null

function allEntries(): PoolEntry[] {
  if (poolCache) return poolCache
  const entries: PoolEntry[] = []
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter += 1) {
    for (const question of getLocalBankByChapterOrder(chapter) || []) {
      entries.push({ id: question.id, chapterOrder: chapter, question, key: contentKey(chapter, question.order) })
    }
  }
  poolCache = entries
  return entries
}

export function localExamPool(category: string): PoolEntry[] {
  return allEntries().filter((entry) => isChapterAllowed(entry.chapterOrder, category))
}

function shuffle<T>(items: T[]): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

/** Tirage équilibré par chapitre (chacun au moins 1 question), sans doublon d'énoncé. */
function pickBalanced(pool: PoolEntry[], count: number): PoolEntry[] {
  const target = Math.min(count, pool.length)
  const byChapter = new Map<number, PoolEntry[]>()
  for (const entry of pool) {
    const list = byChapter.get(entry.chapterOrder) ?? []
    list.push(entry)
    byChapter.set(entry.chapterOrder, list)
  }
  const groups = shuffle([...byChapter.entries()]).map(([, list]) => shuffle(list))
  const selected: PoolEntry[] = []
  const usedIds = new Set<string>()
  const usedKeys = new Set<string>()
  const tryPush = (entry: PoolEntry) => {
    if (usedIds.has(entry.id) || (entry.key && usedKeys.has(entry.key))) return false
    selected.push(entry)
    usedIds.add(entry.id)
    if (entry.key) usedKeys.add(entry.key)
    return true
  }
  // 1) une question par chapitre ; 2) on complète au prorata de la taille de chaque chapitre.
  for (const list of groups) {
    for (const entry of list) {
      if (tryPush(entry)) break
    }
  }
  const rest = shuffle(groups.flat().filter((entry) => !usedIds.has(entry.id)))
  for (const entry of rest) {
    if (selected.length >= target) break
    tryPush(entry)
  }
  return shuffle(selected).slice(0, target)
}

// ───────────────────────── Formes publiques (comme l'API) ─────────────────────────

function toPublicQuestion(question: LocalQuestion): RevisionQuestion {
  const chapterId = `local-ch-${question.chapterOrder}`
  return toPublicLocalQuestion(question, chapterId) as unknown as RevisionQuestion
}

const scoreLabel = (correct: number, total: number) => `${correct}/${total}`

function toScore(attempt: LocalExamAttempt): PracticeExamScore {
  return {
    id: attempt.id,
    examNumber: attempt.examNumber,
    correct: attempt.correct,
    total: attempt.total,
    scoreLabel: scoreLabel(attempt.correct, attempt.total),
    passed: attempt.correct >= LOCAL_EXAM_PASS_SCORE,
    passScore: LOCAL_EXAM_PASS_SCORE,
    completedAt: attempt.completedAt,
  }
}

function toPublicAttempt(attempt: LocalExamAttempt): PracticeExamAttempt {
  const questions =
    attempt.status === 'in_progress'
      ? attempt.questionIds
          .map((id) => findLocalQuestionById(id))
          .filter((q): q is LocalQuestion => Boolean(q))
          .map(toPublicQuestion)
      : []
  return {
    id: attempt.id,
    examId: `local-exam-${attempt.examNumber}`,
    examNumber: attempt.examNumber,
    status: attempt.status,
    questionCount: attempt.questionIds.length,
    questions,
    answeredCount: attempt.responses.length,
    liveCorrect: attempt.responses.filter((r) => r.isCorrect).length,
    correct: attempt.correct,
    total: attempt.total,
    scoreLabel: scoreLabel(attempt.correct, attempt.total),
    passed: attempt.correct >= LOCAL_EXAM_PASS_SCORE,
    passScore: LOCAL_EXAM_PASS_SCORE,
    completedAt: attempt.completedAt,
    startedAt: attempt.createdAt,
  }
}

// ───────────────────────── Examens ─────────────────────────

/** Liste des 80 sujets avec la meilleure note de l'apprenant (calculée sur l'appareil, instantanée). */
export async function localPracticeExamsOverview(category: string): Promise<PracticeExamsOverview> {
  const userId = await currentUserId()
  const store = await loadStore(userId)
  const cat = normalizeCategory(category)

  const best = new Map<number, { correct: number; total: number; completedAt?: string | null }>()
  const consider = (examNumber: number, score: { correct: number; total: number; completedAt?: string | null }) => {
    const current = best.get(examNumber)
    if (!current || score.correct > current.correct) best.set(examNumber, score)
  }
  for (const attempt of store.attempts) {
    if (attempt.status === 'completed') consider(attempt.examNumber, attempt)
  }
  for (const [key, score] of Object.entries(store.serverScores)) consider(Number(key), score)

  const exams = Array.from({ length: LOCAL_EXAM_COUNT }, (_, index) => {
    const examNumber = index + 1
    const score = best.get(examNumber)
    return {
      id: `local-exam-${examNumber}`,
      examNumber,
      questionCount: LOCAL_EXAM_SIZE,
      status: score ? ('completed' as const) : ('available' as const),
      attemptId: null,
      score: score
        ? {
            correct: score.correct,
            total: score.total || LOCAL_EXAM_SIZE,
            scoreLabel: scoreLabel(score.correct, score.total || LOCAL_EXAM_SIZE),
            passed: score.correct >= LOCAL_EXAM_PASS_SCORE,
            completedAt: score.completedAt ?? null,
          }
        : null,
    }
  })

  return {
    categories: EXAM_CATEGORIES,
    bankCount: localExamPool(cat).length,
    examCount: exams.length,
    requiredSize: LOCAL_EXAM_SIZE,
    examTotal: LOCAL_EXAM_COUNT,
    passScore: LOCAL_EXAM_PASS_SCORE,
    unlocked: true,
    completedCount: best.size,
    passedCount: [...best.values()].filter((s) => s.correct >= LOCAL_EXAM_PASS_SCORE).length,
    exams,
    scores: [],
  }
}

/** Compose un NOUVEL examen de 20 questions (jamais vues si possible) et l'enregistre. */
export async function startLocalExam(examNumber: number, category: string): Promise<PracticeExamAttempt> {
  const userId = await currentUserId()
  const store = await loadStore(userId)
  const cat = normalizeCategory(category)

  const pool = localExamPool(cat)
  const seen = new Set(store.attempts.flatMap((a) => a.questionIds))
  const fresh = pool.filter((entry) => !seen.has(entry.id))
  const picked = pickBalanced(fresh.length >= LOCAL_EXAM_SIZE ? fresh : pool, LOCAL_EXAM_SIZE)
  if (picked.length === 0) throw new Error('Aucune question disponible pour composer un examen')

  const now = new Date().toISOString()
  const attempt: LocalExamAttempt = {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    examNumber,
    category: cat,
    questionIds: picked.map((entry) => entry.id),
    responses: [],
    status: 'in_progress',
    correct: 0,
    total: LOCAL_EXAM_SIZE,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
  }
  store.attempts.push(attempt)
  await saveStore(userId, store)
  return toPublicAttempt(attempt)
}

function evaluate(question: LocalQuestion, answerIds: string[]) {
  const correctIds = question.answers.filter((a) => a.isCorrect).map((a) => a.id)
  const selected = new Set(answerIds.map(String))
  const isCorrect = correctIds.length === selected.size && correctIds.every((id) => selected.has(id))
  return { isCorrect, correctAnswerIds: correctIds }
}

export async function checkLocalExamAnswer(attemptId: string, questionId: string, answerIds: string[]) {
  const userId = await currentUserId()
  const store = await loadStore(userId)
  const attempt = store.attempts.find((a) => a.id === attemptId)
  if (!attempt || attempt.status !== 'in_progress') throw new Error('Tentative introuvable ou terminée')
  if (!attempt.questionIds.includes(questionId)) throw new Error('Question hors examen')
  const question = findLocalQuestionById(questionId)
  if (!question) throw new Error('Question introuvable')

  const result = evaluate(question, answerIds)
  if (!attempt.responses.some((r) => r.questionId === questionId)) {
    attempt.responses.push({ questionId, answerIds: answerIds.map(String), isCorrect: result.isCorrect })
    attempt.updatedAt = new Date().toISOString()
    await saveStore(userId, store)
  }
  return {
    isCorrect: result.isCorrect,
    correctAnswerIds: result.correctAnswerIds,
    answeredCount: attempt.responses.length,
    total: attempt.total,
    liveCorrect: attempt.responses.filter((r) => r.isCorrect).length,
  }
}

export async function completeLocalExam(attemptId: string): Promise<PracticeExamScore> {
  const userId = await currentUserId()
  const store = await loadStore(userId)
  const attempt = store.attempts.find((a) => a.id === attemptId)
  if (!attempt) throw new Error('Tentative introuvable')
  if (attempt.status !== 'completed') {
    attempt.correct = attempt.responses.filter((r) => r.isCorrect).length
    attempt.status = 'completed'
    attempt.completedAt = new Date().toISOString()
    attempt.updatedAt = attempt.completedAt
    attempt.synced = false
    await saveStore(userId, store)
  }
  return toScore(attempt)
}

export function isLocalAttemptId(id: string) {
  return String(id).startsWith('local-')
}

// ───────────────────────── Synchronisation serveur ─────────────────────────

/** Examens terminés mais pas encore envoyés au serveur. */
export async function pendingExamSyncs(): Promise<LocalExamAttempt[]> {
  const store = await loadStore(await currentUserId())
  return store.attempts.filter((a) => a.status === 'completed' && !a.synced)
}

export async function markExamSynced(attemptId: string) {
  const userId = await currentUserId()
  const store = await loadStore(userId)
  const attempt = store.attempts.find((a) => a.id === attemptId)
  if (attempt && !attempt.synced) {
    attempt.synced = true
    await saveStore(userId, store)
  }
}

/** Mémorise les notes déjà présentes sur le serveur (examens passés avant ou sur un autre appareil). */
export async function rememberServerScores(scores: PracticeExamScore[]) {
  if (!scores.length) return
  const userId = await currentUserId()
  const store = await loadStore(userId)
  for (const score of scores) {
    const key = String(score.examNumber)
    const known = store.serverScores[key]
    if (!known || score.correct > known.correct) {
      store.serverScores[key] = { correct: score.correct, total: score.total, completedAt: score.completedAt ?? null }
    }
  }
  await saveStore(userId, store)
}

// ───────────────────────── Résultats (même calculs que le serveur) ─────────────────────────

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

function rowFromAttempt(attempt: LocalExamAttempt, now = Date.now()): ResultExamRow & { outcome: string } {
  const completed = attempt.status === 'completed'
  const total = attempt.questionIds.length || attempt.total || LOCAL_EXAM_SIZE
  const seen = new Set<string>()
  const treatedList = attempt.responses.filter((r) => {
    if (seen.has(r.questionId)) return false
    seen.add(r.questionId)
    return r.answerIds.length > 0
  })
  const treated = treatedList.length
  const correct = treatedList.filter((r) => r.isCorrect).length
  const incorrect = treated - correct
  const unanswered = Math.max(0, total - treated)
  const idle = now - new Date(attempt.updatedAt || attempt.createdAt).getTime() > IDLE_MS
  return {
    attemptId: attempt.id,
    examNumber: attempt.examNumber,
    subject: `Examen blanc n° ${attempt.examNumber}`,
    author: '',
    sceneName: '',
    composedAt: attempt.createdAt,
    completedAt: attempt.completedAt,
    lastAt: attempt.updatedAt || attempt.createdAt,
    status: completed ? 'completed' : 'not_completed',
    statusLabel: completed ? 'Terminé' : 'Non terminé',
    total,
    treated,
    correct,
    incorrect,
    unanswered,
    failed: incorrect + unanswered,
    note: total > 0 ? round2((correct / total) * 20) : null,
    completed,
    evaluated: completed || treated > 0,
    coefficient: 1,
    passed: completed ? correct >= LOCAL_EXAM_PASS_SCORE : null,
    counted: false,
    outcome: completed ? 'completed' : idle ? 'stopped' : 'in_progress',
  }
}

/** Parmi plusieurs tentatives d'un même examen, seule la meilleure note compte (égalité → la plus récente). */
function markCounted(rows: ResultExamRow[]) {
  const best = new Map<number, ResultExamRow>()
  for (const row of rows) {
    row.counted = false
    if (!row.evaluated || row.note === null) continue
    const current = best.get(row.examNumber)
    if (!current) {
      best.set(row.examNumber, row)
      continue
    }
    const newer = new Date(row.lastAt || 0).getTime() > new Date(current.lastAt || 0).getTime()
    if ((row.note ?? 0) > (current.note ?? 0) || (row.note === current.note && newer)) best.set(row.examNumber, row)
  }
  for (const row of best.values()) row.counted = true
}

export function summarizeResultRows(rows: ResultExamRow[]): ResultExamSummary {
  markCounted(rows)
  const counted = rows.filter((row) => row.counted)
  const weighted = counted.filter((row) => row.note !== null && row.coefficient > 0)
  const weightSum = weighted.reduce((sum, row) => sum + row.coefficient, 0)
  const average =
    weighted.length > 0 && weightSum > 0
      ? round2(weighted.reduce((sum, row) => sum + (row.note as number) * row.coefficient, 0) / weightSum)
      : null
  const notes = weighted.map((row) => row.note as number)
  const sum = (key: 'total' | 'correct' | 'incorrect' | 'unanswered' | 'failed') =>
    counted.reduce((total, row) => total + row[key], 0)
  return {
    evaluatedCount: counted.length,
    completedCount: counted.filter((row) => row.completed).length,
    unfinishedCount: counted.filter((row) => !row.completed).length,
    totalQuestions: sum('total'),
    totalCorrect: sum('correct'),
    totalIncorrect: sum('incorrect'),
    totalUnanswered: sum('unanswered'),
    totalFailed: sum('failed'),
    average,
    bestNote: notes.length ? Math.max(...notes) : null,
    lowestNote: notes.length ? Math.min(...notes) : null,
  }
}

const EMPTY_COURSE: LearnerResultsReport['course'] = {
  total: 0,
  followed: 0,
  completed: 0,
  inProgress: 0,
  notStarted: 0,
  validated: 0,
  percent: null,
  status: 'not_started',
  statusLabel: 'Cours non commencé',
  chaptersTotal: 0,
  chaptersValidated: 0,
  remaining: [],
}

export async function localExamRows(): Promise<ResultExamRow[]> {
  const store = await loadStore(await currentUserId())
  const now = Date.now()
  return store.attempts
    .map((attempt) => rowFromAttempt(attempt, now))
    .sort((a, b) => new Date(a.composedAt || 0).getTime() - new Date(b.composedAt || 0).getTime())
}

/**
 * Rapport « Mes résultats » construit sur l'appareil. La partie « cours » vient du dernier rapport serveur
 * connu (ou reste vide hors connexion) ; les examens viennent toujours des tentatives locales.
 */
export async function buildLocalResultsReport(
  learner: { id: string; firstName: string; lastName: string },
  lastServerReport?: LearnerResultsReport | null,
): Promise<LearnerResultsReport> {
  const rows = await localExamRows()
  const summary = summarizeResultRows(rows)
  return {
    generatedAt: new Date().toISOString(),
    learner: { ...learner, registeredAt: lastServerReport?.learner.registeredAt ?? null },
    exams: { passScore: LOCAL_EXAM_PASS_SCORE, questionsPerExam: LOCAL_EXAM_SIZE, rows, summary },
    course: lastServerReport?.course ?? EMPTY_COURSE,
  }
}

/**
 * Fusionne le rapport serveur avec les examens encore non synchronisés (passés hors connexion) :
 * ils apparaissent tout de suite, sans doublon une fois envoyés.
 */
export async function mergeServerReportWithLocal(server: LearnerResultsReport): Promise<LearnerResultsReport> {
  const store = await loadStore(await currentUserId())
  const now = Date.now()
  const pending = store.attempts.filter((a) => !a.synced && (a.status === 'completed' || a.responses.length > 0))
  if (pending.length === 0) return server
  const rows: ResultExamRow[] = [...server.exams.rows, ...pending.map((a) => rowFromAttempt(a, now))]
  const summary = summarizeResultRows(rows)
  return { ...server, exams: { ...server.exams, rows, summary } }
}

/** Correction question par question d'un examen passé sur l'appareil. */
export async function localAttemptReview(attemptId: string): Promise<ResultReviewQuestion[]> {
  const store = await loadStore(await currentUserId())
  const attempt = store.attempts.find((a) => a.id === attemptId)
  if (!attempt) return []
  const byQuestion = new Map(attempt.responses.map((r) => [r.questionId, r]))
  return attempt.questionIds.map((id, index) => {
    const question = findLocalQuestionById(id)
    const response = byQuestion.get(id)
    const treated = Boolean(response && response.answerIds.length > 0)
    const transcript = question ? resolveQuestionTranscript(toPublicQuestion(question) as never, question.chapterOrder) : ''
    const { prompt: promptText } = splitTranscriptParts(transcript)
    const answers = question
      ? enrichAnswersFromTranscript(
          question.answers.map((a) => ({
            id: a.id,
            label: a.label,
            text: a.text,
            isCorrect: a.isCorrect,
            selected: Boolean(response?.answerIds.includes(a.id)),
          })),
          transcript,
        )
      : []
    const completed = attempt.status === 'completed'
    return {
      index: index + 1,
      questionId: id,
      found: Boolean(question),
      // Un examen en cours garde les bonnes réponses des questions non répondues masquées.
      correctionAvailable: completed || treated,
      hidden: !completed && !treated,
      chapterOrder: question?.chapterOrder ?? null,
      questionNumber: question?.order ?? null,
      prompt: {
        text: promptText || transcript,
        audioUrl: question?.prompt.audioUrl ?? '',
        imageUrls: question?.prompt.imageUrls ?? [],
      },
      answers,
      state: !treated ? (completed ? 'unanswered' : 'unanswered') : response?.isCorrect ? 'correct' : 'wrong',
      elapsedMs: null,
    }
  })
}

/** Efface les données locales d'examens (déconnexion / changement de compte). */
export async function clearLocalExams(userId?: string) {
  const id = userId || (await currentUserId())
  memory.delete(id)
  try {
    await AsyncStorage.removeItem(storeKey(id))
  } catch {
    /* ignore */
  }
}
