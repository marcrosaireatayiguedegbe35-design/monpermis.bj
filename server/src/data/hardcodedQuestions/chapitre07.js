/**
 * Banque questions en dur — Chapitre 7.
 * Audio : /content/code-audio/chapitre-7/{n}.mp3
 * Images : /content/code-images/chapitre-7/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_07_KEY = 'chapitre-7'
export const CHAPITRE_07_ORDER = 7

/** Chapitre réservé aux candidats de ces catégories de permis (permis B). Les autres candidats ne le voient pas à l'examen. */
export const CHAPITRE_07_CATEGORIES = ['B']

/** Détecte un chapitre Mongo correspondant au chapitre 7 figé. */
export function matchesChapitre07(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_07_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*7\b/i.test(name) || /^7([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-7/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-7/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-7/. */
const QUESTIONS_WITH_IMAGES = new Set([4, 9])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch7-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch7-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_07_KEY,
    chapterOrder: CHAPITRE_07_ORDER,
    order,
    published: true,
    prompt: {
      text: promptText,
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: QUESTIONS_WITH_IMAGES.has(order) ? [imageUrl(order)] : [],
    },
    answers: answers(order, letterOptions, correctLetters, choiceTexts),
  }
}

/**
 * 10 questions — chapitre 7 (permis de catégorie B). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 678 (manuel 679 à 688).
 * Réservé à la catégorie B (voir CHAPITRE_07_CATEGORIES).
 */
export const CHAPITRE_07_QUESTIONS = [
  question(1, ["A", "B", "C"], ["B", "C"], "Pour tourner à droite je dois :", ["Accélérer.", "Mettre le clignotant.", "Ralentir."]),
  question(2, ["A", "B", "C"], ["B"], "Pour tourner à gauche sur une chaussée à double sens je dois :", ["Serrer ma droite.", "Me déporter au milieu.", "Serrer ma gauche."]),
  question(3, ["A", "B", "C", "D"], ["A", "D"], "Le PTAC de ma remorque est de 800 kg ; le poids à vide de ma voiture est 700 kg :", ["Pour tracter ma remorque je dois détenir le permis E (B).", "Je dois mettre à l’arrière de ma remorque une plaque d’immatriculation identique à celle de ma voiture.", "Pour tracter ma remorque je dois détenir le permis C.", "Ma remorque doit porter sa propre plaque d’immatriculation."]),
  question(4, ["A", "B", "C", "D", "E"], ["C", "E"], "À la vue du panneau B14 :", ["Je peux rouler à plus de 50 km/h.", "Je ne peux pas rouler à moins de 50 km/h.", "Je peux rouler à 50 km/h strictement.", "Je ne suis pas concerné par cette signalisation.", "Je peux rouler à moins de 50 km/h."]),
  question(5, ["A", "B", "C", "D"], ["A", "D"], "Avec mon permis de conduire catégorie B :", ["Je peux conduire un véhicule dont le PTAC est inférieur ou égal à 3,5 T.", "Je peux conduire tous les véhicules.", "Je ne peux conduire que les véhicules dont le PTAC est compris entre 3,5 T et 18 T.", "Je peux conduire une camionnette dont le PTAC est égal ou inférieur à 3,5 T."]),
  question(6, ["A", "B", "C"], ["C"], "Avec le permis de conduire catégorie B, je peux conduire un véhicule :", ["Poids lourd.", "Autobus.", "Poids léger."]),
  question(7, ["A", "B", "C"], ["C"], "Ma voiture mesure quatre mètres de long, comment transporter de jour une échelle de cinq mètres ?", ["Je fais dépasser l’échelle de 0,5 m à l’avant et 0,5 m à l’arrière.", "Je fais dépasser l’échelle de 1 m à l’avant.", "Je fais dépasser l’échelle de 1 m à l’arrière."]),
  question(8, ["A", "B", "C", "D"], ["C"], "Mon permis de conduire a huit mois d’âge, je ne peux rouler à plus de :", ["100 km/h.", "120 km/h.", "90 km/h.", "60 km/h."]),
  question(9, ["A", "B", "C", "D"], ["B", "C"], "À la vue du panneau B14 :", ["Je peux rouler à plus de 50 km/h.", "Je peux rouler à moins de 50 km/h.", "Je peux rouler à 50 km/h strictement.", "Je ne suis pas concerné par cette signalisation."]),
  question(10, ["A", "B", "C"], ["B"], "La remorque doit avoir sa propre carte grise si le PTAC est supérieur à :", ["450 kg.", "500 kg.", "400 kg."]),
]
