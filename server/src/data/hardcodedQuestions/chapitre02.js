/**
 * Banque questions en dur — Chapitre 2 (priorités / intersections / dépassement).
 * Audio : /content/code-audio/chapitre-2/{n}.mp3
 * Images : /content/code-images/chapitre-2/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_02_KEY = 'chapitre-2'
export const CHAPITRE_02_ORDER = 2

/** Détecte un chapitre Mongo correspondant au chapitre 2 figé. */
export function matchesChapitre02(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_02_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*2\b/i.test(name) || /^2([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-2/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-2/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([
  13, 18, 19, 20, 21, 22, 23, 24, 26, 27,
  28, 29, 30, 32, 33, 34, 36, 37, 38, 39,
  40, 41, 42, 43, 69, 70, 71, 72, 73,
  80, 81, 82, 83, 84, 85, 86, 87,
])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch2-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch2-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_02_KEY,
    chapterOrder: CHAPITRE_02_ORDER,
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

/**
 * 55 questions — priorités, intersections, dépassement.
 * Audios : à générer.
 */
export const CHAPITRE_02_QUESTIONS = []
