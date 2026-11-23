/**
 * Banque questions en dur — Chapitre 13 (autoroute, priorités, signalisation).
 * Audio : /content/code-audio/chapitre-13/{n}.mp3
 * 95 questions — 2026-08-19.
 *
 * Justes renseignées pour les questions de connaissance.
 * Les questions de situation (image) restent à compléter.
 */

export const CHAPITRE_13_KEY = 'chapitre-13'
export const CHAPITRE_13_ORDER = 13

/** Détecte un chapitre Mongo correspondant au chapitre 13 figé. */
export function matchesChapitre13(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_13_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*13\b/i.test(name) || /^13([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-13/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-13/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1, 3, 4, 7, 8, 9, 16, 18, 22, 23, 33])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch13-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch13-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_13_KEY,
    chapterOrder: CHAPITRE_13_ORDER,
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

/** 95 questions — autoroute, priorités, signalisation. */
export const CHAPITRE_13_QUESTIONS = []
