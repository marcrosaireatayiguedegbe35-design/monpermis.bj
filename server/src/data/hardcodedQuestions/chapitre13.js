/**
 * Banque questions en dur — Chapitre 13.
 * Audio : /content/code-audio/chapitre-13/{n}.mp3
 * Images : /content/code-images/chapitre-13/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_13_KEY = 'chapitre-13'
export const CHAPITRE_13_ORDER = 13

/** Détecte un chapitre Mongo correspondant au chapitre 13 figé. */
export function matchesChapitre13(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_13_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*13\b/i.test(name) || /^13([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-13/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-13/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-13/. */
const QUESTIONS_WITH_IMAGES = new Set([12, 19, 28])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch13-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch13-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_13_KEY,
    chapterOrder: CHAPITRE_13_ORDER,
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
 * 28 questions — chapitre 13 (entretien, embrayage, feux, sécurité). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 900 (manuel 901 à 928).
 * Audios et images servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_13_QUESTIONS = [
  question(1, ["A", "B", "C"], ["A", "B"], "L’état des pneumatiques peut se contrôler :", ["Visuellement avant d’utiliser le véhicule.", "Au moins une fois par mois avec un manomètre pour la pression.", "Uniquement lors des opérations d’entretien prescrites par le constructeur."]),
  question(2, ["A", "B", "C"], ["B"], "Que faire si le niveau du liquide de frein baisse régulièrement dans le réservoir ?", ["Je rajoute simplement du liquide.", "Je fais immédiatement vérifier mon véhicule.", "J’attends la prochaine révision."]),
  question(3, ["A", "B", "C"], ["A", "B"], "La fréquence des opérations d’entretien :", ["Est indiquée sur le carnet d’entretien du véhicule.", "Varie selon les véhicules.", "Est fixée par le conducteur."]),
  question(4, ["A", "B", "C"], ["B"], "Sur une batterie dite sans entretien, je vérifie :", ["Le niveau d’eau par transparence.", "L’état des cosses.", "Rien, puisqu’elle est sans entretien."]),
  question(5, ["A", "B", "C"], ["C"], "Si le niveau de liquide de refroidissement est très bas :", ["C’est dû à l’évaporation.", "Je rajoute de l’eau simplement.", "Je fais vérifier l’étanchéité du circuit."]),
  question(6, ["A", "B", "C", "D"], ["A", "B", "C"], "Je fais vérifier rapidement mon véhicule si je constate une baisse importante du niveau :", ["De l’huile à moteur.", "Du liquide de frein.", "Du liquide de refroidissement.", "Du liquide de lave-glace."]),
  question(7, ["A", "B", "C", "D"], ["A", "B", "C"], "Il est recommandé d’avoir à bord du véhicule :", ["Une lampe de poche.", "Un tournevis.", "Un chiffon.", "Un bidon d’essence."]),
  question(8, ["A", "B"], ["B"], "Il est préférable, pour remorquer un véhicule :", ["D’utiliser une corde solide.", "D’utiliser une barre d’attelage fixée aux points d’ancrage prévus."]),
  question(9, ["A", "B", "C"], ["A"], "La position du point mort concerne :", ["Le levier de vitesses lorsqu’aucune vitesse n’est enclenchée.", "L’embrayage quand le moteur commence à entraîner les roues.", "La boîte de vitesses en prise directe."]),
  question(10, ["A", "B"], ["A"], "Pour que le moteur entraîne les roues alors qu’une vitesse est enclenchée, il faut :", ["Embrayer.", "Débrayer."]),
  question(11, ["A", "B", "C", "D"], ["A"], "En marche normale, l’embrayage sert à :", ["Passer les vitesses.", "Démarrer le véhicule.", "Ralentir le véhicule.", "Exécuter une manœuvre."]),
  question(12, ["A", "B", "C"], ["C"], "La liaison entre le moteur et les roues est établie sur le schéma :", ["(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(13, ["A", "B", "C"], ["B"], "Le « point de patinage », c’est lorsque :", ["Le moteur transmet toute son énergie aux roues.", "Le moteur commence à entraîner les roues.", "Le moteur tourne sans entraîner les roues."]),
  question(14, ["A", "B", "C"], ["A"], "L’embrayage a pour rôle :", ["D’assurer la liaison progressive entre le moteur et les roues.", "De faire tourner le moteur plus vite.", "D’arrêter le véhicule."]),
  question(15, ["A", "B", "C", "D"], ["A", "C", "D"], "Un véhicule comporte obligatoirement :", ["Un indicateur de vitesse.", "Un compte-tours.", "Un compteur kilométrique.", "Une jauge de carburant."]),
  question(16, ["A", "B", "C"], ["C"], "On appelle « angle mort » la partie de l’environnement que le conducteur :", ["Voit dans ses rétroviseurs.", "Voit directement au travers de son pare-brise.", "Ne peut voir ni au travers du pare-brise ni dans ses rétroviseurs."]),
  question(17, ["A", "B", "C"], ["A", "C"], "L’importance de « l’angle mort » varie selon :", ["Le type de véhicule.", "Le nombre de vitres latérales.", "Le réglage des rétroviseurs."]),
  question(18, ["A", "B"], ["A"], "Le frein moteur intervient dès qu’on :", ["Lâche l’accélérateur.", "Appuie sur la pédale de frein."]),
  question(19, ["A", "B"], ["A"], "Le conducteur doit intervenir le plus rapidement possible si l’un de ces voyants s’allume :", ["En circulation.", "Alors qu’il met le contact."]),
  question(20, ["A", "B", "C"], ["A", "B"], "Quelles sont les précautions à prendre en cas de crevaison ?", ["Baliser les lieux.", "Caler le véhicule.", "Faire appel à son mécanicien."]),
  question(21, ["A", "B", "C", "D"], ["A", "C", "D"], "Quel type d’extincteur faut-il recommander pour combattre un feu d’hydrocarbure ?", ["Extincteur à poudre.", "Extincteur à eau.", "Extincteur à mousse ou CO2.", "Extincteur polyvalent ABC."]),
  question(22, ["A", "B", "C", "D"], ["A", "B", "C"], "Je fais contrôler le système de freinage :", ["Si la voiture se déporte à droite ou à gauche au freinage.", "Si la course de la pédale est trop longue.", "Si j’entends des grincements au freinage.", "Si mes feux de position ne s’allument pas au freinage."]),
  question(23, ["A", "B", "C", "D"], ["A", "C", "D"], "Pour réduire la consommation du carburant il faut :", ["Avoir le système d’allumage bien réglé.", "Rouler avec porte-bagages chargé.", "Rouler avec des pneumatiques bien gonflés.", "Adapter la vitesse au régime du moteur."]),
  question(24, ["A", "B", "C", "D"], ["C", "D"], "La présignalisation doit être indiquée par :", ["Les plaques d’immatriculation.", "Les feux de croisement.", "Le signal de détresse.", "Le triangle de présignalisation."]),
  question(25, ["A", "B", "C"], ["C"], "Quels sont les feux obligatoires à l’avant d’un véhicule de tourisme ?", ["Deux feux de route, deux feux de croisement, deux feux stop, deux feux de position, deux indicateurs de changement de direction, deux feux antibrouillard.", "Deux phares, deux codes, deux clignotants, deux feux de position, feux plaque d’immatriculation, deux feux antibrouillard.", "Deux feux de route, deux indicateurs de changement de direction, deux feux de croisement, deux feux de position."]),
  question(26, ["A", "B", "C", "D"], ["A", "C"], "Citez quelques éléments électriques essentiels pour le fonctionnement d’un moteur à essence :", ["La batterie, le régulateur, l’alternateur.", "Les phares, le pneu, les feux de croisement.", "La batterie, la bobine, l’allumeur, la bougie.", "Les feux stop, le rétroviseur, le klaxon."]),
  question(27, ["A", "B", "C"], ["C"], "Quels sont dans l’ordre les quatre temps de fonctionnement d’un moteur à essence ?", ["Admission, compression, échappement, explosion.", "Compression, admission, explosion, échappement.", "Admission, compression, explosion, échappement."]),
  question(28, ["A", "B", "C"], ["A"], "Ce panonceau concerne les véhicules tractant une remorque d’un PTAC de :", ["Plus de 250 kilogrammes.", "240 kilogrammes.", "80 kilogrammes."]),
]
