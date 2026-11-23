/**
 * Banque questions en dur — Chapitre 3.
 * Audio : /content/code-audio/chapitre-3/{n}.mp3
 * Images : /content/code-images/chapitre-3/{n}.png (n = n° question)
 * Textes corrigés + remplacements Q1/Q9/Q26 — 2026-07-30.
 */

export const CHAPITRE_03_KEY = 'chapitre-3'
export const CHAPITRE_03_ORDER = 3

/** Détecte un chapitre Mongo correspondant au chapitre 3 figé. */
export function matchesChapitre03(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_03_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*3\b/i.test(name) || /^3([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-3/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-3/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([2, 6, 8])

const QUESTIONS_DATA = []

function buildAnswers(questionIndex, answerData) {
  return answerData.map((a) => ({
    id: `hc-ch3-q${String(questionIndex).padStart(2, '0')}-${a.label.toLowerCase()}`,
    label: a.label,
    text: a.text,
    audioUrl: '',
    isCorrect: a.correct,
  }))
}

function buildQuestion(order, data) {
  return {
    id: `hc-ch3-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_03_KEY,
    chapterOrder: CHAPITRE_03_ORDER,
    order,
    published: true,
    prompt: {
      text: data.prompt,
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: QUESTIONS_WITH_IMAGES.has(order) ? [imageUrl(order)] : [],
    },
    answers: buildAnswers(order, data.answers),
  }
}

/**
 * 42 questions.
 * Q1 / Q9 / Q26 remplacées (énoncés ambigus ou image-dépendants).
 */
export const CHAPITRE_03_QUESTIONS = QUESTIONS_DATA.map((data, i) =>
  buildQuestion(i + 1, data)
)
