import { Router } from 'express'
import { PracticeExam } from '../models/PracticeExam.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import { requireUserAuth } from '../middleware/userAuth.js'
import { requireModuleAccess } from '../middleware/moduleAccess.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_PASS_SCORE,
  PRACTICE_EXAM_SIZE,
  isPracticeExamPassed,
  scoreLabel,
} from '../utils/practiceExam.js'
import {
  ensurePracticeExamSheets,
  loadPublishedExamQuestionBank,
  pickFreshExamQuestions,
} from '../services/practiceExams.js'
import {
  EXAM_CATEGORIES,
  filterBankForCategory,
  normalizeExamCategory,
} from '../utils/examCategories.js'
import { loadQuestionsByIds } from '../services/hardcodedQuestions.js'
import { buildLearnerReport, buildAttemptQuestions } from '../services/learnerReport.js'

const router = Router()
const withCodeAccess = [requireUserAuth, requireModuleAccess('code')]

async function assertPracticeExamsUnlocked(_user) {
  // Accès libre dès que le module code est actif (abonnement / promo).
}

function evaluateAnswers(question, answerIds) {
  const correctIds = new Set(
    (question.answers || [])
      .filter((answer) => answer.isCorrect)
      .map((answer) => String(answer._id || answer.id)),
  )
  const selectedIds = new Set((answerIds || []).map((id) => String(id)))
  const isCorrect =
    correctIds.size === selectedIds.size &&
    [...correctIds].every((id) => selectedIds.has(id))
  return { isCorrect, correctAnswerIds: [...correctIds] }
}

router.get('/practice-exams', ...withCodeAccess, async (req, res) => {
  try {
    const unlocked = true

    const ensured = await ensurePracticeExamSheets()
    if (ensured.error) {
      return res.json({
        success: true,
        data: {
          bankCount: ensured.bankCount || 0,
          examCount: 0,
          requiredSize: PRACTICE_EXAM_SIZE,
          examTotal: PRACTICE_EXAM_COUNT,
          passScore: PRACTICE_EXAM_PASS_SCORE,
          unlocked,
          categories: EXAM_CATEGORIES,
          completedCount: 0,
          passedCount: 0,
          exams: [],
          scores: [],
          message: ensured.error,
        },
      })
    }

    if (!unlocked) {
      return res.json({
        success: true,
        data: {
          bankCount: ensured.bankCount,
          examCount: 0,
          requiredSize: PRACTICE_EXAM_SIZE,
          examTotal: PRACTICE_EXAM_COUNT,
          passScore: PRACTICE_EXAM_PASS_SCORE,
          unlocked: false,
          completedCount: 0,
          passedCount: 0,
          exams: [],
          scores: [],
          message:
            'Terminez tous les cours de chaque chapitre pour débloquer les examens test. En attendant, répondez aux questions et passez le sujet test de chaque chapitre.',
        },
      })
    }

    const exams = await PracticeExam.find({ published: true }).sort({ examNumber: 1 })
    const attempts = await PracticeExamAttempt.find({
      userId: req.user._id,
      status: 'completed',
    }).sort({ examNumber: 1, completedAt: -1 })

    const bestByExam = new Map()
    for (const attempt of attempts) {
      const key = attempt.examNumber
      const current = bestByExam.get(key)
      if (!current || attempt.correct > current.correct) {
        bestByExam.set(key, attempt)
      }
    }

    res.json({
      success: true,
      data: {
        bankCount: ensured.bankCount,
        examCount: exams.length,
        requiredSize: PRACTICE_EXAM_SIZE,
        examTotal: PRACTICE_EXAM_COUNT,
        passScore: PRACTICE_EXAM_PASS_SCORE,
        unlocked: true,
        categories: EXAM_CATEGORIES,
        completedCount: bestByExam.size,
        passedCount: [...bestByExam.values()].filter((a) => isPracticeExamPassed(a.correct))
          .length,
        exams: exams.map((exam) => {
          const best = bestByExam.get(exam.examNumber)
          return {
            id: exam._id,
            examNumber: exam.examNumber,
            questionCount: PRACTICE_EXAM_SIZE,
            // Pas de reprise : chaque démarrage compose un nouvel examen avec de nouvelles questions.
            status: best ? 'completed' : 'available',
            attemptId: null,
            score: best
              ? {
                  correct: best.correct,
                  total: best.total || PRACTICE_EXAM_SIZE,
                  scoreLabel: scoreLabel(best.correct, best.total || PRACTICE_EXAM_SIZE),
                  passed: isPracticeExamPassed(best.correct),
                  completedAt: best.completedAt,
                }
              : null,
          }
        }),
        scores: [...bestByExam.values()]
          .sort((a, b) => a.examNumber - b.examNumber)
          .map((attempt) => attempt.toScoreJSON()),
      },
    })
  } catch (error) {
    console.error('Erreur liste examens test:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/practice-exams/:examNumber/start', ...withCodeAccess, async (req, res) => {
  try {
    const examNumber = Number(req.params.examNumber)
    if (!Number.isInteger(examNumber) || examNumber < 1 || examNumber > PRACTICE_EXAM_COUNT) {
      return res.status(400).json({ success: false, error: 'Numéro d’examen invalide' })
    }

    try {
      await assertPracticeExamsUnlocked(req.user)
    } catch (gateError) {
      return res.status(gateError.status || 403).json({
        success: false,
        error: gateError.message,
      })
    }

    const ensured = await ensurePracticeExamSheets()
    if (ensured.error) {
      return res.status(400).json({ success: false, error: ensured.error })
    }

    const exam = await PracticeExam.findOne({ examNumber, published: true })
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Examen introuvable' })
    }

    // Chaque démarrage tire de NOUVELLES questions au hasard (parmi les questions entièrement utilisables),
    // en évitant celles déjà vues par l'apprenant. Un examen quitté en cours n'est pas repris.
    const [{ questions: bank }, previous] = await Promise.all([
      loadPublishedExamQuestionBank(),
      PracticeExamAttempt.find({ userId: req.user._id }).select('questionIds').lean(),
    ])
    const seenIds = previous.flatMap((item) => item.questionIds || [])
    // Catégorie de permis choisie : les chapitres réservés (ex. deux-roues A1/A2/A3) n'apparaissent que pour elle.
    const category = normalizeExamCategory(req.body?.category)
    const picked = pickFreshExamQuestions(filterBankForCategory(bank, category), seenIds, PRACTICE_EXAM_SIZE)
    if (picked.length < PRACTICE_EXAM_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Pas assez de questions disponibles pour composer un examen (${picked.length}/${PRACTICE_EXAM_SIZE}).`,
      })
    }

    const attempt = await PracticeExamAttempt.create({
      userId: req.user._id,
      examId: exam._id,
      examNumber,
      questionIds: picked.map((question) => String(question._id)),
      category,
      responses: [],
      status: 'in_progress',
      total: PRACTICE_EXAM_SIZE,
      hcIdsV2: true,
    })

    const questions = await loadQuestionsByIds(attempt.questionIds)
    res.status(201).json({
      success: true,
      data: { attempt: attempt.toPublicJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur démarrage examen test:', error)
    res.status(500).json({ success: false, error: 'Démarrage impossible' })
  }
})

router.get('/practice-exams/attempts/:attemptId', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable' })
    }

    const questions = await loadQuestionsByIds(attempt.questionIds)
    res.json({
      success: true,
      data: { attempt: attempt.toPublicJSON(questions) },
    })
  } catch (error) {
    console.error('Erreur tentative examen:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

/**
 * Synchronise un examen passé HORS CONNEXION sur l'appareil. Le serveur ne fait pas confiance à la note
 * envoyée : il recalcule chaque réponse à partir de sa propre banque. Idempotent grâce à `clientId`.
 */
router.post('/practice-exams/sync', ...withCodeAccess, async (req, res) => {
  try {
    const body = req.body ?? {}
    const clientId = String(body.clientId || '').trim().slice(0, 80)
    const examNumber = Number(body.examNumber)
    if (!clientId) return res.status(400).json({ success: false, error: 'Identifiant requis' })
    if (!Number.isInteger(examNumber) || examNumber < 1 || examNumber > PRACTICE_EXAM_COUNT) {
      return res.status(400).json({ success: false, error: 'Numéro d’examen invalide' })
    }
    const questionIds = Array.isArray(body.questionIds)
      ? [...new Set(body.questionIds.map(String))].slice(0, PRACTICE_EXAM_SIZE)
      : []
    if (questionIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Questions requises' })
    }

    const existing = await PracticeExamAttempt.findOne({ userId: req.user._id, clientId })
    if (existing) return res.json({ success: true, data: { attempt: existing.toScoreJSON(), duplicate: true } })

    const exam = await PracticeExam.findOne({ examNumber, published: true })
    if (!exam) return res.status(404).json({ success: false, error: 'Examen introuvable' })

    const questions = await loadQuestionsByIds(questionIds)
    const byId = new Map(questions.map((q) => [String(q.id || q._id), q]))
    const allowed = new Set(questionIds)
    const responses = []
    for (const item of Array.isArray(body.responses) ? body.responses : []) {
      const questionId = String(item?.questionId || '')
      const question = byId.get(questionId)
      if (!allowed.has(questionId) || !question || !Array.isArray(item?.answerIds)) continue
      if (responses.some((r) => r.questionId === questionId)) continue
      const answerIds = item.answerIds.map(String)
      responses.push({ questionId, answerIds, isCorrect: evaluateAnswers(question, answerIds).isCorrect })
    }

    const correct = responses.filter((r) => r.isCorrect).length
    const startedAt = new Date(Number.isFinite(Date.parse(body.startedAt)) ? body.startedAt : Date.now())
    const completedAt = new Date(Number.isFinite(Date.parse(body.completedAt)) ? body.completedAt : Date.now())
    const attempt = await PracticeExamAttempt.create({
      userId: req.user._id,
      examId: exam._id,
      examNumber,
      questionIds: questionIds.filter((id) => byId.has(id)),
      category: normalizeExamCategory(body.category),
      clientId,
      responses,
      status: 'completed',
      correct,
      total: PRACTICE_EXAM_SIZE,
      passed: isPracticeExamPassed(correct),
      completedAt,
      createdAt: startedAt,
      hcIdsV2: true,
    })
    res.status(201).json({ success: true, data: { attempt: attempt.toScoreJSON() } })
  } catch (error) {
    if (error?.code === 11000) {
      const again = await PracticeExamAttempt.findOne({ userId: req.user._id, clientId: String(req.body?.clientId || '') })
      if (again) return res.json({ success: true, data: { attempt: again.toScoreJSON(), duplicate: true } })
    }
    console.error('Erreur synchronisation examen:', error)
    res.status(500).json({ success: false, error: 'Synchronisation impossible' })
  }
})

router.post('/practice-exams/attempts/:attemptId/check', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'in_progress',
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable ou terminée' })
    }

    const { questionId, answerIds } = req.body ?? {}
    if (!questionId || !Array.isArray(answerIds)) {
      return res.status(400).json({ success: false, error: 'Question et réponses requises' })
    }

    const allowed = (attempt.questionIds || []).some((id) => String(id) === String(questionId))
    if (!allowed) {
      return res.status(400).json({ success: false, error: 'Question hors examen' })
    }

    if ((attempt.responses || []).some((r) => String(r.questionId) === String(questionId))) {
      return res.status(400).json({ success: false, error: 'Question déjà répondue' })
    }

    const [question] = await loadQuestionsByIds([questionId])
    if (!question || question.published === false) {
      return res.status(404).json({ success: false, error: 'Question introuvable' })
    }

    const { isCorrect, correctAnswerIds } = evaluateAnswers(question, answerIds)
    attempt.responses.push({
      questionId,
      answerIds: answerIds.map(String),
      isCorrect,
    })
    await attempt.save()

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswerIds,
        answeredCount: attempt.responses.length,
        total: PRACTICE_EXAM_SIZE,
        liveCorrect: attempt.responses.filter((r) => r.isCorrect).length,
      },
    })
  } catch (error) {
    console.error('Erreur check examen test:', error)
    res.status(500).json({ success: false, error: 'Vérification impossible' })
  }
})

router.post('/practice-exams/attempts/:attemptId/complete', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable' })
    }

    if (attempt.status === 'completed') {
      return res.json({ success: true, data: { attempt: attempt.toScoreJSON() } })
    }

    const correct = (attempt.responses || []).filter((r) => r.isCorrect).length
    attempt.correct = correct
    attempt.total = PRACTICE_EXAM_SIZE
    attempt.passed = isPracticeExamPassed(correct)
    attempt.status = 'completed'
    attempt.completedAt = new Date()
    await attempt.save()

    res.json({
      success: true,
      data: { attempt: attempt.toScoreJSON() },
    })
  } catch (error) {
    console.error('Erreur fin examen test:', error)
    res.status(500).json({ success: false, error: 'Validation impossible' })
  }
})

/**
 * « Mes résultats » : même rapport que celui de l'admin (notes, moyenne, progression du cours),
 * limité à l'apprenant connecté. Les alertes de saisie admin (auteur/scène manquants) ne sont pas exposées.
 */
router.get('/results/report', ...withCodeAccess, async (req, res) => {
  try {
    const report = await buildLearnerReport(req.user)
    const { missingInfo: _missingInfo, ...learnerReport } = report
    res.json({ success: true, data: learnerReport })
  } catch (error) {
    console.error('Erreur rapport apprenant:', error)
    res.status(500).json({ success: false, error: 'Résultats indisponibles' })
  }
})

/**
 * Correction question par question d'un de SES examens. Pour un examen encore en cours, les bonnes réponses
 * des questions non répondues restent masquées (l'examen peut être repris).
 */
router.get('/results/attempts/:attemptId', ...withCodeAccess, async (req, res) => {
  try {
    const attempt = await PracticeExamAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
    })
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Tentative introuvable' })
    }

    const completed = attempt.status === 'completed'
    const questions = (await buildAttemptQuestions(attempt)).map((question) => {
      const reveal = completed || question.state !== 'unanswered'
      return {
        ...question,
        correctionAvailable: reveal ? question.correctionAvailable : false,
        hidden: !reveal,
        answers: question.answers.map((answer) => ({
          ...answer,
          isCorrect: reveal ? answer.isCorrect : false,
        })),
      }
    })

    res.json({ success: true, data: { attemptId: String(attempt._id), questions } })
  } catch (error) {
    console.error('Erreur correction examen apprenant:', error)
    res.status(500).json({ success: false, error: 'Correction indisponible' })
  }
})

router.get('/practice-exams/scores', ...withCodeAccess, async (req, res) => {
  try {
    const attempts = await PracticeExamAttempt.find({
      userId: req.user._id,
      status: 'completed',
    }).sort({ examNumber: 1, completedAt: -1 })

    const bestByExam = new Map()
    for (const attempt of attempts) {
      const current = bestByExam.get(attempt.examNumber)
      if (!current || attempt.correct > current.correct) {
        bestByExam.set(attempt.examNumber, attempt)
      }
    }

    const scores = [...bestByExam.values()]
      .sort((a, b) => a.examNumber - b.examNumber)
      .map((attempt) => attempt.toScoreJSON())

    res.json({
      success: true,
      data: {
        passScore: PRACTICE_EXAM_PASS_SCORE,
        examTotal: PRACTICE_EXAM_COUNT,
        completedCount: scores.length,
        passedCount: scores.filter((s) => s.passed).length,
        scores,
      },
    })
  } catch (error) {
    console.error('Erreur notes examens test:', error)
    res.status(500).json({ success: false, error: 'Notes indisponibles' })
  }
})

export default router
