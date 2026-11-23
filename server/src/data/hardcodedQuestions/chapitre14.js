/**
 * Banque questions en dur — Chapitre 14.
 * Audio : /content/code-audio/chapitre-14/{n}.mp3
 * Images : /content/code-images/chapitre-14/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_14_KEY = 'chapitre-14'
export const CHAPITRE_14_ORDER = 14

/** Détecte un chapitre Mongo correspondant au chapitre 14 figé. */
export function matchesChapitre14(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_14_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*14\b/i.test(name) || /^14([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-14/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-14/${n}.png`
}

/** Aucune image dans ce chapitre. */
const QUESTIONS_WITH_IMAGES = new Set([])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch14-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch14-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_14_KEY,
    chapterOrder: CHAPITRE_14_ORDER,
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
 * 12 questions — chapitre 14 (la Direction Générale des Transports Terrestres, DGTT).
 * QCM rédigé d'après le cours du manuel (pages 251 à 253). Voix Jérôme, eleven_v3.
 * Audios servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_14_QUESTIONS = [
  question(1, ["A", "B", "C"], ["C"], "La DGTT est :", ["Une auto-école agréée.", "Une direction du Ministère de l’Intérieur.", "Une Direction Technique du Ministère des Travaux Publics et des Transports (MTPT)."]),
  question(2, ["A", "B", "C"], ["A"], "La DGTT est régie par :", ["Le Décret N°2012-376 du 06 novembre 2012.", "Le Code de la route uniquement.", "La loi du 07 août 2013."]),
  question(3, ["A", "B", "C", "D"], ["A", "B"], "La DGTT est chargée de :", ["La réglementation, la délivrance et le contrôle des titres et autorisations de transports.", "L’organisation, la réglementation et le contrôle des transports routier et ferroviaire.", "La collecte des amendes.", "La construction des routes."]),
  question(4, ["A", "B", "C"], ["A"], "L’agrément des auto-écoles (Établissements d’Enseignement de la Conduite Automobile) est délivré par :", ["La DGTT.", "Les communes.", "Les compagnies d’assurance."]),
  question(5, ["A", "B", "C", "D"], ["A", "B", "C"], "Parmi ces missions, lesquelles reviennent à la DGTT ?", ["L’élaboration des tarifs de transports routiers, avec les organismes nationaux compétents.", "La représentation du Bénin dans les instances internationales de transports routier et ferroviaire.", "La collecte et le traitement des données de fret routier et ferroviaire.", "La vente des véhicules neufs."]),
  question(6, ["A", "B", "C"], ["B"], "La DEPONAMU est :", ["Un organigramme de la DGTT.", "La Déclaration de la Politique Nationale de Mobilité Urbaine.", "Une direction départementale."]),
  question(7, ["A", "B", "C", "D"], ["A", "B", "C"], "La DGTT assure le suivi de la formation et du recyclage :", ["Des Transports et Transit Routiers Inter-États.", "Des examinateurs.", "Des moniteurs d’auto-écoles.", "Des pilotes d’avion."]),
  question(8, ["A", "B", "C"], ["A"], "La DGTT apporte son appui :", ["Aux Directions Départementales, pour la mise en œuvre de leurs compétences en matière de transports terrestres.", "À aucune structure locale.", "Aux seules entreprises privées."]),
  question(9, ["A", "B", "C"], ["B"], "L’objectif global de la DGTT est de :", ["Supprimer le transport ferroviaire.", "Promouvoir des services de transport routier efficaces sur des routes sécurisées, pour soutenir le développement économique et le bien-être social.", "Réduire le nombre de permis délivrés."]),
  question(10, ["A", "B", "C"], ["B", "C"], "Parmi les objectifs spécifiques de la DGTT, on trouve :", ["Augmenter le prix du carburant.", "Identifier toute la demande des services de transport existants.", "Améliorer la qualité de l’offre de transport."]),
  question(11, ["A", "B", "C", "D"], ["B", "C", "D"], "La DGTT comprend :", ["Une Direction des Douanes.", "Une Direction des Études, de la Réglementation et du Contrôle (DERC).", "Un Secrétariat.", "Une Direction des Titres de Transports (DTIT)."]),
  question(12, ["A", "B", "C"], ["C"], "Dans l’organigramme, le DGATT désigne :", ["Le Directeur des Études, de la Réglementation et du Contrôle.", "Le Directeur des Titres de Transport.", "Le Directeur Général Adjoint des Transports Terrestres."]),
]
