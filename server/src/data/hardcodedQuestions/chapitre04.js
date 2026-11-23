/**
 * Banque questions en dur — Chapitre 4 (conduite, virages, stationnement).
 * Audio : /content/code-audio/chapitre-4/{n}.mp3
 * Images : /content/code-images/chapitre-4/{n}.png
 * Mis à jour — 2026-08-20 (réponses + image Q9).
 */

export const CHAPITRE_04_KEY = 'chapitre-4'
export const CHAPITRE_04_ORDER = 4

/** Détecte un chapitre Mongo correspondant au chapitre 4 figé. */
export function matchesChapitre04(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_04_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*4\b/i.test(name) || /^4([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-4/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-4/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([9])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch4-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch4-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_04_KEY,
    chapterOrder: CHAPITRE_04_ORDER,
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
 * 30 questions — conduite, virages, stationnement.
 */
export const CHAPITRE_04_QUESTIONS = []
