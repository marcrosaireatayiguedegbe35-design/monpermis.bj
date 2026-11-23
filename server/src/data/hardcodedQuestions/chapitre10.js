/**
 * Banque questions en dur — Chapitre 10 (mécanique, entretien).
 * Audio : /content/code-audio/chapitre-10/{n}.mp3
 * 67 questions — 2026-08-19.
 */

export const CHAPITRE_10_KEY = 'chapitre-10'
export const CHAPITRE_10_ORDER = 10

/** Détecte un chapitre Mongo correspondant au chapitre 10 figé. */
export function matchesChapitre10(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_10_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*10\b/i.test(name) || /^10([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-10/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch10-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch10-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_10_KEY,
    chapterOrder: CHAPITRE_10_ORDER,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: [],
    },
    answers: answers(order, letterOptions, correctLetters),
  }
}

/** 67 questions — mécanique, entretien, visibilité. */
export const CHAPITRE_10_QUESTIONS = []
