/**
 * Banque questions en dur — Chapitre 15.
 * Audio : /content/code-audio/chapitre-15/{n}.mp3
 */

export const CHAPITRE_15_KEY = 'chapitre-15'
export const CHAPITRE_15_ORDER = 15

/** Détecte un chapitre Mongo correspondant au chapitre 15 figé. */
export function matchesChapitre15(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_15_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*15\b/i.test(name) || /^15([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-15/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-15/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1, 2, 3, 8])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch15-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch15-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_15_KEY,
    chapterOrder: CHAPITRE_15_ORDER,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: QUESTIONS_WITH_IMAGES.has(order) ? [imageUrl(order)] : [],
    },
    answers: answers(order, letterOptions, correctLetters),
  }
}

/** 23 questions — énoncé audio uniquement ; réponses A/B/C/D. */
export const CHAPITRE_15_QUESTIONS = []
