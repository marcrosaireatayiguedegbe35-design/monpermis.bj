/**
 * Banque questions en dur — Chapitre 18.
 * Audio : /content/code-audio/chapitre-18/{n}.mp3
 */

export const CHAPITRE_18_KEY = 'chapitre-18'
export const CHAPITRE_18_ORDER = 18

/** Détecte un chapitre Mongo correspondant au chapitre 18 figé. */
export function matchesChapitre18(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_18_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*18\b/i.test(name) || /^18([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-18/${n}.mp3`
}

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch18-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch18-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_18_KEY,
    chapterOrder: CHAPITRE_18_ORDER,
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

/** 26 questions — énoncé audio uniquement ; réponses A/B/C/D. */
export const CHAPITRE_18_QUESTIONS = []
