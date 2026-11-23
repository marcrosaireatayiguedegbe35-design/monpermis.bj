/**
 * Banque questions en dur — Chapitre 9 (transport en commun).
 * Audio : /content/code-audio/chapitre-9/{n}.mp3
 * Images : /content/code-images/chapitre-9/{n}.png
 * Textes corrigés / dédoublonnés — 2026-07-30.
 */

export const CHAPITRE_09_KEY = 'chapitre-9'
export const CHAPITRE_09_ORDER = 9

/** Détecte un chapitre Mongo correspondant au chapitre 9 figé. */
export function matchesChapitre09(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_09_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*9\b/i.test(name) || /^9([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-9/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-9/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([1, 25, 26, 27, 28, 29])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch9-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch9-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_09_KEY,
    chapterOrder: CHAPITRE_09_ORDER,
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
 * 48 questions.
 * Images : 1 tourner, 25 B34a, 26 B45 (fin voie bus), 27 B27, 28 chargement, 29 B10a.
 */
export const CHAPITRE_09_QUESTIONS = []
