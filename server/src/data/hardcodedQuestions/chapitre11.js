/**
 * Banque questions en dur — Chapitre 11 (situations, marquage, priorités).
 * Audio : /content/code-audio/chapitre-11/{n}.mp3
 * Images : /content/code-images/chapitre-11/{n}.png
 * 82 questions — 2026-08-19.
 *
 * Justes renseignées seulement quand la règle est générale (sans image).
 * Les questions de situation restent à compléter.
 */

export const CHAPITRE_11_KEY = 'chapitre-11'
export const CHAPITRE_11_ORDER = 11

/** Détecte un chapitre Mongo correspondant au chapitre 11 figé. */
export function matchesChapitre11(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_11_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*11\b/i.test(name) || /^11([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-11/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-11/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 40, 41, 43, 44, 45, 46, 47, 48, 51, 53, 55, 56, 57, 60, 64, 66, 70, 71, 72, 73, 75, 76, 79, 80, 81, 82,
])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch11-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch11-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_11_KEY,
    chapterOrder: CHAPITRE_11_ORDER,
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

/** 82 questions — situations de conduite. */
export const CHAPITRE_11_QUESTIONS = []
