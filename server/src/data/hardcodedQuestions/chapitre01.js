/**
 * Banque questions en dur — Chapitre 1 (signalisation) — parties 1+2.
 * Audio : /content/code-audio/chapitre-1/{n}.mp3
 * Images : /content/code-images/chapitre-1/{n}.png
 * Mis à jour — 2026-07-31.
 */

export const CHAPITRE_01_KEY = 'chapitre-1'
export const CHAPITRE_01_ORDER = 1

/** Détecte un chapitre Mongo correspondant au chapitre 1 figé. */
export function matchesChapitre01(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_01_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*1\b/i.test(name) || /^1([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-1/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-1/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([3, 4, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 25, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 96, 97, 98, 99, 100, 101, 102, 104, 106])

function answers(questionIndex, letters, correctLetters) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch1-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters) {
  return {
    id: `hc-ch1-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_01_KEY,
    chapterOrder: CHAPITRE_01_ORDER,
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
 * 106 questions — parties 1+2 (doublons OCR retirés).
 * Images panneaux sur les questions concernées.
 */
export const CHAPITRE_01_QUESTIONS = []
