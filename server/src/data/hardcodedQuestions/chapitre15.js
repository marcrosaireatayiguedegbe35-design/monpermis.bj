/**
 * Banque questions en dur — Chapitre 15.
 * Audio : /content/code-audio/chapitre-15/{n}.mp3
 * Images : /content/code-images/chapitre-15/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_15_KEY = 'chapitre-15'
export const CHAPITRE_15_ORDER = 15

/** Détecte un chapitre Mongo correspondant au chapitre 15 figé. */
export function matchesChapitre15(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_15_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*15\b/i.test(name) || /^15([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-15/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-15/${n}.png`
}

/** Aucune image dans ce chapitre. */
const QUESTIONS_WITH_IMAGES = new Set([])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch15-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch15-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_15_KEY,
    chapterOrder: CHAPITRE_15_ORDER,
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
 * 50 questions — chapitre 15 (définitions, panneaux, balises, véhicules prioritaires, catégories de permis).
 * QCM rédigé d'après le cours du manuel (pages 17 à 20). Voix Jérôme, eleven_v3.
 * Audios servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_15_QUESTIONS = [
  question(1, ["A", "B", "C"], ["C"], "Le code de la route est :", ["Une liste d’amendes.", "Un permis de conduire.", "L’ensemble des conventions et protocoles d’accord destinés à faciliter une circulation routière sûre et rapide."]),
  question(2, ["A", "B", "C"], ["B"], "Le but du code de la route est :", ["De vendre des véhicules.", "D’indiquer ou de rappeler les diverses prescriptions aux usagers de la route.", "De former les moniteurs."]),
  question(3, ["A", "B", "C"], ["C"], "La route est :", ["Un passage réservé aux piétons.", "Une voie fermée à la circulation.", "Un passage spécialement aménagé et ouvert à la circulation publique."]),
  question(4, ["A", "B", "C"], ["A", "C"], "La route peut être :", ["Non revêtue.", "Uniquement goudronnée.", "Revêtue."]),
  question(5, ["A", "B", "C"], ["B"], "À la traversée d’une ville, la route devient :", ["Une autoroute.", "Une rue.", "Une piste."]),
  question(6, ["A", "B", "C"], ["A"], "La route pour automobile est ouverte à la circulation :", ["Des véhicules à moteur, à l’exception des cyclomoteurs.", "De tous les véhicules sans exception.", "Des piétons uniquement."]),
  question(7, ["A", "B", "C"], ["C"], "La route pour automobile est composée :", ["D’une seule chaussée.", "De trois chaussées sans séparation.", "De deux chaussées séparées par des glissières de sécurité ou par un terre-plein central."]),
  question(8, ["A", "B"], ["A"], "La route pour automobile peut comporter :", ["Des intersections.", "Aucune intersection."]),
  question(9, ["A", "B", "C"], ["A"], "L’intersection de routes est :", ["Un lieu de jonction ou de croisement de deux ou plusieurs chaussées, quels que soient les angles des axes.", "Une zone de travaux.", "Un lieu de stationnement."]),
  question(10, ["A", "B", "C"], ["A", "C"], "L’autoroute est :", ["Une route à deux chaussées séparées par un terre-plein central.", "Une route comportant de nombreuses intersections.", "Réservée à la circulation rapide des véhicules à moteur."]),
  question(11, ["A", "B", "C"], ["A", "B"], "Sur l’autoroute :", ["L’accès est interdit à certaines catégories d’usagers.", "La vitesse est réglementée selon l’administration locale.", "L’accès est libre à tous les usagers."]),
  question(12, ["A", "B", "C"], ["C"], "La chaussée est :", ["La partie réservée aux piétons.", "L’espace entre deux villes.", "La partie de la route réservée à la circulation des véhicules."]),
  question(13, ["A", "B", "C"], ["A"], "La voie est :", ["L’une des subdivisions de la chaussée, assez large pour la circulation d’une file de véhicules.", "Le trottoir.", "La chaussée entière."]),
  question(14, ["A", "B", "C"], ["C"], "L’agglomération désigne :", ["Une zone interdite aux véhicules.", "Une route de campagne.", "Un espace sur lequel sont groupés des immeubles bâtis rapprochés."]),
  question(15, ["A", "B", "C"], ["A"], "L’entrée et la sortie de l’agglomération sont généralement signalées :", ["Par des panneaux placés le long de la route qui la traverse ou la borde.", "Par des feux tricolores.", "Par un agent à chaque entrée."]),
  question(16, ["A", "B", "C"], ["C"], "La piste cyclable est :", ["Un trottoir.", "Une voie ouverte à tous les véhicules.", "Un passage longeant une chaussée ou non, exclusivement réservé aux cycles et cyclomoteurs."]),
  question(17, ["A", "B", "C"], ["A"], "La bande cyclable est :", ["Sur une chaussée à plusieurs voies, la voie exclusivement réservée aux cycles et cyclomoteurs.", "Une voie réservée aux motocyclettes.", "Une piste séparée de la route."]),
  question(18, ["A", "B", "C"], ["C"], "Le permis de conduire est :", ["Une carte grise.", "Un document d’assurance.", "Une autorisation officielle de conduire les véhicules à moteur d’une catégorie donnée."]),
  question(19, ["A", "B", "C"], ["A"], "Le véhicule est :", ["Un moyen de déplacement ou de transport terrestre, muni ou non d’un moteur.", "Uniquement un engin à moteur.", "Un moyen de transport aérien."]),
  question(20, ["A", "B", "C"], ["A"], "Combien existe-t-il de catégories de panneaux de signalisation ?", ["Quatre.", "Six.", "Deux."]),
  question(21, ["A", "B", "C", "D"], ["A", "B", "C"], "Quelles sont les catégories de panneaux ?", ["Les panneaux d’indication et de renseignement.", "Les panneaux de danger.", "Les panneaux de prescriptions absolues.", "Les panneaux publicitaires."]),
  question(22, ["A", "B", "C"], ["B"], "Les panneaux relatifs aux intersections et aux régimes de priorité :", ["Sont toujours carrés.", "Se présentent sous diverses formes.", "Sont toujours ronds."]),
  question(23, ["A", "B", "C"], ["C"], "Les panneaux de danger ont :", ["Une forme ronde, un fond bleu.", "Une forme carrée, un fond jaune.", "Une forme triangulaire, un fond blanc avec un listel rouge."]),
  question(24, ["A", "B", "C"], ["B"], "Les panneaux de danger sont des signalisations :", ["Placées après la zone dangereuse.", "Avancées, placées avant la zone dangereuse.", "Placées uniquement au sommet de côte."]),
  question(25, ["A", "B", "C"], ["B"], "Un panneau de danger est placé à quelle distance de la zone dangereuse en agglomération ?", ["150 m.", "50 m.", "500 m."]),
  question(26, ["A", "B", "C"], ["C"], "Un panneau de danger est placé à quelle distance de la zone dangereuse en rase campagne ?", ["50 m.", "300 m.", "150 m."]),
  question(27, ["A", "B", "C"], ["C"], "À la rencontre d’un panneau de danger, le conducteur :", ["Accélère.", "S’arrête obligatoirement.", "Réduit la vitesse de son véhicule en serrant sa droite."]),
  question(28, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Les panneaux de prescriptions absolues se subdivisent en :", ["Panneaux qui mettent fin aux obligations.", "Panneaux qui mettent fin aux interdictions.", "Panneaux d’obligation.", "Panneaux d’interdictions."]),
  question(29, ["A", "B", "C"], ["C"], "Les panneaux d’interdictions ont :", ["Une forme carrée.", "Une forme triangulaire.", "Une forme ronde et une bordure rouge."]),
  question(30, ["A", "B", "C"], ["A"], "Les panneaux qui mettent fin aux obligations sont :", ["Des ronds à fond bleu barrés de rouge.", "Des ronds à fond blanc barrés de noir.", "Des triangles à bordure rouge."]),
  question(31, ["A", "B", "C"], ["B"], "Les panneaux qui mettent fin aux interdictions sont :", ["Des carrés blancs.", "Des ronds à fond blanc barrés de noir.", "Des ronds à fond bleu barrés de rouge."]),
  question(32, ["A", "B", "C"], ["C"], "Les panneaux d’indication et de renseignement ont une forme :", ["Ronde.", "Triangulaire.", "Carrée ou rectangulaire."]),
  question(33, ["A", "B", "C"], ["C"], "Les balises sont :", ["Des panneaux de limitation de vitesse.", "Des feux tricolores.", "Des dispositifs implantés le long des routes pour signaler ou indiquer la position d’un obstacle dangereux."]),
  question(34, ["A", "B", "C", "D"], ["B", "C", "D"], "Parmi ces dispositifs, lesquels sont des balises ?", ["Les feux de position.", "La balise de virage.", "La balise de manche à air.", "Les délinéateurs."]),
  question(35, ["A", "B", "C"], ["A"], "La balise de virage dangereux peut indiquer aussi :", ["Le rétrécissement de la chaussée.", "La fin de l’autoroute.", "Une zone de stationnement."]),
  question(36, ["A", "B", "C"], ["A"], "Un véhicule est dit prioritaire lorsqu’il est :", ["En mission, faisant usage de ses avertisseurs sonores et/ou lumineux.", "Un véhicule de grande taille.", "Un véhicule de transport en commun."]),
  question(37, ["A", "B", "C", "D"], ["B", "C", "D"], "Quels sont les véhicules prioritaires ?", ["Les taxis.", "Les véhicules de police.", "Les véhicules de la gendarmerie.", "Les véhicules des sapeurs-pompiers."]),
  question(38, ["A", "B", "C"], ["A"], "Combien existe-t-il de types de véhicules prioritaires ?", ["Quatre.", "Dix.", "Deux."]),
  question(39, ["A", "B", "C"], ["C"], "SAMU signifie :", ["Service d’Accueil des Malades Urgents.", "Station d’Assistance Médicale Urbaine.", "Service d’Aide Médicale d’Urgence."]),
  question(40, ["A", "B", "C"], ["A"], "SMUR signifie :", ["Service Médical d’Urgence et de Réanimation.", "Service Mobile d’Urgence Routière.", "Secours Médical Urbain et Rural."]),
  question(41, ["A", "B", "C"], ["A"], "Le permis B autorise la conduite de tout véhicule de transport de personnes ou de marchandises dont le PTAC :", ["Ne dépasse pas 3,5 tonnes.", "Dépasse 18 tonnes.", "Ne dépasse pas 18 tonnes."]),
  question(42, ["A", "B", "C"], ["C"], "Le permis B autorise aussi les véhicules comportant :", ["30 places.", "18 places.", "8 places, non compris le siège du conducteur."]),
  question(43, ["A", "B", "C"], ["A"], "L’âge minimal pour passer l’examen du permis B est de :", ["18 ans.", "16 ans.", "21 ans."]),
  question(44, ["A", "B", "C"], ["B"], "À un véhicule de catégorie B, on peut atteler une remorque ou une caravane dont le PTAC ne dépasse pas :", ["18 tonnes.", "750 kg.", "3,5 tonnes."]),
  question(45, ["A", "B", "C"], ["C"], "Le permis A1 autorise la conduite :", ["D’un camion.", "D’une motocyclette de plus de 400 cm3.", "D’un vélomoteur ou cyclomoteur de 75 cm3 au plus."]),
  question(46, ["A", "B", "C"], ["C"], "L’âge minimal pour le permis A1 est de :", ["21 ans.", "18 ans.", "16 ans."]),
  question(47, ["A", "B", "C"], ["C"], "Le permis A2 autorise la conduite d’une motocyclette ou d’un quadricycle de :", ["Plus de 400 cm3.", "Moins de 75 cm3.", "75 à 400 cm3."]),
  question(48, ["A", "B", "C"], ["A"], "Le permis A3 autorise la conduite d’un motocycle, tricycle ou quadricycle de :", ["Plus de 400 cm3.", "75 cm3 au plus.", "75 à 400 cm3."]),
  question(49, ["A", "B", "C"], ["B"], "Le permis C autorise la conduite de tout véhicule de marchandises ou de matériels dont le PTAC :", ["Est inférieur à 750 kg.", "Ne dépasse pas 18 tonnes.", "Ne dépasse pas 3,5 tonnes."]),
  question(50, ["A", "B", "C"], ["B"], "Le permis C1 autorise la conduite de tout véhicule de marchandises ou de matériel dont le PTAC :", ["Ne dépasse pas 3,5 tonnes.", "Dépasse 18 tonnes.", "Ne dépasse pas 750 kg."]),
]
