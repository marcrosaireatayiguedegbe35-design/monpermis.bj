/**
 * Banque questions en dur — Chapitre 9.
 * Audio : /content/code-audio/chapitre-9/{n}.mp3
 * Images : /content/code-images/chapitre-9/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_09_KEY = 'chapitre-9'
export const CHAPITRE_09_ORDER = 9

/** Chapitre réservé aux candidats de ces catégories de permis (transport en commun, permis D). Les autres candidats ne le voient pas à l'examen. */
export const CHAPITRE_09_CATEGORIES = ['D']

/** Détecte un chapitre Mongo correspondant au chapitre 9 figé. */
export function matchesChapitre09(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_09_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*9\b/i.test(name) || /^9([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-9/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-9/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-9/. */
const QUESTIONS_WITH_IMAGES = new Set([27, 28, 29, 31])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch9-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch9-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_09_KEY,
    chapterOrder: CHAPITRE_09_ORDER,
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
 * 61 questions — chapitre 9 (transport en commun, permis D). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 738 (manuel 739 à 799).
 * Réservé à la catégorie D (voir CHAPITRE_09_CATEGORIES).
 */
export const CHAPITRE_09_QUESTIONS = [
  question(1, ["A", "B", "C"], ["A"], "Pour tourner à gauche sur une chaussée à double sens, je dois :", ["Mettre le clignotant à gauche et appliquer la priorité à droite.", "Accélérer, mettre le clignotant à droite.", "Ralentir et tourner à gauche seulement."]),
  question(2, ["A", "B", "C"], ["A", "B"], "Pour tourner à gauche sur une chaussée à sens unique, je dois :", ["Serrer ma droite et mettre le clignotant à gauche.", "Respecter les règles de priorité.", "Serrer ma gauche."]),
  question(3, ["A", "B", "C", "D", "E"], ["A", "E"], "L’autocar est un véhicule de transport en commun de personnes destiné au :", ["Transport de passagers assis uniquement.", "Transport de marchandises sur une longue distance.", "Transport urbain.", "Transport de passagers debout.", "Transport de passagers assis sur une longue distance."]),
  question(4, ["A", "B", "C", "D", "E"], ["C", "D"], "L’autobus est un véhicule de transport en commun de personnes destiné au :", ["Transport de passagers assis uniquement.", "Transport sur une longue distance.", "Transport urbain.", "Transport de passagers debout ou assis.", "Transport de passagers assis sur une longue distance."]),
  question(5, ["A", "B", "C", "D"], ["A", "B", "C"], "Les feux de gabarit sont obligatoires sur les véhicules de largeur égale à :", ["2,10 m.", "2,15 m.", "2,20 m.", "1,80 m."]),
  question(6, ["A", "B", "C", "D"], ["B", "D"], "Les feux d’encombrement ou de gabarit :", ["Sont toujours de couleur jaune.", "Sont de couleur blanche à l’avant.", "Éclairent à 40 m.", "Sont de couleur rouge à l’arrière."]),
  question(7, ["A", "B", "C", "D"], ["B"], "Quels sont les accessoires que le conducteur doit faire connaître aux passagers avant de prendre la route ?", ["Le livre de bord et la carte grise.", "L’extincteur et la boîte de premiers secours.", "La manivelle et la roue-secours.", "Les triangles de présignalisation."]),
  question(8, ["A", "B", "C", "D"], ["C"], "Quel est l’âge minimum du candidat à l’examen du permis de conduire catégorie D ?", ["18 ans.", "20 ans.", "21 ans.", "25 ans."]),
  question(9, ["A", "B", "C", "D"], ["A"], "Un conducteur de véhicule de transport en commun doit disposer d’une boîte de premiers secours :", ["Sous son siège.", "Cadenassée sous son siège.", "Dans le coffre à bagages.", "Cadenassé dans le porte-bagages intérieur."]),
  question(10, ["A", "B", "C", "D"], ["A", "B", "C"], "Que faire en cas d’accident d’un véhicule de transport en commun ?", ["Arrêter le moteur.", "Faire évacuer les passagers.", "Éviter la panique.", "Attendre la gendarmerie avant d’évacuer les blessés."]),
  question(11, ["A", "B", "C", "D"], ["A", "B", "C"], "Que faire en cas de panne d’un véhicule de transport en commun ?", ["Fermer le robinet de carburant.", "Couper le circuit électrique.", "Placer les triangles de présignalisation.", "Alerter la gendarmerie."]),
  question(12, ["A", "B", "C", "D", "E"], ["A", "C", "E"], "Que faire en cas d’incendie d’un véhicule de transport en commun ?", ["Rassurer les passagers pour éviter la panique.", "Chercher de l’eau pour éteindre l’incendie.", "Couper le circuit électrique.", "Mettre les feux de détresse.", "Briser les issues de secours en utilisant le marteau pic."]),
  question(13, ["A", "B", "C"], ["A"], "Une boîte de premiers secours est :", ["Obligatoire dans les véhicules de transport en commun de personnes.", "Conseillée par les véhicules de transport en commun de personnes uniquement.", "Obligatoire dans le cas de transport des enfants uniquement."]),
  question(14, ["A", "B", "C"], ["C"], "Le transport de voyageurs dans les remorques attelées à des véhicules de transport en commun est :", ["Autorisé.", "Toléré.", "Interdit."]),
  question(15, ["A", "B", "C", "D"], ["B"], "En rase campagne, quelle est la vitesse maximale autorisée pour un véhicule de transport en commun pesant entre dix et quinze tonnes ?", ["70 km/h.", "90 km/h.", "50 km/h.", "60 km/h."]),
  question(16, ["A", "B", "C", "D"], ["C"], "En rase campagne, quelle est la vitesse maximale autorisée pour un véhicule de transport en commun pesant entre quinze et dix-neuf tonnes ?", ["60 km/h.", "70 km/h.", "75 km/h.", "90 km/h."]),
  question(17, ["A", "B", "C", "D"], ["A"], "En rase campagne, quelle est la vitesse maximale autorisée pour un véhicule de transport en commun pesant entre dix-neuf et vingt-six tonnes ?", ["65 km/h.", "60 km/h.", "75 km/h.", "85 km/h."]),
  question(18, ["A", "B", "C", "D"], ["D"], "En rase campagne, quelle est la vitesse maximale autorisée pour un véhicule de transport en commun dont le poids est supérieur à vingt-six tonnes ?", ["85 km/h.", "75 km/h.", "65 km/h.", "60 km/h."]),
  question(19, ["A", "B", "C", "D"], ["C"], "Quelle est la durée maximale de conduite continue ?", ["2 h.", "6 h.", "4 h 30 mn.", "5 h 30 mn."]),
  question(20, ["A", "B", "C", "D"], ["B"], "Quelle est la durée maximale de conduite journalière ?", ["11 h.", "9 h.", "12 h 30 mn.", "13 h 25 mn."]),
  question(21, ["A", "B", "C"], ["C"], "Les véhicules dont le PTAC dépasse 3,5 T doivent être munis d’un appareil de contrôle appelé :", ["Éthylotest.", "Totaliseur.", "Chronotachygraphe."]),
  question(22, ["A", "B", "C"], ["B", "C"], "Le chronotachygraphe permet l’enregistrement :", ["Des tours des roues avant.", "De la vitesse du véhicule et de la distance parcourue.", "Du temps de conduite et de repos."]),
  question(23, ["A", "B", "C"], ["A", "B"], "L’intervalle de sécurité entre deux véhicules de plus de 3,5 T et de plus de sept mètres de long qui se suivent permet :", ["D’éviter une collision en cas de freinage brusque.", "De faciliter le dépassement par les véhicules légers.", "De mieux contrôler les organes de conduite."]),
  question(24, ["A", "B", "C"], ["B"], "Sur les chaussées comportant trois voies affectées à un même sens de circulation, les véhicules de plus de 3,5 T et les véhicules de plus de sept mètres de long doivent normalement emprunter :", ["Toutes les voies.", "La voie de droite.", "Les deux voies les plus à gauche."]),
  question(25, ["A", "B", "C"], ["B"], "L’utilisation d’un véhicule de transport de marchandises pour assurer le transport en commun de personnes est :", ["Autorisée.", "Interdite.", "Facultative."]),
  question(26, ["A", "B", "C"], ["A", "C"], "L’utilisation d’un véhicule de transport de marchandises pour assurer le transport en commun de personnes est :", ["Interdite.", "Facultative.", "Autorisée après homologation des aménagements."]),
  question(27, ["A", "B", "C", "D"], ["B"], "Que signifie le panneau B34a ?", ["Dépassement interdit aux camions.", "Fin d’interdiction de dépasser aux véhicules de transport de marchandises de plus de 3,5 T.", "Interdiction de dépasser tout véhicule.", "Fin d’interdiction de dépasser."]),
  question(28, ["A", "B", "C", "D"], ["C"], "Que signifie le panneau B45 ?", ["Accès interdit aux véhicules de transport en commun de personnes.", "Stationnement interdit aux véhicules de transport en commun de personnes.", "Fin de voies réservées aux véhicules de transport en commun de personnes.", "Arrêt interdit aux véhicules de transport en commun de personnes."]),
  question(29, ["A", "B", "C", "D"], ["C"], "Que signifie le panneau B27 ?", ["Arrêt d’autobus.", "Parking réservé aux autobus.", "Voie réservée aux autobus.", "Arrêt obligatoire aux autobus."]),
  question(30, ["A", "B", "C", "D"], ["A", "B", "D"], "Un chargement dépassant de plus d’un mètre à l’arrière doit être signalé par :", ["Un dispositif réfléchissant rouge.", "Un feu rouge visible à 150 m en cas de visibilité insuffisante.", "Un chiffon flottant.", "Une lanterne rouge."]),
  question(31, ["A", "B", "C"], ["A"], "Que signifie le panneau B10a ?", ["Accès interdit aux véhicules ou ensemble de véhicules dont la longueur dépasse 10 m.", "Accès interdit uniquement aux véhicules de transport de marchandises dont la longueur dépasse 10 m.", "Accès interdit uniquement aux véhicules de transport en commun de personnes dont la longueur dépasse 10 m."]),
  question(32, ["A", "B", "C", "D"], ["C", "D"], "Quelle est la vitesse maximale autorisée sur route pour automobile ?", ["90 km/h.", "60 km/h.", "110 km/h.", "Selon la législation en vigueur dans chaque pays."]),
  question(33, ["A", "B", "C", "D"], ["B"], "Quelle est la vitesse maximale autorisée en agglomération ?", ["70 km/h.", "50 km/h.", "90 km/h.", "100 km/h."]),
  question(34, ["A", "B", "C"], ["C"], "Avec quelle catégorie de permis de conduire pouvez-vous conduire un taxi ?", ["C.", "C1.", "D (TCR)."]),
  question(35, ["A", "B", "C"], ["C"], "Quel est l’âge minimum du candidat au permis de conduire catégorie D ?", ["17 ans.", "18 ans.", "21 ans."]),
  question(36, ["A", "B", "C", "D"], ["C"], "Quel intervalle minimal deux véhicules poids lourds long de plus de sept mètres doivent respecter entre eux lorsqu’ils roulent à la même vitesse ?", ["20 m.", "30 m.", "50 m.", "Rien de tout cela."]),
  question(37, ["A", "B", "C"], ["B"], "Avant d’aborder une descente rapide avec mon véhicule poids lourd, je dois :", ["Mettre le véhicule au point mort et freiner.", "Rétrograder et utiliser au maximum le frein moteur.", "Rester à la même vitesse."]),
  question(38, ["A", "B", "C"], ["C"], "Avec les véhicules poids lourds ayant pour hauteur de quatre ou cinq mètres du sol, chargement compris, je dois :", ["Circuler sans aucune précaution.", "Circuler en jetant des coups d’œil sur les installations et passer.", "M’assurer que je peux passer sans causer des dommages aux ouvrages d’art et aux installations aériennes, situés au-dessus des voies publiques."]),
  question(39, ["A", "B", "C"], ["A"], "Quelle longueur maximale peut atteindre le porte-à-faux arrière d’un véhicule poids lourd ou de transport en commun ?", ["3,5 m.", "5 m.", "2 m."]),
  question(40, ["A", "B", "C", "D"], ["D"], "Un véhicule de transport de marchandises peut être utilisé pour le transport en commun de personnes si le conducteur est titulaire du permis :", ["Catégorie D.", "Catégorie C.", "Catégorie C1.", "Aucun permis ne l’autorise."]),
  question(41, ["A", "B", "C"], ["A"], "À quoi sert le ralentisseur sur un véhicule poids lourd ?", ["Permet de descendre à une allure réduite dans une longue et forte descente.", "Permet de freiner.", "Permet de s’arrêter."]),
  question(42, ["A", "B", "C"], ["B"], "De combien de mètres mon chargement de grande longueur peut-il dépasser l’extrémité avant du véhicule ?", ["1 m.", "0 m.", "0,5 m."]),
  question(43, ["A", "B", "C"], ["A"], "De combien de mètres au maximum votre chargement de grande longueur peut-il dépasser l’extrémité arrière du véhicule ?", ["3 m.", "5 m.", "3,5 m."]),
  question(44, ["A", "B", "C"], ["A"], "Quelle charge maximale autorisée peut supporter un essieu isolé ?", ["13 tonnes.", "13,5 tonnes.", "15 tonnes."]),
  question(45, ["A", "B", "C"], ["C"], "Dans la définition du poids à vide d’un véhicule on tient compte :", ["Du poids du véhicule, avec le réservoir rempli uniquement.", "Du poids du véhicule sans le carburant, sans bâche.", "Du poids du véhicule, les réservoirs remplis avec les équipements de bord."]),
  question(46, ["A", "B", "C", "D"], ["A", "B", "D"], "La ceinture de sécurité doit être portée par :", ["Le conducteur.", "Les passagers d’un autocar.", "Les passagers d’un autobus.", "Les enfants à bord d’un véhicule de transport d’enfants."]),
  question(47, ["A", "B", "C"], ["A", "B", "C"], "Le coupe-batterie permet d’isoler :", ["Les feux de détresse.", "Les feux du véhicule.", "L’alimentation électrique du moteur."]),
  question(48, ["A", "B", "C"], ["A"], "Quelle est la profondeur minimale des rainures principales d’un pneumatique de poids lourd ?", ["1 mm.", "1,5 mm.", "0,5 mm."]),
  question(49, ["A", "B", "C", "D"], ["D"], "À l’intérieur d’un autocar, je peux transporter :", ["Des sacs de maïs.", "Des colis contenant des liquides inflammables.", "Des colis contenant des couteaux et objets pointus.", "Mon sac à main."]),
  question(50, ["A", "B", "C", "D"], ["A", "C", "D"], "Pour le transport des bagages dans un véhicule de transport en commun, j’utilise :", ["La soute pour tous les bagages.", "La remorque pour le transport des combustibles inflammables.", "Le porte-bagage de l’intérieur pour les colis légers.", "Le porte-bagage du dessus du toit pour les bagages légers."]),
  question(51, ["A", "B", "C", "D"], ["A", "B"], "J’utilise les feux de détresse d’un véhicule de transport en commun d’enfants :", ["Lors de la montée et de la descente des enfants.", "Lors de l’arrêt du véhicule.", "Pour le transport d’enfants en excursion.", "Pour signaler la présence à bord des enfants en fête."]),
  question(52, ["A", "B", "C"], ["A"], "À partir de 55 ans, quelle est la périodicité des visites médicales pour un conducteur de transport en commun :", ["1 an.", "2 ans.", "5 ans."]),
  question(53, ["A", "B", "C", "D"], ["B"], "Quelle est la périodicité des visites médicales pour un conducteur de transport en commun dont l’âge est compris entre 45 ans et 55 ans ?", ["1 an.", "2 ans.", "3 ans.", "5 ans."]),
  question(54, ["A", "B", "C", "D"], ["D"], "Quelle est la période des visites médicales pour un conducteur de transport en commun de moins de 45 ans ?", ["1 an.", "2 ans.", "3 ans.", "5 ans."]),
  question(55, ["A", "B", "C", "D"], ["D"], "Pour le calcul du nombre de personnes transportées, un enfant compte pour une demi-personne s’il est âgé de :", ["Moins de 11 ans.", "Moins de 12 ans.", "Moins de 14 ans.", "Rien de tout ce qui précède."]),
  question(56, ["A", "B", "C"], ["B"], "Sur une pente, quel est le véhicule qui doit s’arrêter à temps à cause d’un croisement difficile ?", ["Le véhicule montant.", "Le véhicule descendant.", "Le véhicule qui le désire."]),
  question(57, ["A", "B", "C"], ["B"], "En agglomération quel est le véhicule qui doit s’arrêter à temps à cause d’un croisement difficile ?", ["L’autobus.", "Le camion.", "Le véhicule qui le désire."]),
  question(58, ["A", "B", "C"], ["C"], "Sur une pente, quel est le véhicule qui doit faire marche arrière à cause d’un croisement difficile ?", ["L’autobus.", "Le véhicule qui le désire.", "Le camion."]),
  question(59, ["A", "B", "C"], ["C"], "Pour tourner à droite sur une route à double sens, je dois :", ["Serrer ma droite.", "Serrer ma gauche.", "Me déporter au milieu."]),
  question(60, ["A", "B", "C"], ["B", "C"], "Pour tourner à droite, je dois :", ["Accélérer.", "Mettre le clignotant à droite.", "Ralentir."]),
  question(61, ["A", "B", "C"], ["B"], "Pour tourner à gauche sur une chaussée à double sens, je dois :", ["Serrer ma droite.", "Me déporter au milieu.", "Serrer ma gauche."]),
]
