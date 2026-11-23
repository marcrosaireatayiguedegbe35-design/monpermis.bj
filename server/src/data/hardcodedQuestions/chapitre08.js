/**
 * Banque questions en dur — Chapitre 8.
 * Audio : /content/code-audio/chapitre-8/{n}.mp3
 * Images : /content/code-images/chapitre-8/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_08_KEY = 'chapitre-8'
export const CHAPITRE_08_ORDER = 8

/** Chapitre réservé aux candidats de ces catégories de permis (poids lourds, permis C et C1). Les autres candidats ne le voient pas à l'examen. */
export const CHAPITRE_08_CATEGORIES = ['C', 'C1']

/** Détecte un chapitre Mongo correspondant au chapitre 8 figé. */
export function matchesChapitre08(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_08_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*8\b/i.test(name) || /^8([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-8/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-8/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-8/. */
const QUESTIONS_WITH_IMAGES = new Set([24, 34, 35, 36, 37, 38, 39])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch8-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch8-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_08_KEY,
    chapterOrder: CHAPITRE_08_ORDER,
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
 * 50 questions — chapitre 8 (poids lourds, permis C et C1). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 688 (manuel 689 à 738).
 * Réservé aux catégories C et C1 (voir CHAPITRE_08_CATEGORIES).
 */
export const CHAPITRE_08_QUESTIONS = [
  question(1, ["A", "B", "C", "D"], ["D"], "Quel est l’âge minimal du candidat au permis de conduire catégorie C1 ?", ["17 ans.", "18 ans.", "20 ans.", "21 ans."]),
  question(2, ["A", "B", "C"], ["A"], "Pour les transports exceptionnels la réglementation (concernant les pièces de grande longueur) prévoit que le chargement du véhicule isolé peut déborder de :", ["3 m au plus à l’avant et 5 m à l’arrière.", "4 m au plus à l’avant et 7 m à l’arrière.", "0 m à l’avant et 6 m à l’arrière."]),
  question(3, ["A", "B", "C", "D"], ["C"], "Un véhicule articulé est composé :", ["D’un véhicule tracteur et d’une remorque.", "D’un véhicule tracteur et d’une semi-remorque.", "D’un véhicule tracteur routier et d’une semi-remorque.", "D’un véhicule tracteur routier et d’une remorque."]),
  question(4, ["A", "B", "C", "D"], ["B", "C"], "Un train double est composé :", ["D’un tracteur et d’une remorque.", "D’un tracteur routier et de deux semi-remorques.", "D’un véhicule articulé et d’une semi-remorque.", "D’un tracteur et d’une semi-remorque."]),
  question(5, ["A", "B", "C", "D"], ["C"], "La longueur d’un véhicule articulé peut atteindre :", ["22 m.", "26 m.", "16,5 m.", "18 m."]),
  question(6, ["A", "B", "C"], ["C"], "Quel est l’âge minimal du candidat au permis de conduire catégorie C ?", ["17 ans.", "18 ans.", "21 ans."]),
  question(7, ["A", "B", "C", "D"], ["B"], "Les véhicules dont le PTAC dépasse 3,5 T doivent être munis d’un appareil de contrôle appelé :", ["Totaliseur.", "Chronotachygraphe.", "Éthylotest.", "Un contrôleur de pression des pneus."]),
  question(8, ["A", "B", "C"], ["B", "C"], "Le chronotachygraphe permet l’enregistrement :", ["Des tours des roues avant.", "De la vitesse du véhicule et la distance parcourue.", "Du temps de conduite et de repos."]),
  question(9, ["A", "B", "C"], ["C"], "Pour conduire un véhicule de transport de marchandises ou de matériels dont le PTAC est compris entre 3,5 et 18 T, je dois :", ["Être titulaire du permis de conduire catégorie B.", "Être titulaire du permis de conduire catégorie B et E.", "Être titulaire du permis de conduire catégorie C."]),
  question(10, ["A", "B", "C", "D"], ["D"], "Quel intervalle minimal deux véhicules poids lourds de plus de sept mètres de long qui se suivent, doivent-ils respecter lorsqu’ils roulent à la même vitesse ?", ["20 m.", "30 m.", "90 m.", "Rien de tout cela."]),
  question(11, ["A", "B", "C"], ["B"], "Avant d’aborder une descente rapide avec mon véhicule poids lourd, je dois :", ["Mettre le véhicule au point mort et freiner.", "Rétrograder et utiliser au maximum le frein moteur.", "Rester à la même vitesse."]),
  question(12, ["A", "B", "C"], ["C"], "À bord d’un véhicule poids lourd et pour une hauteur de quatre ou cinq mètres du sol chargement compris, je dois :", ["Circuler sans aucune précaution.", "Circuler en jetant des coups d’œil sur les installations et passer.", "M’assurer que je peux circuler sans causer de dommage aux ouvrages d’art et aux installations aériennes situés au-dessus des voies publiques."]),
  question(13, ["A", "B", "C"], ["A"], "Quelle longueur maximale peut atteindre le porte-à-faux arrière d’un véhicule poids lourd ou de transport en commun ?", ["3,5 m.", "5 m.", "2 m."]),
  question(14, ["A", "B", "C", "D"], ["A", "D"], "À quoi sert le ralentisseur sur un véhicule poids lourd ?", ["Permet de descendre à une allure réduite dans une longue et forte pente.", "Permet de freiner.", "Permet de s’arrêter.", "Permet d’éviter l’usure précoce des tambours et des garnitures."]),
  question(15, ["A", "B", "C"], ["B"], "Le chargement de grande longueur peut dépasser l’extrémité avant du véhicule de :", ["1 m.", "0 m.", "1,5 m."]),
  question(16, ["A", "B", "C"], ["A"], "Le chargement de grande longueur peut dépasser au maximum l’extrémité arrière du véhicule de :", ["3 m.", "5 m.", "3,5 m."]),
  question(17, ["A", "B", "C"], ["B", "C"], "Pour tourner à droite sur une chaussée à sens unique, je dois :", ["Serrer ma droite.", "Serrer ma gauche.", "Me déporter au milieu."]),
  question(18, ["A", "B", "C"], ["A", "B"], "Pour tourner à gauche sur une chaussée à sens unique, je dois :", ["Serrer ma droite et mettre le clignotant à gauche.", "Respecter les règles de priorité.", "Serrer ma gauche et mettre le clignotant à gauche."]),
  question(19, ["A", "B", "C"], ["A"], "Avec mon permis de conduire de la catégorie C :", ["Je peux conduire un véhicule de 15 tonnes, chargement compris.", "Je peux conduire un véhicule de 20 tonnes, chargement compris.", "Je peux conduire un mini car de 15 places."]),
  question(20, ["A", "B", "C"], ["B", "C"], "Avec mon permis de conduire de la catégorie C1 :", ["Je peux conduire un car de 50 places.", "Je peux conduire un véhicule de 36 tonnes, chargement compris.", "Je peux conduire un véhicule de 7 tonnes, chargement compris."]),
  question(21, ["A", "B", "C"], ["B"], "Sur une pente, quel est le véhicule qui doit faciliter le passage lors d’un croisement difficile ?", ["L’autobus.", "Le camion.", "Le véhicule qui le désire."]),
  question(22, ["A", "B", "C"], ["A", "B"], "Que faut-il faire pour éviter de polluer l’environnement par le gaz de votre moteur ?", ["Bien régler les injecteurs de mon moteur.", "Utiliser un carburant de bonne qualité.", "Rouler à vive allure."]),
  question(23, ["A", "B", "C", "D"], ["A", "B", "C"], "Les feux de gabarit sont obligatoires sur les véhicules de largeur supérieure ou égale à :", ["2,10 m.", "2,15 m.", "2,20 m.", "1,80 m."]),
  question(24, ["A", "B", "C"], ["A", "B"], "Sur cette image PN2 le camion doit :", ["Faire un demi-tour si sa hauteur est supérieure à 4,5 m.", "Ralentir, vérifier la gauche et la droite puis passer si sa hauteur ne dépasse pas 4,5 m.", "Passer sans danger."]),
  question(25, ["A", "B", "C", "D"], ["B", "D"], "Les feux d’encombrement :", ["Sont toujours de couleur jaune.", "Sont de couleur blanche à l’avant.", "Éclairent à 400 m.", "Sont de couleur rouge à l’arrière."]),
  question(26, ["A", "B", "C"], ["A", "B"], "L’intervalle de sécurité entre deux véhicules de plus de sept mètres de long permet :", ["D’éviter le choc en cas de freinage.", "De faciliter aux véhicules légers le dépassement.", "De mieux contrôler les organes de conduite."]),
  question(27, ["A", "B", "C"], ["B"], "Sur la chaussée comportant trois voies affectées à un même sens de circulation, les véhicules de 3,5 T de PTAC et de plus de sept mètres de long doivent normalement :", ["Emprunter toutes les voies.", "Emprunter la voie de droite.", "Emprunter les deux voies les plus à gauche."]),
  question(28, ["A", "B", "C", "D"], ["D"], "Un véhicule articulé est composé :", ["D’un véhicule tracteur et d’une remorque.", "D’un véhicule tracteur et d’une semi-remorque.", "D’un véhicule tracteur routier et d’une remorque.", "Rien de tout ce qui précède."]),
  question(29, ["A", "B", "C", "D"], ["D"], "La longueur d’un véhicule articulé peut atteindre :", ["22 m.", "26 m.", "18 m.", "Rien de tout ce qui précède."]),
  question(30, ["A", "B", "C", "D"], ["A"], "La longueur maximale d’un train double est de :", ["18 m.", "22 m.", "25 m.", "16 m."]),
  question(31, ["A", "B", "C", "D"], ["B"], "Quelle est la durée minimale obligatoire de repos pour un conducteur de véhicule de plus de 3,5 T de PTAC après quatre heures et trente minutes de route ?", ["1 h.", "45 mn.", "55 mn.", "1 h 30 mn."]),
  question(32, ["A", "B", "C", "D"], ["B"], "En rase campagne, quel intervalle minimal de sécurité doit respecter deux véhicules de plus 3,5 T de PTAC et de plus de sept mètres de long qui se suivent lorsqu’ils roulent à la même vitesse ?", ["40 m environ.", "50 m environ.", "60 m environ.", "80 m environ."]),
  question(33, ["A", "B", "C", "D"], ["A", "B", "C"], "Dans une descente dangereuse :", ["Je ralentis.", "J’utilise le ralentisseur.", "Je rétrograde.", "J’utilise le frein à main."]),
  question(34, ["A", "B", "C", "D"], ["A", "B", "C"], "À la rencontre du panneau B2a1, il est interdit :", ["À tout véhicule de transport de marchandises de tourner à gauche.", "Aux véhicules de transport de marchandises dont le PTAC est inférieur à 3,5 T de tourner à gauche.", "Aux véhicules de transport de marchandises dont le PTAC est supérieur à 3,5 T de tourner à gauche.", "À tout véhicule de transport de tourner à gauche."]),
  question(35, ["A", "B", "C", "D"], ["B", "D"], "À la vue du panneau B3-3 il est interdit :", ["À un véhicule de transport de marchandises de dépasser un petit véhicule.", "Aux véhicules de transport de marchandises dont le PTAC excède 3,5 T de dépasser tout véhicule à moteur à l’exception des véhicules à deux roues sans side-car.", "Aux véhicules de transport de marchandises dont le PTAC est inférieur à 3,5 T de dépasser tout petit véhicule.", "À un véhicule poids lourd de dépasser une voiture."]),
  question(36, ["A", "B", "C"], ["C"], "Que signifie le panneau B8-1 ?", ["Voie réservée aux véhicules de transport de marchandises dont le PTAC est inférieur ou égal à 5,5 T.", "Accès interdit aux véhicules poids lourds dont le PTAC est égal à 5,5 T.", "Accès interdit aux véhicules de transport de marchandises dont le PTAC excède 5,5 T."]),
  question(37, ["A", "B", "C", "D"], ["B"], "Que signifie le panneau B13a ?", ["Accès interdit aux véhicules pesant 2,5 T.", "Accès interdit aux véhicules pesant sur un essieu plus de 2,5 T.", "Accès interdit aux véhicules pesant plus de 2,5 T.", "Accès interdit aux véhicules pesant sur un essieu 2,5 T."]),
  question(38, ["A", "B", "C"], ["C"], "Le panneau B29-1 :", ["M’indique une signalisation de position à 500 m.", "Concerne tous les véhicules à moteur roulant à plus de 60 km/h.", "M’indique une voie réservée aux véhicules lents à 500 m."]),
  question(39, ["A", "B"], ["A"], "Que m’indique le panneau B18b ?", ["Accès interdit aux véhicules transportant plus d’une certaine quantité de produits de nature à polluer l’eau.", "Accès interdit aux véhicules transportant plus d’une certaine quantité de produits explosifs ou facilement inflammables."]),
  question(40, ["A", "B", "C"], ["B"], "Effectuer un transport sous le régime « TIR » permet de simplifier le contrôle de :", ["La police sur la route.", "La douane aux frontières.", "La douane sur la route."]),
  question(41, ["A", "B", "C", "D"], ["A", "D"], "Vous effectuez un transport sous convention TIR :", ["Toutes les portes à l’exception de celles de la cabine doivent être scellées.", "Le véhicule peut circuler sans bâche sans élingues.", "Les portes de la cabine doivent être scellées.", "Les élingues d’attache de la bâche doivent être scellées."]),
  question(42, ["A", "B", "C"], ["B"], "La mention TIR peut être inscrite sur le véhicule pour un transport :", ["Local.", "International.", "Inter urbain."]),
  question(43, ["A", "B", "C", "D", "E"], ["A", "B", "E"], "Le poids total autorisé en charge (PTAC) est inscrit sur :", ["La carte grise.", "La plaque de tare.", "La vignette fiscale.", "La quittance de la douane.", "La plaque du constructeur."]),
  question(44, ["A", "B", "C", "D"], ["C"], "On appelle transports « exceptionnels », les véhicules chargés dont les dimensions ou le poids du chargement dépassent les limites fixées par :", ["La préfecture.", "La direction générale des transports terrestres.", "Le code de la route.", "Le ministère des transports."]),
  question(45, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Quels sont les renseignements qu’on peut retrouver sur la plaque de tare ou de surface ?", ["Le poids à vide.", "Le poids total autorisé en charge.", "Le poids total roulant autorisé.", "La surface."]),
  question(46, ["A", "B", "C"], ["B"], "Pour tourner à droite sur une chaussée à sens unique je dois :", ["Serrer ma droite.", "Serrer ma gauche.", "Me déporter au milieu de la chaussée."]),
  question(47, ["A", "B", "C"], ["B", "C"], "Pour tourner à droite, je dois :", ["Accélérer.", "Mettre le clignotant à droite.", "Ralentir."]),
  question(48, ["A", "B", "C"], ["B", "C"], "Pour tourner à droite sur une chaussée à double sens, je dois :", ["Serrer ma droite.", "Me déporter au milieu.", "Serrer ma gauche."]),
  question(49, ["A", "B", "C"], ["A"], "Pour tourner à gauche sur une chaussée à double sens, je dois :", ["Mettre le clignotant à gauche, céder le passage à droite.", "Ralentir et serrer la gauche.", "Tourner sans respecter la priorité à droite."]),
  question(50, ["A", "B", "C"], ["A", "B"], "Pour tourner à gauche sur une chaussée à sens unique, je dois :", ["Serrer ma droite et mettre le clignotant à gauche.", "Respecter les règles de priorité.", "Serrer ma gauche."]),
]
