/**
 * Banque questions en dur — Chapitre 8 (poids lourds / permis C-C1).
 * Audio : /content/code-audio/chapitre-8/{n}.mp3
 * Images : /content/code-images/chapitre-8/{n}.png
 * Textes corrigés / dédoublonnés — 2026-07-30.
 */

export const CHAPITRE_08_KEY = 'chapitre-8'
export const CHAPITRE_08_ORDER = 8

/** Détecte un chapitre Mongo correspondant au chapitre 8 figé. */
export function matchesChapitre08(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_08_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*8\b/i.test(name) || /^8([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-8/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-8/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([22, 23, 31, 32, 33, 34])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch8-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch8-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_08_KEY,
    chapterOrder: CHAPITRE_08_ORDER,
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
 * 41 questions — doublons / fragments OCR retirés.
 */
export const CHAPITRE_08_QUESTIONS = []
