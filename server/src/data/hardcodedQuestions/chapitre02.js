/**
 * Banque questions en dur — Chapitre 2 (priorités / intersections / dépassement).
 * Audio : /content/code-audio/chapitre-2/{n}.mp3
 * Images : /content/code-images/chapitre-2/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_02_KEY = 'chapitre-2'
export const CHAPITRE_02_ORDER = 2

/** Détecte un chapitre Mongo correspondant au chapitre 2 figé. */
export function matchesChapitre02(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_02_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*2\b/i.test(name) || /^2([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-2/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-2/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-2/. */
const QUESTIONS_WITH_IMAGES = new Set([13, 15, 20, 21, 22, 23, 24, 25, 26, 28, 29, 30, 31, 32, 33, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 67, 68, 82, 83, 84, 85, 86, 87, 88, 89, 90, 114, 115, 116, 117, 118, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch2-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch2-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_02_KEY,
    chapterOrder: CHAPITRE_02_ORDER,
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
 * 144 questions — chapitre 2 (priorités, intersections, dépassement). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 205. Les questions 52 à 61 (manuel 257 à 266, pages 82-83) sont absentes.
 * Audios et images servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_02_QUESTIONS = [
  question(1, ["A", "B", "C"], ["B"], "Les véhicules prioritaires sont :", ["Police – Gendarmerie – corbillards en mission.", "SAMU – SMUR – Sapeur-pompier – Gendarmerie en mission.", "SAMU – corbillard – Police."]),
  question(2, ["A", "B", "C"], ["B"], "Les feux tricolores fonctionnent, cependant l’agent de sécurité règlemente la circulation :", ["Je passe au feu vert.", "Je ne passe que si je suis autorisé par l’agent de sécurité.", "Je passe sans tenir compte ni du feu ni de l’agent de sécurité."]),
  question(3, ["A", "B", "C"], ["C"], "À une intersection munie à la fois de panneau et de feux tricolores fonctionnant normalement :", ["Je me conforme à la fois au panneau et aux feux.", "Je ne me conforme ni à l’un ni à l’autre.", "Je me conforme uniquement aux feux."]),
  question(4, ["A", "B", "C"], ["C"], "Quelles sont les grandes règles de priorité ?", ["La règle de courtoisie et le respect des agents de sécurité.", "Le respect des feux et la règle de priorité à droite.", "La priorité à droite, la priorité de passage et la perte de priorité."]),
  question(5, ["A", "B", "C"], ["A"], "La priorité à droite consiste à :", ["Passer quand ma droite est libre.", "Passer quand ma gauche est libre.", "Serrer ma droite et tourner à droite."]),
  question(6, ["A", "B", "C"], ["A"], "Que faire à une intersection sans signalisation ?", ["Céder le passage à droite.", "Céder le passage à gauche.", "Aller tout droit."]),
  question(7, ["A", "B", "C"], ["A"], "Que faire à une intersection de routes de même nature ?", ["Céder le passage à droite.", "Aller tout droit.", "Céder le passage à droite et à gauche."]),
  question(8, ["A", "B", "C", "D"], ["B", "C", "D"], "Les indications des agents de sécurité prévalent sur :", ["Uniquement les feux tricolores.", "Toutes signalisations.", "Les règles de circulation.", "Les feux de signalisation."]),
  question(9, ["A", "B", "C"], ["B"], "La priorité à droite consiste à :", ["Céder le passage à tout véhicule venant de gauche comme de droite.", "Céder le passage uniquement aux véhicules venant de la droite.", "Ne céder le passage à aucun véhicule."]),
  question(10, ["A", "B", "C"], ["A"], "À l’intersection munie de feux tricolores dont le rouge est allumé, que dois-je faire ?", ["Je m’arrête.", "Je passe si je veux tourner à droite.", "Je ralentis et je passe si la voie est libre."]),
  question(11, ["A", "B", "C", "D"], ["C"], "À une distance raisonnable du feu jaune fixe, je me prépare à :", ["Appliquer la règle de priorité à droite.", "Passer.", "M’arrêter.", "Céder le passage."]),
  question(12, ["A", "B", "C", "D"], ["D"], "Lorsque je vois de face l’agent de sécurité réglementant la circulation :", ["Je passe.", "Je ralentis et je passe.", "J’applique la priorité à droite.", "Je ralentis et je m’arrête."]),
  question(13, ["A", "B", "C"], ["C"], "À cette intersection I17, quel doit être l’ordre de passage des véhicules ?", ["Jaune – vert – bleu.", "Bleu – vert – jaune.", "Rien de tout ce qui précède."]),
  question(14, ["A", "B", "C"], ["C"], "Au carrefour à sens giratoire en agglomération :", ["La priorité est toujours à droite.", "La priorité peut être donnée à droite et à gauche.", "Rien de tout ce qui précède."]),
  question(15, ["A", "B"], ["B"], "À cette intersection I14, quel doit être l’ordre de passage des véhicules ?", ["Le véhicule bleu démarre, fait un quart de tour et s’arrête ; le véhicule rouge passe ensuite ; le véhicule jaune passe ; le véhicule bleu après.", "Le véhicule bleu démarre, fait un quart de tour et s’arrête ; le véhicule jaune passe ; le véhicule rouge passe ensuite ; le véhicule bleu passe après."]),
  question(16, ["A", "B", "C"], ["C"], "À une intersection munie de feux tricolores où un agent de sécurité réglemente la circulation, que dois-je faire ?", ["Je respecte les feux.", "Je passe si le feu est au vert.", "Je suis les indications de l’agent."]),
  question(17, ["A", "B", "C"], ["C"], "À l’intersection d’une route revêtue et d’une route en terre, quelle est la règle de priorité à observer en agglomération ?", ["La priorité de passage.", "La perte de priorité.", "La priorité à droite."]),
  question(18, ["A", "B", "C"], ["B"], "À l’intersection d’une route revêtue et d’une route en terre, quelle est la règle de priorité à observer hors agglomération par l’usager circulant sur la route en terre ?", ["La priorité de passage.", "La perte de priorité.", "La priorité à droite."]),
  question(19, ["A", "B", "C", "D"], ["A", "B"], "Dans quels cas dois-je céder le passage aux usagers venant de gauche comme de droite ?", ["Devant le feu rouge.", "Devant le triangle pointe en bas.", "Devant le feu vert.", "Quand je roule sur une route prioritaire."]),
  question(20, ["A", "B", "C"], ["B"], "Quel doit être l’ordre de passage des véhicules à cette intersection I3 ?", ["Le véhicule rouge, le véhicule jaune et le véhicule bleu.", "Le véhicule bleu, le véhicule jaune et le véhicule rouge.", "Les véhicules jaune, rouge et bleu."]),
  question(21, ["A", "B", "C", "D"], ["A", "D"], "À cette intersection I7 :", ["Il faut appliquer la règle de la priorité à droite.", "Il faut appliquer la règle de courtoisie.", "La voiture jaune doit céder le passage à la voiture rouge.", "La voiture rouge doit céder le passage à la voiture jaune."]),
  question(22, ["A", "B", "C"], ["A"], "À cette intersection I9 :", ["Le véhicule jaune peut tourner immédiatement à droite.", "Le véhicule jaune peut tourner immédiatement à gauche.", "Le véhicule jaune peut aller immédiatement tout droit."]),
  question(23, ["A", "B", "C", "D"], ["B"], "À cette intersection I7, en agglomération, le véhicule rouge est sur la chaussée revêtue et le véhicule jaune est sur la chaussée en terre, quelle est la règle de priorité à observer ?", ["La règle de courtoisie.", "La règle de la priorité à droite.", "La règle de la perte de priorité.", "La règle de la priorité de passage."]),
  question(24, ["A", "B", "C", "D"], ["A", "B"], "À cette intersection I7, hors agglomération, le véhicule rouge est sur la chaussée revêtue et le véhicule jaune est sur la chaussée en terre, quelle est la règle de priorité à appliquer ?", ["La priorité de passage par le véhicule rouge.", "La perte de priorité par le véhicule jaune.", "La priorité à droite par les deux véhicules.", "La règle de courtoisie par les deux véhicules."]),
  question(25, ["A", "B"], ["B"], "À cette intersection I8, quel doit être l’ordre de passage des véhicules ?", ["Les véhicules jaune, bleu et la moto passent simultanément ; le véhicule rouge passe après.", "Les véhicules jaune et bleu passent ; le véhicule rouge passe ; la moto passe après."]),
  question(26, ["A", "B", "C", "D"], ["C"], "À cette intersection I9, qui passera définitivement le premier ?", ["La moto.", "Le véhicule rouge.", "Le véhicule vert.", "Le véhicule jaune."]),
  question(27, ["A", "B", "C"], ["B"], "À une intersection de routes de même valeur où aucun usager n’a sa droite libre, s’applique :", ["La priorité de passage pour les usagers venant de droite et de gauche.", "Le jeu de courtoisie et ensuite la règle de la priorité à droite.", "La perte de priorité de passage pour les usagers venant de face."]),
  question(28, ["A", "B"], ["B"], "À cette intersection I10, quel doit être l’ordre de passage des véhicules ?", ["La moto ; le véhicule jaune ensuite ; le véhicule bleu après.", "Le véhicule jaune ; le véhicule bleu ensuite ; la moto après."]),
  question(29, ["A", "B", "C"], ["B"], "À cette intersection I12, quel doit être l’ordre de passage des véhicules ?", ["Le véhicule bleu, le véhicule rouge et le véhicule vert.", "Le véhicule vert démarre, fait un quart de tour et s’arrête, le véhicule bleu tourne, le véhicule rouge passe et le vert continue.", "Le véhicule rouge avance en suivant le véhicule bleu qui tourne, puis le véhicule vert tourne après."]),
  question(30, ["A", "B", "C"], ["A"], "À cette intersection I18, quel doit être l’ordre de passage des véhicules ?", ["Le véhicule orange marque un arrêt ; les véhicules jaune, rouge et vert passent simultanément ; le véhicule orange laisse passer les piétons et passera au feu vert.", "Les véhicules jaune, rouge et vert passent simultanément ; le véhicule orange qui a vu la flèche verte tourne à droite.", "Le véhicule orange tourne immédiatement ; les véhicules jaune, rouge et vert passent simultanément."]),
  question(31, ["A", "B"], ["B"], "Avant cette intersection I6, quel panneau ont rencontré les véhicules jaune et rouge ?", ["Panneau indiquant l’intersection de deux routes secondaires.", "Panneau indiquant le caractère prioritaire de la route."]),
  question(32, ["A", "B", "C"], ["C"], "À cette intersection I17, quel sera l’ordre de passage ?", ["Le véhicule jaune, le véhicule vert et le véhicule bleu.", "Le véhicule bleu, le véhicule vert et le véhicule jaune.", "Le véhicule bleu passe derrière le véhicule jaune et le véhicule vert après."]),
  question(33, ["A", "B", "C"], ["A"], "À cette intersection I22, quel sera l’ordre de passage ?", ["Les véhicules jaune et bleu passent simultanément, le véhicule rouge laisse passer les piétons et tourne à droite.", "Le véhicule rouge tourne immédiatement à droite et les véhicules jaune et bleu passent après.", "Pendant que les véhicules jaune et bleu passent simultanément, le véhicule rouge tourne à droite."]),
  question(34, ["A", "B", "C"], ["B"], "Au carrefour à sens giratoire en agglomération :", ["La priorité est toujours à droite.", "La priorité est donnée aux véhicules engagés dans le sens giratoire.", "La priorité peut être donnée à gauche et à droite."]),
  question(35, ["A", "B", "C"], ["B"], "Sur cette image PN1, le véhicule bleu doit :", ["S’arrêter devant la demi-barrière et attendre le passage du train.", "Attendre que la demi-barrière s’élève et que le feu rouge s’éteigne avant de démarrer.", "Pouvoir se faufiler entre les demi-barrières pour partir après le passage du train."]),
  question(36, ["A", "B", "C"], ["C"], "Sur cette image PN3, les véhicules rouge et bleu doivent :", ["Passer.", "Attendre devant le premier panneau de signalisation et passer après l’avion.", "Attendre devant le deuxième panneau de signalisation et ne passer qu’après l’extinction du feu."]),
  question(37, ["A", "B", "C"], ["B"], "Sur cette image PN1, le véhicule bleu se situe à :", ["150 m environ du passage à niveau.", "100 m environ du passage à niveau.", "50 m environ du passage à niveau."]),
  question(38, ["A", "B", "C"], ["B", "C"], "Sur une route où il y a un panneau STOP, l’arrêt se fait :", ["Exactement devant le panneau.", "À la limite de la visibilité en l’absence de ligne blanche au sol.", "Si à la ligne blanche, la visibilité est insuffisante, on marque un second arrêt à la limite de la chaussée abordée."]),
  question(39, ["A", "B"], ["B"], "À cette intersection I11, quel sera l’ordre de passage ?", ["La moto ; le véhicule jaune ensuite ; le véhicule rouge après.", "Le véhicule jaune ; le véhicule rouge ensuite ; la moto après."]),
  question(40, ["A", "B", "C"], ["B"], "À cette intersection I12, quel est le véhicule qui passera définitivement le premier ?", ["Le véhicule rouge.", "Le véhicule bleu.", "Le véhicule vert."]),
  question(41, ["A", "B"], ["B"], "À cette intersection I24, quel sera l’ordre de passage ?", ["Le véhicule bleu ; le véhicule rouge ensuite ; le véhicule vert après.", "Le véhicule vert ; le véhicule bleu ensuite ; le véhicule rouge après."]),
  question(42, ["A", "B", "C", "D"], ["C"], "À cette intersection I26, quel est le véhicule qui passera le premier ?", ["Le véhicule vert.", "Le véhicule jaune.", "Le véhicule rouge.", "Le véhicule bleu."]),
  question(43, ["A", "B", "C"], ["A"], "Quel panneau verra le véhicule jaune à cette intersection I3 ?", ["Panneau d’intersection de deux routes de même nature.", "Panneau indiquant le caractère prioritaire d’une route.", "Aucun panneau."]),
  question(44, ["A", "B", "C"], ["C"], "À cette intersection I14, quel est le véhicule qui passera définitivement le premier ?", ["Le véhicule bleu.", "Le véhicule rouge.", "Le véhicule jaune."]),
  question(45, ["A", "B"], ["B"], "À cette intersection I1, quel sera l’ordre de passage ?", ["Le véhicule vert ; le véhicule rouge ensuite ; le véhicule orange après.", "Le véhicule rouge ; les véhicules vert et orange passent simultanément."]),
  question(46, ["A", "B"], ["B"], "À cette intersection I5, quel sera l’ordre de passage ?", ["Le véhicule vert marque un arrêt ; les véhicules rouge et jaune passent ensuite ; enfin le véhicule vert passe.", "Le véhicule rouge passe ; le véhicule vert passe ; le véhicule jaune passe après."]),
  question(47, ["A", "B", "C"], ["C"], "À cette intersection I14, quel sera l’ordre de passage ?", ["Le véhicule bleu passe ; le véhicule jaune passe ensuite ; enfin le véhicule rouge passe.", "Le véhicule bleu démarre, fait un quart de tour et s’arrête ; le véhicule rouge passe ; le véhicule bleu passe ensuite ; enfin le véhicule jaune passe.", "Le véhicule bleu démarre, fait un quart de tour et s’arrête ; le véhicule jaune passe ; le véhicule rouge passe ensuite ; enfin le véhicule bleu passe."]),
  question(48, ["A", "B", "C"], ["B"], "À cette intersection I23, quel sera l’ordre de passage ?", ["Les véhicules orange et rouge passent ; les véhicules jaune et bleu passent après.", "Les véhicules jaune et bleu s’arrêtent ; les véhicules orange et rouge passent ; le véhicule bleu tourne ; le véhicule jaune passe au feu vert.", "Le véhicule bleu tourne ; les véhicules orange et rouge passent ; le véhicule jaune passe au feu vert."]),
  question(49, ["A", "B"], ["B"], "À cette intersection I26, quel sera l’ordre de passage ?", ["Les véhicules jaune et vert passent ; le véhicule bleu et le véhicule rouge marquent un arrêt.", "Les véhicules jaune, bleu et vert marquent un arrêt ; le véhicule rouge passe ; les véhicules qui auront le feu vert passeront après le véhicule rouge."]),
  question(50, ["A", "B", "C", "D"], ["B", "C"], "Quel panneau le conducteur du véhicule vert peut rencontrer à cette intersection I15 ?", ["Panneau d’intersection de deux routes de même nature.", "Panneau d’intersection d’une route à grande circulation et d’une route secondaire.", "Panneau indiquant le caractère prioritaire d’une route.", "Panneau indiquant la fin du caractère prioritaire d’une route."]),
  question(51, ["A", "B", "C"], ["A"], "À cette intersection I23, quel est le véhicule qui passera le dernier ?", ["Le véhicule jaune.", "Le véhicule bleu.", "Les véhicules jaune et bleu."]),
  question(62, ["A", "B", "C"], ["A"], "Citez deux cas d’interdiction de dépasser :", ["Devant un panneau interdisant de dépasser et sur une ligne continue.", "Devant un panneau interdisant de dépasser et sur une ligne discontinue.", "Sur des lignes mixtes dont la ligne discontinue se trouve du côté du conducteur."]),
  question(63, ["A", "B", "C"], ["A"], "Sur une chaussée à 3 voies et à double sens, on utilise, pour dépasser :", ["La voie centrale.", "La voie la plus à gauche.", "La voie la plus à droite."]),
  question(64, ["A", "B", "C"], ["B"], "Donner l’écart latéral minimal entre deux véhicules automobiles lors d’un dépassement :", ["1 m environ.", "0,50 m environ.", "0,3 m environ."]),
  question(65, ["A", "B", "C"], ["A"], "Donner l’écart minimal à observer par un automobiliste qui dépasse un piéton ou un cycliste en agglomération :", ["1 m environ.", "0,5 m environ.", "2 m environ."]),
  question(66, ["A", "B", "C", "D"], ["C"], "Quel doit être votre comportement quand un usager s’apprête à vous dépasser ?", ["Je serre ma gauche.", "J’occupe l’axe médian de la chaussée.", "Je serre ma droite.", "Je ralentis."]),
  question(67, ["A", "B", "C", "D"], ["B", "C", "D"], "À la vue de ce panneau B3 je peux dépasser :", ["Tous véhicules à moteur qui me précèdent.", "Un motocycliste sans side-car.", "Un véhicule à traction animale.", "Un cyclomotoriste sans side-car."]),
  question(68, ["A", "B", "C"], ["B"], "À la vue du panneau B3 :", ["J’accélère et je passe.", "Je ne dois pas dépasser.", "Je dois dépasser par la droite."]),
  question(69, ["A", "B", "C", "D", "E"], ["A", "C", "D"], "Dans quels cas doit-on utiliser les clignotants ?", ["Lorsqu’on veut s’insérer dans la circulation.", "Lorsqu’on veut augmenter ou réduire sa vitesse.", "Lorsqu’on veut dépasser ou se rabattre.", "Lorsqu’on veut changer de direction.", "Lorsqu’on veut croiser."]),
  question(70, ["A", "B", "C", "D"], ["A", "C", "D"], "Dans quels cas utilise-t-on ses feux de route ?", ["En agglomération dans une rue non éclairée.", "Lorsqu’on va croiser un autre usager.", "Lorsqu’on ne risque d’éblouir personne.", "Lorsqu’on quitte une zone éclairée pour une zone sombre."]),
  question(71, ["A", "B", "C", "D"], ["D"], "En rase campagne le dépassement est autorisé :", ["À proximité des intersections.", "Au sommet de côte.", "Dans les virages.", "Rien de tout ce qui précède."]),
  question(72, ["A", "B", "C"], ["B"], "Pour effectuer un dépassement :", ["J’avertis, je contrôle, puis je déboîte.", "Je contrôle, j’avertis et je déboîte.", "Je déboîte, j’avertis, je contrôle."]),
  question(73, ["A", "B", "C"], ["B"], "Lors du dépassement d’un véhicule la nuit, je mets les feux de route :", ["Immédiatement après avoir déboîté.", "En arrivant à la hauteur du conducteur du véhicule à dépasser.", "Tout de suite après m’être rabattu."]),
  question(74, ["A", "B", "C"], ["A"], "Comment prévenir l’usager à dépasser le jour ?", ["Par des appels sonores.", "Par des appels lumineux.", "Par le clignotant."]),
  question(75, ["A", "B", "C"], ["B"], "Comment prévenir l’usager à dépasser la nuit ?", ["Par des appels sonores.", "Par des appels lumineux.", "Par le clignotant."]),
  question(76, ["A", "B", "C"], ["B", "C"], "À une intersection de deux routes de même nature peut-on dépasser par la gauche ?", ["On peut effectuer rapidement le dépassement.", "On ne peut pas effectuer le dépassement.", "On le peut si le véhicule qui me précède signale son intention de tourner à droite."]),
  question(77, ["A", "B", "C"], ["C"], "Au sommet d’une côte :", ["Je peux dépasser si ma voiture a une réserve d’accélération suffisante.", "Je peux dépasser à la hauteur d’une ligne continue.", "Je ne peux pas dépasser."]),
  question(78, ["A", "B", "C"], ["C"], "Sur une chaussée à double sens comportant trois voies :", ["Je suis autorisé à dépasser en troisième position lorsqu’aucun usager ne vient en face.", "Je suis autorisé à dépasser en troisième position lorsque je juge suffisante la largeur de la chaussée.", "Je ne suis pas autorisé à dépasser en troisième position."]),
  question(79, ["A", "B", "C", "D"], ["C"], "Au niveau des flèches de rabattement :", ["Je suis autorisé à dépasser lorsqu’aucun usager ne vient en face.", "Je suis autorisé à dépasser lorsque je juge la largeur de la chaussée suffisante.", "Je ne suis pas autorisé à dépasser.", "Je suis autorisé si l’usager devant moi est trop lent."]),
  question(80, ["A", "B", "C"], ["B"], "Au niveau d’une ligne continue accolée à une ligne discontinue plus proche du conducteur, peut-on effectuer le dépassement ?", ["On ne peut pas effectuer le dépassement.", "On peut effectuer le dépassement.", "On ne peut pas effectuer le dépassement la nuit."]),
  question(81, ["A", "B", "C", "D"], ["D"], "À quel passage à niveau le dépassement est-il autorisé ?", ["À un passage à niveau sans barrière.", "À un passage à niveau avec barrière à fonctionnement manuel.", "À un passage à niveau avec barrière à fonctionnement automatique.", "À aucun passage à niveau."]),
  question(82, ["A", "B", "C", "D"], ["A", "D"], "Sur cette image D9 :", ["Le véhicule bleu est en infraction.", "Le véhicule bleu effectue une bonne manœuvre.", "Le véhicule bleu n’est pas en infraction.", "Le véhicule bleu effectue une mauvaise manœuvre."]),
  question(83, ["A", "B", "C", "D"], ["A", "D"], "Sur cette chaussée D10 à trois voies et à double sens de circulation :", ["Le véhicule jaune est en infraction.", "Le véhicule jaune n’est pas en infraction.", "Le véhicule jaune effectue une bonne manœuvre.", "Le véhicule jaune effectue une mauvaise manœuvre."]),
  question(84, ["A", "B", "C", "D"], ["A", "B"], "Sur cette image D11 :", ["Le véhicule jaune effectue une bonne manœuvre.", "Le véhicule jaune n’est pas en infraction.", "Le véhicule jaune effectue une mauvaise manœuvre.", "Le véhicule jaune est en infraction."]),
  question(85, ["A", "B", "C", "D"], ["B", "C"], "Sur cette image D12 :", ["Le véhicule vert est en infraction.", "Le véhicule vert effectue une bonne manœuvre.", "Le véhicule vert n’est pas en infraction.", "Le véhicule vert effectue une mauvaise manœuvre."]),
  question(86, ["A", "B", "C", "D"], ["C", "D"], "Sur cette chaussée D13 à quatre voies et à double sens de circulation :", ["Le véhicule vert n’est pas en infraction.", "Le véhicule vert effectue une bonne manœuvre.", "Le véhicule vert effectue une mauvaise manœuvre.", "Le véhicule vert est en infraction."]),
  question(87, ["A", "B", "C", "D"], ["A", "B"], "Sur cette chaussée D13 à quatre voies et à sens unique :", ["Le véhicule vert n’est pas en infraction.", "Le véhicule vert effectue une bonne manœuvre.", "Le véhicule vert effectue une mauvaise manœuvre.", "Le véhicule vert est en infraction."]),
  question(88, ["A", "B", "C", "D"], ["A", "C"], "Sur cette image D9 :", ["Le véhicule bleu est en infraction.", "Le véhicule bleu n’est pas en infraction.", "Le véhicule bleu effectue une mauvaise manœuvre.", "Le véhicule bleu effectue une bonne manœuvre."]),
  question(89, ["A", "B", "C", "D"], ["B", "D"], "Sur cette chaussée D10 à trois voies et à sens unique de circulation :", ["Le véhicule jaune est en infraction.", "Le véhicule jaune effectue une bonne manœuvre.", "Le véhicule jaune effectue une mauvaise manœuvre.", "Le véhicule jaune n’est pas en infraction."]),
  question(90, ["A", "B", "C", "D"], ["B", "C"], "Sur cette image D4 :", ["Le véhicule bleu est en infraction.", "Le véhicule bleu n’est pas en infraction.", "Le véhicule bleu effectue une bonne manœuvre.", "Le véhicule bleu effectue une mauvaise manœuvre."]),
  question(91, ["A", "B", "C"], ["A"], "Sur une chaussée à plus de deux voies et à double sens de circulation, le dépassement est interdit :", ["Sur la voie se trouvant la plus à gauche.", "Sur la voie du milieu.", "Sur toutes les voies."]),
  question(92, ["A", "B", "C"], ["A"], "Sur une chaussée à deux voies et à double sens, je peux circuler :", ["Sur la voie de gauche pour effectuer un dépassement.", "Sur la voie de gauche de façon continue.", "Sur la voie de droite seulement."]),
  question(93, ["A", "B", "C", "D"], ["B"], "Le franchissement ou le chevauchement de la ligne continue est autorisé :", ["À tout moment.", "À aucun moment.", "Pour effectuer un dépassement.", "Lorsque la chaussée est libre."]),
  question(94, ["A", "B", "C"], ["C"], "Vous circulez par temps de grand vent ; pour dépasser un autre usager :", ["Vous diminuez l’écart latéral.", "Vous maintenez l’écart latéral.", "Vous augmentez l’écart latéral."]),
  question(95, ["A", "B", "C"], ["B", "C"], "Pour effectuer un croisement, je dois :", ["Accélérer.", "Ralentir.", "Serrer ma droite."]),
  question(96, ["A", "B", "C", "D"], ["C"], "Pour effectuer un croisement la nuit, je dois :", ["Klaxonner.", "Circuler en phare.", "Circuler en code.", "Circuler en feux de détresse."]),
  question(97, ["A", "B", "C"], ["B"], "Quel est le véhicule qui doit s’arrêter à temps à cause d’un croisement difficile sur un terrain plat ?", ["Le véhicule léger.", "Le véhicule encombrant.", "Le véhicule qui veut."]),
  question(98, ["A", "B", "C"], ["B"], "Sur une pente, quel est le véhicule qui doit s’arrêter à temps à cause d’un croisement difficile ?", ["Le véhicule montant.", "Le véhicule descendant.", "Le véhicule qui le désire."]),
  question(99, ["A", "B", "C"], ["C"], "En agglomération, quel est le véhicule qui doit s’arrêter à temps à cause d’un croisement difficile ?", ["L’autobus.", "Le véhicule qui le désire.", "Le camion."]),
  question(100, ["A", "B", "C"], ["B"], "Lorsque deux véhicules de même catégorie se retrouvent sur une pente, lequel doit faire la marche arrière à cause d’un croisement difficile ?", ["Le véhicule montant.", "Le véhicule descendant.", "Le véhicule qui veut."]),
  question(101, ["A", "B", "C"], ["A", "B"], "Dans quels cas dois-je m’arrêter pour laisser passer l’usager venant en sens inverse ?", ["Devant le panneau « chaussée rétrécie » et un obstacle devant moi.", "Devant le panneau « cédez le passage » aux usagers venant en sens inverse et devant un panneau « chaussée rétrécie ».", "Devant le panneau sens interdit et un obstacle devant moi."]),
  question(102, ["A", "B", "C"], ["B"], "Sur une pente, quel est le véhicule qui doit faciliter le passage lors d’un croisement difficile ?", ["L’autobus chargé.", "Le camion.", "Le véhicule qui le désire."]),
  question(103, ["A", "B", "C"], ["A"], "Sur une pente, quel est le véhicule qui doit faire la marche arrière à cause d’un croisement difficile ?", ["Le véhicule isolé.", "Le véhicule articulé.", "Le véhicule qui veut."]),
  question(104, ["A", "B", "C", "D"], ["A"], "La nuit, pour éviter d’être ébloui :", ["Je regarde le bord droit de la chaussée.", "Je ferme les yeux pendant un court instant.", "Je porte des verres teintés.", "J’allume mes feux de route."]),
  question(105, ["A", "B", "C", "D", "E"], ["D"], "L’écart minimal de vitesse recommandé pour un véhicule qui veut effectuer le dépassement est de :", ["30 km/h.", "25 km/h.", "40 km/h.", "20 km/h.", "10 km/h."]),
  question(106, ["A", "B", "C"], ["A"], "Sur une chaussée à forte déclivité, quel est le véhicule qui doit s’arrêter à temps lorsque le croisement se révèle difficile ?", ["Le véhicule descendant.", "Le véhicule qui le désire.", "Le véhicule montant."]),
  question(107, ["A", "B", "C"], ["A", "C"], "Je laisse passer l’usager d’en face en m’arrêtant :", ["Quand se dresse un obstacle devant moi.", "Devant un panneau de circulation à sens unique.", "Quand je suis au volant d’un véhicule encombrant."]),
  question(108, ["A", "B", "C", "D", "E"], ["A", "B", "D", "E"], "Quel doit être mon comportement lorsqu’un usager manifeste son intention de me dépasser ?", ["Je ne l’empêche pas si la manœuvre est régulière.", "Je serre ma droite le plus possible.", "J’accélère.", "Je maintiens mon allure et, au besoin je ralentis.", "La nuit, je passe en feu de croisement quand il arrive à ma hauteur."]),
  question(109, ["A", "B", "C", "D", "E"], ["B", "C", "D", "E"], "Dans quels cas devez-vous céder le passage de gauche comme de droite ?", ["Devant le feu vert ou jaune clignotant.", "Devant le feu rouge.", "Devant le panneau « STOP ».", "Devant le panneau « Triangle pointe en bas ».", "En sortant d’un chemin de terre, d’un garage ou d’un parking."]),
  question(110, ["A", "B", "C", "D", "E"], ["A", "B"], "Hors agglomération, le panneau à caractère prioritaire est répété :", ["Tous les 5 km.", "Après chaque intersection.", "Tous les 2 km.", "Après chaque virage.", "Tous les kilomètres."]),
  question(111, ["A", "B", "C", "D", "E"], ["E"], "En agglomération, le panneau à caractère prioritaire est répété :", ["Tous les 5 km.", "Après chaque intersection.", "Tous les 2 km.", "Après chaque virage.", "Tous les kilomètres."]),
  question(112, ["A", "B", "C"], ["A"], "Quel est le but des ronds-points ?", ["Faciliter l’écoulement des trafics.", "Briser les vitesses.", "Permettre le stationnement des véhicules."]),
  question(113, ["A", "B", "C"], ["A", "B", "C"], "À quoi peut-on s’attendre lors d’un croisement ou dépassement d’un véhicule à deux roues ?", ["Au non respect des signaux.", "Au non respect des règles de priorité.", "À des écarts sans avertissement et sans contrôle."]),
  question(114, ["A", "B", "C"], ["C"], "À cette intersection, l’usager se trouvant dans la voie du milieu peut :", ["Tourner à droite.", "Tourner à gauche.", "Continuer tout droit."]),
  question(115, ["A", "B", "C"], ["B"], "À cette intersection, le véhicule bleu passe :", ["Avant le véhicule blanc.", "Après le véhicule blanc.", "Le dernier."]),
  question(116, ["A", "B", "C"], ["B"], "À cette intersection, quel est le véhicule qui passe le premier ?", ["Le rouge.", "Le jaune.", "Le bleu."]),
  question(117, ["A", "B", "C"], ["B"], "À cette intersection, quel est le véhicule qui peut passer immédiatement ?", ["Le bleu.", "Le jaune.", "Le vert."]),
  question(118, ["A", "B", "C"], ["A"], "À cette intersection, le véhicule vert :", ["Peut tourner immédiatement à droite.", "Peut continuer tout droit.", "Ne peut pas tourner immédiatement à droite."]),
  question(119, ["A", "B", "C"], ["C"], "Pour me rabattre à droite après un dépassement, j’attends :", ["De ne plus voir le véhicule par la vitre latérale droite.", "De voir le véhicule dans mon rétroviseur droit.", "De voir le véhicule dans mon rétroviseur intérieur."]),
  question(120, ["A", "B", "C"], ["A", "C"], "La force centrifuge augmente proportionnellement :", ["Avec la vitesse.", "Avec le rayon de la courbe.", "Avec la charge du véhicule."]),
  question(121, ["A", "B", "C"], ["A", "C"], "À l’approche d’une intersection, sur une route à caractère prioritaire :", ["Je peux dépasser un véhicule.", "Je ne peux pas dépasser un véhicule.", "Je ne peux pas dépasser lorsqu’il y a un marquage au sol l’interdisant."]),
  question(122, ["A", "B", "C"], ["A", "B"], "Je suis sur une route à caractère prioritaire ; je n’ai pas à céder le passage :", ["À droite aux intersections.", "À gauche aux intersections.", "À la prochaine intersection seulement."]),
  question(123, ["A", "B", "C"], ["A"], "Pour ma sécurité et celle des autres, je dois circuler :", ["À droite dans ma voie.", "Au milieu de ma voie.", "À gauche dans ma voie."]),
  question(124, ["A", "B"], ["B"], "Dans un croisement à l’indonésienne, les véhicules se croisent :", ["Par la droite.", "Par la gauche."]),
  question(125, ["A", "B", "C", "D"], ["B"], "À une intersection sans signalisation, je dois céder le passage :", ["À gauche seulement.", "À droite seulement.", "À droite et à gauche.", "À aucun usager."]),
  question(126, ["A", "B", "C", "D"], ["B"], "En montagne, sur une route étroite, celui qui doit s’arrêter est :", ["Le véhicule qui monte.", "Le véhicule qui descend.", "Le véhicule le plus chargé.", "Le véhicule le moins chargé."]),
  question(127, ["A", "B", "C"], ["B"], "Dans une longue et forte descente :", ["Je freine en permanence pour ne pas prendre de vitesse.", "Je freine au début pour rétrograder et utiliser le frein moteur.", "Dans les lignes droites, je mets le levier de vitesse au point mort pour consommer moins de carburant."]),
  question(128, ["A", "B", "C"], ["A"], "Sur cette image quel est l’ordre de passage des voitures ?", ["Rouge d’abord, bleue ensuite et enfin verte.", "Bleue d’abord, puis verte et rouge simultanément.", "Verte d’abord, bleue ensuite et rouge en fin."]),
  question(129, ["A", "B", "C", "D", "E"], ["C", "D"], "Donnez la règle à appliquer et l’ordre de passage des véhicules :", ["Perte de priorité.", "Priorité de passage.", "Priorité à droite.", "Rouge, bleu, jaune.", "Bleu, jaune, rouge."]),
  question(130, ["A", "B", "C", "D", "E"], ["B", "C", "D"], "Sur cette image, donnez les règles à appliquer et l’ordre de passage des véhicules :", ["Priorité à droite.", "Perte de priorité.", "Priorité de passage.", "Jaune et bleu simultanément, puis rouge.", "Rouge, jaune, bleu."]),
  question(131, ["A", "B", "C", "D", "E"], ["A", "D"], "Sur cette image, donnez les règles à appliquer et l’ordre de passage des véhicules :", ["Priorité à droite.", "Priorité de passage.", "Perte de priorité.", "Jaune, bleu, rouge.", "Bleu, rouge, jaune."]),
  question(132, ["A", "B", "C", "D", "E"], ["A", "B", "D"], "Sur cette image, donnez les règles à appliquer et l’ordre de passage des véhicules :", ["Perte de priorité.", "Priorité de passage.", "Courtoisie.", "Jaune et rouge simultanément, puis bleu et blanc après.", "Bleu et blanc simultanément puis rouge et jaune après."]),
  question(133, ["A", "B", "C", "D", "E"], ["A", "C", "E"], "Sur cette image, donnez les règles à appliquer et l’ordre de passage des véhicules :", ["Perte de priorité.", "Priorité à droite.", "Priorité de passage.", "Bleu, rouge, jaune.", "Bleu et jaune simultanément, puis rouge après."]),
  question(134, ["A", "B", "C", "D", "E"], ["B", "C", "D"], "Sur cette image, donnez les règles à appliquer et l’ordre de passage des véhicules :", ["Priorité à droite.", "Priorité de passage.", "Perte de priorité.", "Rouge d’abord, puis bleu et jaune après.", "Bleu, rouge et jaune."]),
  question(135, ["A", "B", "C", "D", "E"], ["A", "B", "E"], "Sur cette image, donnez les règles à appliquer et l’ordre de passage des véhicules :", ["Perte de priorité.", "Priorité de passage.", "La priorité à droite.", "Bleu, jaune, rouge.", "Bleu et rouge simultanément, puis jaune après."]),
  question(136, ["A", "B", "C", "D", "E"], ["A"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(137, ["A", "B", "C", "D", "E"], ["B"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(138, ["A", "B", "C", "D"], ["B"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(139, ["A", "B", "C", "D", "E"], ["E"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(140, ["A", "B", "C", "D", "E"], ["E"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(141, ["A", "B", "C", "D", "E"], ["C"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(142, ["A", "B", "C", "D", "E"], ["B"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(143, ["A", "B", "C", "D"], ["B"], "Sur cette image, choisissez le panneau manquant parmi les panneaux proposés.", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(144, ["A", "B", "C", "D"], ["A", "B", "D"], "Sur cette image :", ["Nous sommes en présence d’une ligne d’avertissement.", "Le véhicule bleu peut dépasser.", "Le véhicule rouge peut s’arrêter sur la chaussée.", "La ligne de rive peut être franchie."]),
  question(145, ["A", "B", "C"], ["A"], "Sur cette image, quelle est la position de l’agent qui vous autorise le passage ?", ["(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(146, ["A", "B", "C"], ["B"], "Quel est l’ordre de passage des véhicules à cette intersection ?", ["Rouge, jaune, bleu, blanc.", "Rouge et bleu simultanément, puis blanc et jaune sur ordre de l’agent.", "Jaune et blanc simultanément, puis bleu et rouge sur ordre de l’agent."]),
  question(147, ["A", "B", "C"], ["C"], "À cette intersection, quel sera l’ordre de passage des véhicules ?", ["Rouge, bleu, jaune, vert.", "Bleu et rouge simultanément, puis bleu et vert au feu vert.", "Bleu et vert simultanément, puis rouge et jaune sur l’ordre de l’agent."]),
  question(148, ["A", "B", "C"], ["B"], "Sur cette image, que signifie le geste de l’agent numéro 1 ?", ["Passer rapidement.", "Ralentir.", "S’arrêter."]),
  question(149, ["A", "B", "C"], ["B"], "Sur cette image, que signifie le geste de l’agent numéro 2 ?", ["Passer rapidement.", "Ralentir.", "S’arrêter."]),
  question(150, ["A", "B", "C"], ["C"], "Sur cette image, que signifie la position de l’agent numéro 3 ?", ["Passer rapidement.", "Ralentir.", "S’arrêter."]),
  question(151, ["A", "B", "C"], ["C"], "À cette intersection, quel sera l’ordre de passage des véhicules ?", ["Jaune, rouge, bleu.", "Bleu et jaune simultanément, puis rouge dès que la chaussée abordée par lui sera libre.", "Rouge, puis jaune et bleu sur l’ordre de l’agent."]),
  question(152, ["A", "B", "C"], ["C"], "À cette image quel sera l’ordre de passage des véhicules ?", ["Vert et jaune, puis rouge et bleu.", "Rouge et bleu, puis le jaune et vert.", "Vert et jaune, puis rouge et bleu sur ordre de l’agent."]),
  question(153, ["A", "B", "C"], ["A"], "Sur cette image quel est l’ordre de passage des voitures :", ["Rouge et jaune simultanément, puis bleue au feu vert.", "Bleue puis rouge et jaune simultanément.", "Jaune d’abord, bleue ensuite et enfin rouge."]),
  question(154, ["A", "B", "C"], ["A"], "Lorsque les véhicules que je croise roulent en feux de croisement, je prévois que je peux rencontrer :", ["Une zone d’intempéries.", "Un contrôle de vitesse.", "Un contrôle routier."]),
]
