/**
 * Banque questions en dur — Chapitre 6 (deux-roues).
 * Audio : /content/code-audio/chapitre-6/{n}.mp3
 * Images : /content/code-images/chapitre-6/{n}.png
 * Mis à jour — 2026-08-20 (réponses + image B14 moto).
 */

export const CHAPITRE_06_KEY = 'chapitre-6'
export const CHAPITRE_06_ORDER = 6

/** Détecte un chapitre Mongo correspondant au chapitre 6 figé. */
export function matchesChapitre06(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_06_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*6(?!\d)/i.test(name) || /^6([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-6/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-6/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([24, 25])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch6-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch6-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_06_KEY,
    chapterOrder: CHAPITRE_06_ORDER,
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

/** 30 questions — deux-roues (Benin A1/A2/A3). */
export const CHAPITRE_06_QUESTIONS = []
