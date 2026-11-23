/**
 * Banque questions en dur — Chapitre 12 (alcool, distances, fatigue, comportement).
 * Audio : /content/code-audio/chapitre-12/{n}.mp3
 * 69 questions — 2026-08-19.
 *
 * Justes renseignées pour les questions de connaissance.
 * Les questions de situation (image) restent à compléter.
 */

export const CHAPITRE_12_KEY = 'chapitre-12'
export const CHAPITRE_12_ORDER = 12

/** Détecte un chapitre Mongo correspondant au chapitre 12 figé. */
export function matchesChapitre12(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_12_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*12\b/i.test(name) || /^12([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-12/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-12/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([4, 5, 6, 7, 9, 11, 13, 16, 17, 23, 32, 58])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch12-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch12-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_12_KEY,
    chapterOrder: CHAPITRE_12_ORDER,
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

/** 69 questions — alcool, distances, fatigue, comportement. */
export const CHAPITRE_12_QUESTIONS = []
