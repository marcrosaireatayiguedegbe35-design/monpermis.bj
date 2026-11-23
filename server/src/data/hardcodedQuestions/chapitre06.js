/**
 * Banque questions en dur — Chapitre 6.
 * Audio : /content/code-audio/chapitre-6/{n}.mp3
 * Images : /content/code-images/chapitre-6/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_06_KEY = 'chapitre-6'
export const CHAPITRE_06_ORDER = 6

/** Chapitre réservé aux candidats de ces catégories de permis (deux-roues). Les autres candidats ne le voient pas à l'examen. */
export const CHAPITRE_06_CATEGORIES = ['A1', 'A2', 'A3']

/** Détecte un chapitre Mongo correspondant au chapitre 6 figé. */
export function matchesChapitre06(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_06_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*6\b/i.test(name) || /^6([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-6/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-6/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-6/. */
const QUESTIONS_WITH_IMAGES = new Set([25, 26, 27])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch6-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch6-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_06_KEY,
    chapterOrder: CHAPITRE_06_ORDER,
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
 * 33 questions — chapitre 6 (deux-roues, permis A1 / A2 / A3). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 645 (manuel 646 à 678).
 * Réservé aux catégories A1, A2, A3 (voir CHAPITRE_06_CATEGORIES).
 */
export const CHAPITRE_06_QUESTIONS = [
  question(1, ["A", "B", "C", "D"], ["C", "D"], "Sur une motocyclette, le passager :", ["Peut être assis devant le conducteur.", "Peut être assis dans la position dite « en amazone ».", "Doit être assis sur le siège arrière.", "Doit faire corps avec la moto et son conducteur."]),
  question(2, ["A", "B", "C"], ["A"], "En cas de panne de ma motocyclette :", ["Je peux traîner ma moto sur le trottoir, le moteur arrêté.", "Je ne peux pas traîner ma moto sur le trottoir, le moteur arrêté.", "Je peux la garer sur le trottoir et attendre un dépanneur."]),
  question(3, ["A", "B", "C"], ["C"], "Dans une circulation en files ininterrompues :", ["Je peux me faufiler entre les véhicules.", "Je peux me faufiler entre les véhicules si la circulation s’arrête.", "Je dois rester dans ma file sauf pour préparer un changement de direction."]),
  question(4, ["A", "B", "C"], ["C"], "Avec mon véhicule à deux roues, je peux traverser une voie ferrée :", ["En passant par le portillon d’une barrière fermée avant le passage d’un train.", "En passant les demi-barrières fermées avant le passage du train.", "Après le relèvement de la barrière."]),
  question(5, ["A", "B", "C", "D"], ["B"], "Le clignotant est obligatoire :", ["Pour les cyclomoteurs.", "Pour les motocyclettes.", "Pour tous les véhicules à deux roues.", "Pour les automobiles seulement."]),
  question(6, ["A", "B", "C"], ["A"], "Avec mon permis de conduire catégorie A1, je peux conduire des motocyclettes dont la cylindrée :", ["N’excède pas 75 cm3.", "Excède 75 cm3.", "Est égale à 100 cm3."]),
  question(7, ["A", "B", "C", "D"], ["C", "D"], "Avec mon permis de conduire catégorie A2, je peux conduire des motocyclettes dont la cylindrée :", ["N’excède pas 450 cm3.", "Excède 400 cm3.", "Est inférieure à 400 cm3.", "Est égale à 400 cm3."]),
  question(8, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Avec mon permis de conduire catégorie A3, je peux conduire des motocyclettes dont la cylindrée :", ["N’excède pas 450 cm3.", "Excède 400 cm3.", "Est inférieure à 400 cm3.", "Est égale à 400 cm3."]),
  question(9, ["A", "B", "C", "D"], ["A", "B", "C"], "Quels sont les contrôles de niveau à effectuer avant le départ sur les motocyclettes dont la cylindrée est supérieure ou égale à 400 cm3 ?", ["Niveau d’huile à moteur.", "Eau dans le radiateur.", "Essence dans le réservoir.", "Eau du bocal de l’essuie-glace."]),
  question(10, ["A", "B", "C"], ["A"], "Dans quelle position met-on la motocyclette pour effectuer les contrôles de niveau ?", ["Sur la béquille centrale.", "Sur la béquille latérale.", "Couchée."]),
  question(11, ["A", "B", "C", "D"], ["A", "C", "D"], "En longeant les véhicules en stationnement, à quoi doit-on faire attention ?", ["Aux piétons qui pourraient surgir.", "Aux véhicules qui pourraient surgir.", "Aux portières qui pourraient s’ouvrir.", "Aux véhicules qui pourraient quitter leur stationnement."]),
  question(12, ["A", "B", "C", "D"], ["A", "B", "D"], "Les précautions à prendre pour la conduite d’une nouvelle motocyclette :", ["S’habituer progressivement.", "Augmenter la distance de sécurité.", "Réduire la distance de sécurité.", "Adopter une bonne position de conduite, de freinage et de tenue de route."]),
  question(13, ["A", "B", "C", "D"], ["A", "B", "D"], "Quels sont les contrôles à effectuer avant chaque départ ?", ["Position des béquilles.", "Bon ajustement du casque (conducteur et passager).", "Resserrage des rayons.", "Réglage des rétroviseurs."]),
  question(14, ["A", "B", "C", "D"], ["B", "C"], "Quels sont les différents types de casques pour les motocyclettes et les cyclomoteurs ?", ["Casque à couverture ignifugée.", "Casque intégral.", "Casque enveloppant.", "Casque étoilé."]),
  question(15, ["A", "B", "C", "D"], ["A", "B", "D"], "Quelle est la bonne position d’un conducteur à motocyclette ?", ["Être bien assis sur la selle.", "Avoir les bras légèrement fléchis.", "Avoir le cou raide.", "Garder les genoux contre le réservoir."]),
  question(16, ["A", "B", "C"], ["B"], "Quel est l’âge minimum pour un candidat à l’examen du permis de conduire A1 ?", ["14 ans.", "16 ans.", "17 ans."]),
  question(17, ["A", "B", "C"], ["B"], "Le feu stop est obligatoire :", ["Sur les cyclomoteurs.", "Sur les motocyclettes.", "Sur tous les véhicules à deux roues."]),
  question(18, ["A", "B"], ["A"], "Le rétroviseur est-il obligatoire pour les motocyclettes ?", ["Oui.", "Non."]),
  question(19, ["A", "B", "C"], ["B"], "Combien de passagers un conducteur de motocyclette peut-il transporter ?", ["Deux.", "Un.", "Trois."]),
  question(20, ["A", "B", "C"], ["B", "C"], "Le port de casque est obligatoire lorsqu’on est sur les véhicules à deux roues :", ["Seulement quand je remorque un passager.", "Si je suis seul.", "Pour tous les occupants."]),
  question(21, ["A", "B", "C"], ["B"], "Le port de casque protège contre :", ["Le soleil et la pluie.", "Le traumatisme crânien.", "La poussière."]),
  question(22, ["A", "B", "C"], ["C"], "Quel est l’âge minimum du candidat à l’examen de permis de conduire A2 ?", ["15 ans.", "20 ans.", "18 ans."]),
  question(23, ["A", "B", "C"], ["B"], "Pour le transport d’un enfant de moins de cinq ans sur une motocyclette il faut :", ["Avoir un simple siège.", "Avoir un siège muni de courroie-attache.", "Bien régler son casque."]),
  question(24, ["A", "B", "C"], ["C"], "Quel est l’âge minimum pour un candidat à l’examen de permis de conduire A3 ?", ["17 ans.", "18 ans.", "21 ans."]),
  question(25, ["A", "B", "C"], ["C"], "Que signifie le panneau A21b ?", ["Voie réservée au cycliste.", "Voie interdite au cycliste.", "Débouché de cycliste venant de gauche seulement."]),
  question(26, ["A", "B", "C", "D"], ["B", "C"], "Sur ma moto, à la vue du panneau B14-3 hors agglomération :", ["Je peux rouler à plus de 60 km/h.", "Je peux rouler à moins de 60 km/h.", "Je peux rouler à 60 km/h strictement.", "Je ne suis pas concerné par cette signalisation."]),
  question(27, ["A", "B", "C"], ["A"], "Le panneau B14-3 :", ["Concerne uniquement les conducteurs à moto.", "Concerne tous les conducteurs sauf les motocyclistes.", "Concerne aussi les 4 roues."]),
  question(28, ["A", "B", "C", "D"], ["D"], "Le port de casque est obligatoire :", ["Seulement en rase campagne où la grande vitesse est possible.", "Seulement en ville à cause du grand nombre de véhicules.", "Seulement sur les voies pavées ou bitumées.", "Rien de tout ce qui précède."]),
  question(29, ["A", "B", "C", "D"], ["C"], "La circulation à deux de front pour les véhicules à deux roues :", ["Est autorisée sur les chaussées à double sens de circulation.", "Est autorisée sur les chaussées à sens unique de circulation.", "N’est pas autorisée.", "Est autorisée seulement sur les voies réservées aux véhicules à deux roues."]),
  question(30, ["A", "B", "C"], ["A"], "Avec mon permis de conduire catégorie A2, je peux conduire des motocyclettes dont la cylindrée n’excède pas :", ["400 cm3.", "450 cm3.", "600 cm3."]),
  question(31, ["A", "B", "C", "D"], ["B", "D"], "Les motocyclettes sont des véhicules à deux roues :", ["Avec moteur auxiliaire.", "Pourvus d’un moteur thermique.", "Dont la cylindrée ne dépasse pas 50 cm3.", "Dont la cylindrée dépasse 50 cm3."]),
  question(32, ["A", "B", "C"], ["B"], "Les cyclomoteurs sont des véhicules à deux roues :", ["Pourvus d’un moteur thermique.", "Dont la cylindrée ne dépasse pas 50 cm3.", "Dont la cylindrée dépasse 50 cm3."]),
  question(33, ["A", "B", "C", "D", "E"], ["A", "C", "E"], "Sont obligatoires sur les motocyclettes :", ["Les avertisseurs.", "Les deux rétroviseurs.", "Le rétroviseur gauche.", "Le rétroviseur droit.", "Le frein avant."]),
]
