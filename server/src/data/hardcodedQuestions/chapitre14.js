/**
 * Banque questions en dur — Chapitre 14 (véhicules lents, dimensions, comportement).
 * Audio : /content/code-audio/chapitre-14/{n}.mp3
 * 27 questions — 2026-08-19.
 *
 * Justes renseignées pour les questions de connaissance.
 * Les questions de situation (image) restent à compléter.
 */

export const CHAPITRE_14_KEY = 'chapitre-14'
export const CHAPITRE_14_ORDER = 14

/** Détecte un chapitre Mongo correspondant au chapitre 14 figé. */
export function matchesChapitre14(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_14_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*14\b/i.test(name) || /^14([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-14/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-14/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1, 3, 5, 8])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch14-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch14-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_14_KEY,
    chapterOrder: CHAPITRE_14_ORDER,
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

/** 27 questions — véhicules lents, dimensions, comportement. */
export const CHAPITRE_14_QUESTIONS = []
