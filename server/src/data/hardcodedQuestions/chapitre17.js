/**
 * Banque questions en dur — Chapitre 17.
 * Audio : /content/code-audio/chapitre-17/{n}.mp3
 */

export const CHAPITRE_17_KEY = 'chapitre-17'
export const CHAPITRE_17_ORDER = 17

/** Détecte un chapitre Mongo correspondant au chapitre 17 figé. */
export function matchesChapitre17(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_17_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*17\b/i.test(name) || /^17([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-17/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-17/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch17-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch17-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_17_KEY,
    chapterOrder: CHAPITRE_17_ORDER,
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

/** 26 questions — énoncé audio uniquement ; réponses A/B/C/D. */
export const CHAPITRE_17_QUESTIONS = []
