import { CHAPITRE_06_CATEGORIES } from '../data/hardcodedQuestions/chapitre06.js'
import { CHAPITRE_07_CATEGORIES } from '../data/hardcodedQuestions/chapitre07.js'
import { CHAPITRE_08_CATEGORIES } from '../data/hardcodedQuestions/chapitre08.js'
import { CHAPITRE_09_CATEGORIES } from '../data/hardcodedQuestions/chapitre09.js'

/**
 * Catégories de permis proposées au candidat avant un examen.
 * 'B' est la catégorie par défaut. Chaque catégorie voit les chapitres communs + ceux qui lui sont réservés.
 */
export const EXAM_CATEGORIES = [
  { id: 'B', label: 'Permis B', hint: 'Véhicules légers (voiture)' },
  { id: 'A1', label: 'Permis A1', hint: 'Motocyclettes jusqu’à 75 cm³' },
  { id: 'A2', label: 'Permis A2', hint: 'Motocyclettes jusqu’à 400 cm³' },
  { id: 'A3', label: 'Permis A3', hint: 'Motocyclettes de toutes cylindrées' },
  { id: 'C', label: 'Permis C', hint: 'Poids lourds (catégorie C)' },
  { id: 'C1', label: 'Permis C1', hint: 'Poids lourds (catégorie C1)' },
  { id: 'D', label: 'Permis D', hint: 'Transport en commun de personnes' },
]

export const DEFAULT_EXAM_CATEGORY = 'B'

/**
 * Chapitres réservés à certaines catégories (clé = n° de chapitre). Un chapitre absent de cette table
 * est commun : ses questions sont proposées à tous les candidats.
 */
export const CHAPTER_CATEGORY_RULES = {
  6: CHAPITRE_06_CATEGORIES,
  7: CHAPITRE_07_CATEGORIES,
  8: CHAPITRE_08_CATEGORIES,
  9: CHAPITRE_09_CATEGORIES,
}

export function normalizeExamCategory(value) {
  const id = String(value || '').trim().toUpperCase()
  return EXAM_CATEGORIES.some((category) => category.id === id) ? id : DEFAULT_EXAM_CATEGORY
}

export function isChapterAvailableForCategory(chapterOrder, category) {
  const allowed = CHAPTER_CATEGORY_RULES[Number(chapterOrder)]
  return !allowed || allowed.includes(normalizeExamCategory(category))
}

/** Garde les questions d'une banque d'examen utilisables pour cette catégorie de permis. */
export function filterBankForCategory(bank, category) {
  return (bank || []).filter((question) => isChapterAvailableForCategory(question.chapterOrder, category))
}
