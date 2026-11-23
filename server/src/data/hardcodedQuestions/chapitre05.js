/**
 * Banque questions en dur — Chapitre 5 (conduite, sécurité, premiers secours).
 * Audio : /content/code-audio/chapitre-5/{n}.mp3
 * Mis à jour — 2026-08-20 (correction des bonnes réponses).
 */

export const CHAPITRE_05_KEY = 'chapitre-5'
export const CHAPITRE_05_ORDER = 5

/** Détecte un chapitre Mongo correspondant au chapitre 5 figé. */
export function matchesChapitre05(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_05_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*5\b/i.test(name) || /^5([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-5/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch5-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch5-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_05_KEY,
    chapterOrder: CHAPITRE_05_ORDER,
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

/**
 * 55 questions — conduite, sécurité, premiers secours.
 */
export const CHAPITRE_05_QUESTIONS = []
