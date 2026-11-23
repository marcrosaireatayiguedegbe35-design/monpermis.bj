/**
 * Banque questions en dur — Chapitre 11.
 * Audio : /content/code-audio/chapitre-11/{n}.mp3
 * Images : /content/code-images/chapitre-11/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_11_KEY = 'chapitre-11'
export const CHAPITRE_11_ORDER = 11

/** Détecte un chapitre Mongo correspondant au chapitre 11 figé. */
export function matchesChapitre11(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_11_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*11\b/i.test(name) || /^11([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-11/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-11/${n}.png`
}

/** Aucune image dans ce chapitre. */
const QUESTIONS_WITH_IMAGES = new Set([])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch11-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch11-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_11_KEY,
    chapterOrder: CHAPITRE_11_ORDER,
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
 * 38 questions — chapitre 11 (équipement, entretien, documents administratifs). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 799. Les questions 34 à 37 (manuel 833 à 836, page 230) sont absentes.
 * Audios servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_11_QUESTIONS = [
  question(1, ["A", "B", "C", "D"], ["C"], "Lequel des quatre temps ci-après correspond au temps utile ou au temps moteur ?", ["Échappement.", "Admission.", "Explosion.", "Compression."]),
  question(2, ["A", "B", "C"], ["B"], "Donnez la position des soupapes à l’explosion :", ["Les soupapes s’ouvrent.", "Les deux soupapes sont fermées.", "Les soupapes d’admission et d’échappement sont ouvertes."]),
  question(3, ["A", "B", "C"], ["B"], "Donnez la position du piston à l’explosion :", ["Le piston monte.", "Le piston descend.", "Le piston est sur place."]),
  question(4, ["A", "B", "C"], ["C"], "Quel est le rôle du carburateur ?", ["Le carburateur fournit du carburant.", "Le carburateur fait tourner le moteur.", "Le carburateur produit un mélange gazeux."]),
  question(5, ["A", "B", "C", "D"], ["C", "D"], "Quel est le rôle de la batterie ?", ["La batterie génère le courant.", "La batterie fournit du courant à l’alternateur.", "La batterie accumule le courant.", "La batterie fournit l’énergie nécessaire au démarrage du moteur."]),
  question(6, ["A", "B", "C", "D"], ["C"], "Quel est le rôle du radiateur ?", ["Le radiateur conserve la chaleur du moteur.", "Le radiateur aère le moteur.", "Le radiateur contribue au refroidissement du moteur.", "Le radiateur fait tourner le ventilateur."]),
  question(7, ["A", "B", "C"], ["B"], "Entre quels organes du moteur se situe la pompe à essence ?", ["Le radiateur et la pompe à eau.", "Le réservoir et le carburateur.", "Le filtre à air et le carburateur."]),
  question(8, ["A", "B", "C"], ["A"], "Quel est le rôle de la bobine ?", ["La bobine transforme le courant primaire de la batterie en courant secondaire.", "La bobine réduit l’intensité électrique.", "La bobine régularise le courant."]),
  question(9, ["A", "B", "C"], ["A"], "Quel est le rôle de l’allumeur ?", ["L’allumeur distribue du courant aux bougies.", "L’allumeur fournit du courant au démarreur.", "L’allumeur absorbe l’étincelle des bougies."]),
  question(10, ["A", "B", "C"], ["A"], "Quel est le circuit d’allumage d’un moteur à essence ?", ["Batterie, bobine, allumeur, bougies.", "Démarreur, allumeur, batterie.", "Allumeur, bobine, vis platinée."]),
  question(11, ["A", "B", "C"], ["A"], "De quels éléments le moteur tire-t-il sa force ?", ["Essence, air, courant électrique.", "Air, essence.", "Courant électrique, eau, essence."]),
  question(12, ["A", "B", "C", "D"], ["A", "C"], "Quels dégâts peut provoquer l’échauffement excessif du moteur ?", ["Joint de culasse brûlé.", "Décalage du moteur.", "Culasse bombée.", "Batterie déchargée."]),
  question(13, ["A", "B", "C"], ["B"], "Citer les feux obligatoires à l’arrière d’un véhicule de tourisme :", ["Deux feux de route, deux feux de croisement, deux feux indicateurs de changement de direction, deux feux de position, deux feux stop.", "Deux feux de position, deux clignotants, deux feux stop, deux cataphotes, feux plaques d’immatriculation.", "Deux feux de position, deux clignotants, feu plaque d’immatriculation, deux feux stop, deux cataphotes, deux feux antibrouillards, deux feux de recul."]),
  question(14, ["A", "B", "C"], ["B"], "Il est dangereux d’utiliser des pneumatiques usés parce qu’ils assurent :", ["Une bonne adhérence.", "Une mauvaise adhérence.", "Une conduite aisée."]),
  question(15, ["A", "B", "C"], ["C"], "Le véhicule de tourisme possède combien de sortes de freins ?", ["Quatre sortes.", "Deux sortes.", "Trois sortes."]),
  question(16, ["A", "B", "C", "D"], ["B"], "Le lit nacelle est un dispositif qui permet de transporter dans le véhicule les enfants de :", ["1 à 6 mois uniquement.", "0 à 9 mois.", "2 à 10 mois.", "3 à 20 mois."]),
  question(17, ["A", "B", "C", "D"], ["D"], "Le siège homologué (baquet, harnais ou réceptacle) sert à transporter dans le véhicule les enfants de :", ["3 à 4 mois.", "4 à 5 mois.", "6 à 8 mois.", "9 mois à 4 ans."]),
  question(18, ["A", "B", "C", "D"], ["A", "B"], "Quels dégâts peut provoquer le manque d’huile à moteur ?", ["Bielles coulées.", "Moteur bloqué.", "Moteur tournant en sous-régime.", "Éclatement du disque d’embrayage."]),
  question(19, ["A", "B", "C"], ["C"], "Quelle anomalie occasionne l’éclatement d’une durit à eau ?", ["Le refroidissement du moteur.", "L’emballement du moteur.", "L’échauffement du moteur."]),
  question(20, ["A", "B", "C"], ["A"], "À quel ennui vous expose la rupture de la courroie d’alternateur ?", ["Le circuit de charge interrompue.", "La charge excessive.", "La charge suffisante."]),
  question(21, ["A", "B", "C", "D"], ["B"], "Combien de pompes permettent le bon fonctionnement d’un moteur à essence ?", ["2 pompes.", "3 pompes.", "4 pompes.", "5 pompes."]),
  question(22, ["A", "B", "C", "D"], ["A", "B", "D"], "Quelles sont les pompes qui contribuent au bon fonctionnement d’un moteur à essence ?", ["Pompe à essence.", "Pompe à huile.", "Pompe à air.", "Pompe à eau."]),
  question(23, ["A", "B", "C"], ["B"], "Avec mon feu d’éclairage, la plaque minéralogique doit être lisible à une distance de :", ["50 m.", "20 m.", "30 m."]),
  question(24, ["A", "B", "C"], ["A", "C"], "Par temps de brouillard, tout conducteur de véhicule circulant sur une route doit obligatoirement allumer :", ["Les feux de position.", "Les feux de route.", "Les feux de croisement."]),
  question(25, ["A", "B", "C"], ["A", "C"], "Par temps de forte pluie, tout conducteur de véhicule circulant sur une route doit obligatoirement allumer :", ["Les feux de position.", "Les feux de route.", "Les feux de croisement."]),
  question(26, ["A", "B", "C", "D"], ["D"], "Quand vérifie-t-on le niveau d’huile dans le moteur ?", ["Toutes les semaines.", "Tous les mois.", "Tous les milles kilomètres.", "Tous les jours."]),
  question(27, ["A", "B", "C", "D"], ["B"], "Quand vérifie-t-on le niveau de l’eau dans le radiateur ?", ["Toutes les semaines.", "Tous les jours.", "Tous les milles kilomètres.", "Seulement quand le moteur commence à se chauffer."]),
  question(28, ["A", "B", "C", "D"], ["C"], "Pour compléter le liquide de la batterie, j’utilise :", ["L’eau de pluie.", "L’eau de mer.", "L’eau distillée.", "L’eau du robinet."]),
  question(29, ["A", "B", "C", "D"], ["C"], "Sur un véhicule où trouve-t-on l’instrument qui indique la température de l’eau ?", ["Dans le moteur.", "Sur le radiateur.", "Au tableau de bord.", "Sur le filtre à air."]),
  question(30, ["A", "B", "C"], ["B"], "Sur un véhicule où trouve-t-on l’instrument qui indique la pression de l’huile à moteur ?", ["Dans le moteur.", "Sur le tableau de bord.", "Sur le carter."]),
  question(31, ["A", "B", "C", "D"], ["D"], "Le moteur de votre véhicule roulant normalement s’éteint, de quoi peut provenir la panne ?", ["De l’insuffisance d’huile à moteur.", "De l’insuffisance d’eau dans le radiateur.", "De la faiblesse de la batterie.", "Du manque de carburant."]),
  question(32, ["A", "B", "C", "D"], ["B"], "La batterie montée sur le véhicule après une charge correcte ne démarre pas le moteur. Quelle peut être la cause ?", ["Le manque d’eau sur la batterie.", "Les cosses mal serrées sur les bornes.", "Le manque de carburant.", "La défectuosité de l’alternateur."]),
  question(33, ["A", "B", "C", "D"], ["C"], "L’eau du radiateur bouillonne, que doit-on faire ?", ["Arrêter le moteur et mettre de l’eau dans le radiateur.", "Poursuivre sa route.", "Arrêter le moteur, le laisser se refroidir, mettre de l’eau et consulter après un garagiste.", "Arrêter le véhicule, ouvrir le radiateur pour laisser dégager la chaleur."]),
  question(38, ["A", "B", "C"], ["A"], "Les feux de route servent à éclairer jusqu’à :", ["100 m environ.", "30 m environ.", "150 m et au-delà."]),
  question(39, ["A", "B", "C"], ["B"], "Quels feux utilisez-vous la nuit quand vous suivez à distance réduite un autre usager sur une route mal éclairée ?", ["Les feux de route.", "Les feux de croisement.", "Les feux de position."]),
  question(40, ["A", "B", "C"], ["C"], "Quels feux utilisez-vous en stationnement en bordure d’une route mal éclairée ?", ["Les feux de détresse.", "Les feux de croisement.", "Les feux de position."]),
  question(41, ["A", "B", "C", "D", "E"], ["C", "D"], "J’utilise mes feux de détresse pour :", ["Indiquer que je vais tout droit.", "Faire marche arrière.", "Indiquer que je suis en panne.", "Indiquer que je suis le dernier d’un convoi.", "Indiquer que je suis pressé."]),
  question(42, ["A", "B", "C"], ["C"], "Sans feux arrière la nuit :", ["Je peux circuler sur une chaussée à double sens.", "Je peux circuler sur une chaussée à sens unique.", "Je ne peux pas circuler."]),
]
