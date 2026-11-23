/**
 * Banque questions en dur — Chapitre 5.
 * Audio : /content/code-audio/chapitre-5/{n}.mp3
 * Images : /content/code-images/chapitre-5/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_05_KEY = 'chapitre-5'
export const CHAPITRE_05_ORDER = 5

/** Détecte un chapitre Mongo correspondant au chapitre 5 figé. */
export function matchesChapitre05(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_05_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*5\b/i.test(name) || /^5([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-5/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-5/${n}.png`
}

/** Images disponibles (N.png = question N), dans server/content/code-images/chapitre-5/. */
const QUESTIONS_WITH_IMAGES = new Set([119])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch5-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch5-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_05_KEY,
    chapterOrder: CHAPITRE_05_ORDER,
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
 * 138 questions — chapitre 5 (comportement, secours, alcool, conduite). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 507 (manuel 508 à 645).
 * Audios et images servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_05_QUESTIONS = [
  question(1, ["A", "B", "C"], ["C"], "Sur les lignes hachurées appelées zébras :", ["Je peux stationner.", "Je peux circuler.", "Je ne peux ni circuler, ni stationner."]),
  question(2, ["A", "B", "C", "D"], ["A", "C", "D"], "On doit s’abstenir de conduire :", ["Si on est sous l’effet de boissons alcoolisées ou de médicaments.", "Si on vient de manger sans prendre de l’alcool.", "Si on est fatigué et somnolent.", "Si on se sent nerveux."]),
  question(3, ["A", "B", "C"], ["A"], "Dans quel cas utiliser les avertisseurs sonores ?", ["Pour avertir les autres usagers.", "Pour rechercher les passagers.", "Pour saluer les autres usagers."]),
  question(4, ["A", "B", "C", "D", "E"], ["A", "D", "E"], "À toute réquisition des forces de sécurité concernant mon véhicule je dois présenter :", ["La carte grise.", "Les papiers de dédouanement.", "Le papier d’achat.", "L’attestation d’assurance.", "La visite technique."]),
  question(5, ["A", "B", "C", "D"], ["A", "B", "D"], "Les règles de circulation doivent être respectées par :", ["Les motocyclistes.", "Les piétons.", "Les automobilistes seulement.", "Les automobilistes."]),
  question(6, ["A", "B", "C"], ["B"], "Quand je suis sur le point d’être dépassé, je dois :", ["Accélérer.", "Je serre ma droite sans accélérer.", "M’arrêter."]),
  question(7, ["A", "B", "C"], ["A", "B"], "Dans un véhicule à cinq places il y a infraction avec :", ["6 passagers adultes à bord.", "5 passagers adultes à bord.", "4 passagers adultes à bord."]),
  question(8, ["A", "B", "C", "D"], ["A"], "Une bonne conduite :", ["Nécessite une attention soutenue de ma part.", "M’oblige à rouler tantôt à gauche tantôt à droite.", "Me permet de tout regarder sur la route.", "M’oblige à éviter tous les trous."]),
  question(9, ["A", "B", "C"], ["B"], "Quel est l’intervalle minimum de sécurité entre deux véhicules qui se suivent et roulants à 50 km/h :", ["10 m environ.", "15 m environ.", "20 m environ."]),
  question(10, ["A", "B", "C", "D", "E"], ["B", "C", "D", "E"], "Les principaux facteurs d’accident sont :", ["Une bonne tenue de route.", "La fatigue.", "Le non respect des règles de circulation.", "La vitesse excessive ou non adaptée.", "La conduite dans un état d’ivresse."]),
  question(11, ["A", "B", "C"], ["C"], "En cas de traitement médical en cours et pour faire un long trajet, il est préférable :", ["De modifier le traitement médical.", "D’arrêter le traitement médical.", "De se renseigner auprès de son médecin."]),
  question(12, ["A", "B", "C"], ["B"], "Que dois-je faire en présence d’une flaque d’eau sur la chaussée ?", ["Accélérer.", "Ralentir.", "M’arrêter."]),
  question(13, ["A", "B", "C"], ["A"], "Quel serait votre comportement si le véhicule qui vous précède s’arrête subitement ?", ["Je m’arrête et j’apprécie la situation.", "Je dépasse rapidement le véhicule.", "Je klaxonne."]),
  question(14, ["A", "B", "C"], ["C"], "Dans un véhicule pour passagers, on peut transporter :", ["Des passagers et des marchandises.", "Des passagers et des animaux.", "Des passagers uniquement."]),
  question(15, ["A", "B", "C"], ["C"], "Au volant de son véhicule, passagers à bord, le conducteur :", ["Peut fumer.", "Peut discuter.", "Doit se concentrer sur la conduite."]),
  question(16, ["A", "B", "C"], ["C"], "En cas de crevaison, à défaut de cric et seul à bord de votre véhicule, vous pouvez :", ["Creuser la chaussée pour changer la roue crevée.", "Soulever le véhicule pour changer la roue crevée.", "Attendre d’autres usagers de la route pour solliciter leur aide."]),
  question(17, ["A", "B", "C"], ["B"], "En cas de panne sur la route et à défaut des triangles de présignalisation, je peux utiliser :", ["Des touffes d’herbes.", "Les feux de détresse.", "La roue-secours."]),
  question(18, ["A", "B", "C"], ["A"], "Lorsque les piétons sont engagés sur le passage clouté, je dois :", ["Leur céder le passage.", "Klaxonner pour les empêcher de traverser.", "Leur demander d’attendre mon passage."]),
  question(19, ["A", "B", "C", "D"], ["B"], "Parmi les véhicules suivants, lesquels sont prioritaires ?", ["Les corbillards.", "Les véhicules des sapeurs-pompiers en mission.", "Les ambulances.", "Les véhicules militaires."]),
  question(20, ["A", "B", "C"], ["A", "C"], "Parmi les véhicules suivants, lesquels peuvent emprunter un sens interdit ?", ["Les véhicules de police en mission.", "Les corbillards.", "Les véhicules de SAMU en mission."]),
  question(21, ["A", "B", "C"], ["B"], "Que dois-je faire à la vue d’une personne traversant ou s’apprêtant à s’engager sur la chaussée, canne blanche levée ?", ["Je passe rapidement.", "Je m’arrête pour la laisser passer.", "Je klaxonne."]),
  question(22, ["A", "B", "C", "D"], ["C", "D"], "Pour aider les enfants qui attendent pour traverser la rue :", ["Je m’arrête et leur adresse un signe de main.", "Je ralentis et me tiens prêt à freiner si ces enfants se décident.", "Je m’arrête si aucun véhicule ne vient en sens inverse.", "Je descends de ma voiture pour les aider à traverser."]),
  question(23, ["A", "B", "C", "D", "E"], ["A", "B", "C"], "Je dois m’abstenir de conduire :", ["Sous l’effet de boissons alcoolisées.", "Sous l’effet de la fatigue.", "En cas de visibilité insuffisante grave.", "En cas de chaussée rétrécie.", "En cas de défaillance du câble compteur."]),
  question(24, ["A", "B", "C", "D"], ["C", "D"], "Comment réagir quand le conducteur venant d’en face m’éblouit, malgré mes appels de feux ?", ["J’allume et je reste en feu de route.", "Je me protège les yeux avec la main.", "Je ralentis au maximum et je m’arrête au besoin.", "Je ralentis et je fixe le bord droit de la chaussée."]),
  question(25, ["A", "B", "C"], ["C"], "Quel est le comportement d’un usager sur un lieu d’accident ?", ["Alerter, secourir et protéger.", "Secourir, protéger et alerter.", "Protéger, alerter et secourir."]),
  question(26, ["A", "B", "C"], ["C"], "Pour éteindre un début d’incendie dans une voiture, j’utilise :", ["Le sable uniquement.", "L’eau.", "L’extincteur."]),
  question(27, ["A", "B", "C"], ["C"], "Pour baliser un lieu d’accident, j’utilise :", ["Des balises.", "Des branchages.", "Des triangles de présignalisation."]),
  question(28, ["A", "B", "C"], ["A"], "À quelle distance place-t-on ordinairement les triangles de présignalisation en cas de panne ?", ["À 30 m au moins.", "À 100 m au moins.", "À 200 m au moins."]),
  question(29, ["A", "B", "C", "D"], ["A", "B"], "À quelle catégorie d’agents avez-vous recours en cas d’accident en rase campagne ?", ["Les sapeurs-pompiers.", "Les gendarmes.", "Les douaniers.", "Les policiers."]),
  question(30, ["A", "B", "C", "D"], ["D"], "Quand le blessé d’un accident de circulation réclame à boire :", ["Je lui offre de l’eau.", "Je lui offre de l’alcool.", "Je lui offre du jus de fruit.", "Je ne lui donne rien."]),
  question(31, ["A", "B", "C"], ["A", "C"], "Quelles sont les causes qui peuvent être à l’origine de la mort d’un blessé avant l’arrivée des secours ?", ["L’hémorragie.", "La peur.", "L’asphyxie."]),
  question(32, ["A", "B", "C", "D", "E"], ["C", "D", "E"], "Comment arrêter l’hémorragie externe ?", ["En faisant un pansement alcoolisé.", "En plaçant un garrot à longue durée.", "En faisant un pansement compressif.", "En faisant une pression directe sur la plaie avec un linge propre plié.", "En appuyant sur les points de compression."]),
  question(33, ["A", "B", "C"], ["A"], "Comment reconnaître une personne asphyxiée ?", ["Par l’arrêt du mouvement du ventre et de la poitrine.", "Par l’arrêt du pouls.", "Par le mouvement du ventre et de la poitrine."]),
  question(34, ["A", "B", "C", "D", "E"], ["A", "B", "D"], "Comment réanimer une personne asphyxiée ?", ["En desserrant les vêtements de la victime.", "En pratiquant la respiration bouche à bouche après désobstruction des voies aériennes supérieures.", "En pratiquant la respiration bouche à nez sans désobstruction des voies aériennes supérieures.", "En mettant le blessé dans la Position Latérale de Sécurité (PLS).", "En lui donnant à boire."]),
  question(35, ["A", "B", "C"], ["C"], "Quels sont les signes qui apparaissent en cas d’entorse ?", ["Douleur, gonflement, mouvements impossibles.", "Douleur, saignement, mouvements possibles.", "Douleur, gonflement, mouvements possibles."]),
  question(36, ["A", "B", "C"], ["A"], "L’hémorragie est :", ["La sortie du sang hors des vaisseaux sanguins.", "Une mauvaise circulation du sang.", "Le passage du sang dans le cœur."]),
  question(37, ["A", "B", "C", "D"], ["A", "B", "C"], "Il y a hémorragie externe lorsque le sang s’écoule :", ["D’un orifice naturel.", "À l’extérieur du corps par une plaie.", "D’un orifice naturel ou à l’extérieur du corps par une plaie.", "À l’intérieur du corps."]),
  question(38, ["A", "B", "C"], ["B"], "Il y a hémorragie interne lorsque le sang s’écoule :", ["À l’extérieur du corps.", "À l’intérieur du corps hors des vaisseaux.", "À l’intérieur des vaisseaux."]),
  question(39, ["A", "B", "C"], ["B"], "En cas de brûlure grave par le feu, vêtements enflammés :", ["Je déshabille la victime avant de l’évacuer à l’hôpital.", "J’empêche la victime de courir, je l’enroule dans une couverture et je l’évacue à l’hôpital.", "Je l’arrose de l’extincteur."]),
  question(40, ["A", "B", "C"], ["A"], "En cas de brûlure par liquide bouillant ou par vapeur :", ["Je déshabille la victime, je la douche le plus vite possible et je la fais évacuer vers un centre médical.", "Je l’enroule de couverture.", "Je l’évacue sans rien faire."]),
  question(41, ["A", "B", "C"], ["A"], "En cas de projection de l’acide de la batterie dans l’œil d’un individu :", ["Je rince l’œil pendant au moins 10 minutes avec de l’eau courante et je mets une compresse, puis je l’évacue chez l’ophtalmologiste.", "J’instille de l’huile à frein sur l’œil.", "Je bande l’œil."]),
  question(42, ["A", "B", "C"], ["C"], "Pour effectuer le dégagement d’urgence d’un blessé de quelques mètres :", ["Je le roule par terre.", "Je le mets au dos.", "Je soulève légèrement sa tête, un aide le tire par les pieds en le glissant sur le sol dans l’axe du corps."]),
  question(43, ["A", "B", "C", "D"], ["D"], "Quelle est l’utilité de la Position Latérale de Sécurité (PLS) ?", ["Elle permet d’être couché sur le dos afin de bien respirer.", "Elle permet de rester assis pour empêcher le choc.", "Elle permet d’être couché à plat ventre.", "Elle permet à la victime d’être couché sur le côté, d’éviter la chute de la langue en arrière, l’encombrement des voies respiratoires par le sang, le vomissement et la mucosité."]),
  question(44, ["A", "B", "C", "D"], ["C"], "Quel est le but du massage cardiaque ?", ["Il permet au malade d’éviter le vertige.", "Il permet au malade de bien respirer.", "Il permet de réanimer une victime qui présente un arrêt circulatoire.", "Il permet d’arrêter une hémorragie interne."]),
  question(45, ["A", "B", "C"], ["C"], "Quand dit-on qu’il y a luxation ?", ["Lorsqu’il y a étirement ou déchirure des ligaments.", "Lorsqu’il y a cassure d’un os et qu’il est en contact avec l’extérieur.", "Lorsque les ligaments sont déchirés, l’articulation déboîtée."]),
  question(46, ["A", "B", "C"], ["C"], "Quand dit-on qu’il y a entorse ?", ["Lorsqu’il y a cassure d’un os sans saignement.", "Lorsque les ligaments sont déchirés, l’articulation déboîtée.", "Lorsqu’il y a étirement ou déchirure des ligaments, les surfaces articulaires restent en contact."]),
  question(47, ["A", "B", "C"], ["C"], "Pour le ramassage d’un blessé :", ["Je dois remuer le blessé et le mettre debout.", "Je dois mettre le blessé au dos.", "Je dois le remuer le moins possible et respecter le bloc tête-cou-tronc."]),
  question(48, ["A", "B", "C"], ["A"], "On appelle fracture :", ["La rupture brutale d’un os.", "La douleur d’un os.", "La sortie de l’os dans l’organisme."]),
  question(49, ["A", "B", "C"], ["C"], "Il y a fracture fermée lorsque :", ["Un os a un abcès.", "Un os est cassé et prend contact avec l’extérieur.", "Un os est cassé et ne prend pas contact avec l’extérieur."]),
  question(50, ["A", "B", "C"], ["C"], "Il y a fracture ouverte lorsque :", ["Un os est courbé.", "Un os est cassé et ne prend pas contact avec l’extérieur.", "Un os est cassé et prend contact avec l’extérieur."]),
  question(51, ["A", "B", "C", "D"], ["B"], "Quels peuvent être les signes révélateurs de fatigue au volant ?", ["Maux de dents, picotements gastriques, lourdeurs des pieds et des bras.", "Lourdeur de tête, picotement des yeux, lourdeurs des paupières.", "Maux d’estomac, picotements de la peau, crampes aux jambes.", "Faim, soif, vertige."]),
  question(52, ["A", "B", "C"], ["A"], "Secourir un accident de la route est-il obligatoire ?", ["Oui.", "Non.", "Facultatif."]),
  question(53, ["A", "B", "C"], ["C"], "Quel effet l’alcool produit-il sur un conducteur ?", ["Permet au conducteur de mieux voir.", "Permet au conducteur de respecter le code de la route.", "Réduit les facultés mentales et physiques du conducteur."]),
  question(54, ["A", "B", "C", "D"], ["D"], "Quel est le bon comportement d’un usager sur un lieu d’accident ?", ["Alerter, secourir et protéger.", "Secourir, protéger et alerter.", "Secourir, alerter et protéger.", "Rien de tout ce qui précède."]),
  question(55, ["A", "B", "C"], ["A", "B"], "Sur autoroute, je commets une infraction en m’insérant sur l’axe principal :", ["Si je fais ralentir un véhicule.", "Si j’oblige un usager à changer de voie.", "Si je cède le passage à un usager circulant sur l’axe principal."]),
  question(56, ["A", "B", "C"], ["A", "B"], "En cas d’accident sur autoroute je peux prévenir les secours :", ["À l’aide des bornes d’appel d’urgence placées tous les 2 km.", "À l’aide de mon téléphone portable en composant le numéro d’un service secours.", "Avec l’aide d’un autre usager."]),
  question(57, ["A", "B", "C"], ["B"], "Pour m’installer à mon poste de conduite, dans l’ordre :", ["Je mets la ceinture, je règle les rétroviseurs, puis le siège.", "Je règle le siège, puis les rétroviseurs et je mets la ceinture.", "Je règle les rétroviseurs, puis le siège et je mets la ceinture."]),
  question(58, ["A", "B", "C", "D"], ["A", "B", "C"], "Titulaire du permis de conduire de moins de 12 mois, je peux rouler à :", ["80 km/h.", "70 km/h.", "60 km/h.", "100 km/h."]),
  question(59, ["A", "B", "C", "D"], ["C"], "Le taux d’alcoolémie est :", ["Le degré de l’état d’ivresse.", "La quantité de bière dans le sang.", "La quantité d’alcool contenue dans un litre de sang.", "La quantité de vin contenu dans le sang."]),
  question(60, ["A", "B", "C", "D"], ["B", "D"], "Le dépistage de l’alcoolémie se fait par :", ["L’air expiré par la bouche.", "L’alcotest.", "La prise de sang.", "L’éthylotest."]),
  question(61, ["A", "B", "C", "D"], ["B", "C"], "Le dosage de l’alcoolémie se fait par :", ["L’alcooltest.", "Analyse de sang.", "Éthylomètre.", "Éthylotest."]),
  question(62, ["A", "B", "C"], ["B"], "Quelle est la bonne position des mains au volant d’un conducteur en marche normale, en considérant le volant comme le cadran d’une montre ?", ["11 h 05 mn.", "9 h 15 mn.", "7 h 25 mn."]),
  question(63, ["A", "B", "C", "D"], ["D"], "Au volant de mon véhicule je peux :", ["Recevoir un appel.", "Appeler un ami.", "Communiquer si mon portable est équipé d’un écouteur.", "Rien de tout ce qui précède."]),
  question(64, ["A", "B", "C", "D"], ["D"], "Au volant de mon véhicule je peux :", ["Manger.", "Boire.", "Fumer.", "Écouter la radio."]),
  question(65, ["A", "B", "C", "D"], ["B", "C"], "Dans une agglomération éclairée je peux circuler :", ["Sans feux.", "En feux de position.", "En feux de croisement.", "En feux de route."]),
  question(66, ["A", "B", "C"], ["A", "B"], "Je peux être condamné pour délit de fuite si je ne m’arrête pas après avoir :", ["Occasionné un accident matériel.", "Occasionné un accident corporel.", "Ignoré l’injonction d’un agent de force réglementant la circulation."]),
  question(67, ["A", "B", "C", "D"], ["A", "B", "C"], "La vigilance au volant est dégradée si :", ["Je téléphone.", "Je mange un sandwich.", "Je bavarde avec les passagers.", "Je me concentre à la conduite."]),
  question(68, ["A", "B", "C"], ["A", "B", "C"], "La consommation de la drogue peut provoquer :", ["Des effets d’ivresse.", "Une diminution du champ visuel.", "L’euphorie."]),
  question(69, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Que doit faire un conducteur impliqué dans un accident de circulation ?", ["Dégager la chaussée après marquage pour ne pas gêner la circulation.", "Avertir son assureur (compagnie d’assurance).", "Communiquer son identité (adresse) à toute personne impliquée dans l’accident.", "Rester calme et courtois."]),
  question(70, ["A", "B", "C", "D"], ["A", "B", "C"], "Quel doit être le comportement d’un conducteur vis-à-vis d’un véhicule prioritaire en mission ?", ["Céder le passage aux intersections.", "Céder le passage aux intersections munies de feux tricolores.", "Faciliter leurs manœuvres de croisement.", "Attendre l’ordre d’un agent réglementant la circulation."]),
  question(71, ["A", "B", "C"], ["A", "B", "C"], "Quels sont les signes évidents de la fatigue ?", ["Bâillement.", "Picotement des yeux.", "Somnolence."]),
  question(72, ["A", "B", "C", "D"], ["A", "B", "C"], "Quels sont les effets de la fatigue ?", ["Réaction tardive.", "Mauvaise analyse.", "Mauvaise appréciation des vitesses.", "L’impatience ou anxiété grandissante."]),
  question(73, ["A", "B", "C"], ["B", "C"], "Comment limiter la fatigue ?", ["Conduire sur une longue durée sans repos.", "Pendant le trajet se reposer régulièrement.", "Pratiquer l’alternance au volant."]),
  question(74, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Quelles sont les conditions nécessaires pour un déplacement sûr ?", ["Être en forme pour conduire.", "Avoir un véhicule en bon état de fonctionnement.", "Anticiper les situations critiques.", "Être courtois avec les autres usagers."]),
  question(75, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Quel comportement adopter pour une conduite économique ?", ["Choisir un bon style de conduite.", "Bien régler son moteur.", "Bon gonflage des pneus.", "Aérodynamisme bien adapté."]),
  question(76, ["A", "B", "C", "D", "E"], ["A", "B", "C", "D"], "Quel doit être le comportement d’un conducteur impliqué dans un accident de circulation ?", ["S’arrêter.", "Dégager la chaussée après marquage pour ne pas gêner la circulation.", "Avertir sa compagnie d’assurance.", "Communiquer son identité et son adresse à toute personne impliquée dans l’accident.", "Conduire le véhicule au poste de police le plus proche."]),
  question(77, ["A", "B", "C", "D"], ["A", "B", "C"], "L’alcool :", ["Diminue le champ de vision.", "Réduit la vigilance.", "Allonge le temps de réaction.", "Augmente le champ de vision."]),
  question(78, ["A", "B", "C"], ["A", "B"], "J’ai plus de risque de rencontrer du verglas si je circule :", ["En lisière d’une forêt.", "Le long d’un cours d’eau.", "À allure soutenue."]),
  question(79, ["A", "B", "C"], ["A", "B"], "Je dois allumer mes feux :", ["Dès que le jour tombe.", "Dès qu’il fait nuit.", "Dès qu’il commence par pleuvoir."]),
  question(80, ["A", "B", "C"], ["B"], "Pour stationner de nuit dans une rue non éclairée en agglomération, j’allume :", ["Mes feux de croisement.", "Mes feux de position.", "Aucun feu pour ne pas décharger ma batterie."]),
  question(81, ["A", "B", "C", "D"], ["A", "B", "D"], "L’absorption d’alcool entraîne une réduction :", ["Du champ visuel.", "Des capacités d’analyse.", "Du temps de réaction.", "Des habiletés motrices."]),
  question(82, ["A", "B", "C"], ["B"], "Les effets de l’alcool apparaissent à partir de :", ["0,3 g/l de sang.", "0,5 g/l de sang.", "1,2 g/l de sang."]),
  question(83, ["A", "B", "C"], ["C"], "Conduire avec une alcoolémie de 0,5 g/l de sang multiplie le risque d’avoir un accident mortel :", ["Par dix.", "Par cinq.", "Par deux."]),
  question(84, ["A", "B", "C"], ["B"], "Pour faire descendre un taux d’alcoolémie de 0,8 g/l de sang à 0,5 g/l, il faut en moyenne :", ["1 heure.", "2 heures.", "3 heures."]),
  question(85, ["A", "B", "C"], ["B", "C"], "L’association alcool et médicaments peut augmenter :", ["Le taux d’alcoolémie.", "Les effets de l’alcool.", "Le temps de réaction."]),
  question(86, ["A", "B", "C"], ["B"], "Lors d’un long trajet, il est conseillé de faire une pause d’au moins dix minutes :", ["Toutes les heures.", "Toutes les deux heures.", "Toutes les quatre heures."]),
  question(87, ["A", "B", "C"], ["B"], "L’alcoolémie atteint son maximum :", ["Immédiatement après absorption.", "Entre demi-heure et une heure après absorption.", "Après deux heures."]),
  question(88, ["A", "B", "C"], ["A", "B"], "La mesure exacte du taux d’alcoolémie est effectuée si :", ["Le dépistage est positif.", "Le conducteur refuse le dépistage.", "Le dépistage est négatif."]),
  question(89, ["A", "B", "C"], ["A"], "Le contrôle d’alcoolémie est systématique :", ["Si l’on est impliqué dans un accident corporel.", "Lors des contrôles routiers.", "Lors d’un accident."]),
  question(90, ["A", "B", "C", "D"], ["A", "B"], "Les conditions qui augmentent la fatigue sont :", ["Le manque de sommeil.", "La visibilité réduite.", "Une circulation fluide.", "La conduite de nuit."]),
  question(91, ["A", "B", "C"], ["B", "C"], "Pour retarder l’apparition de la fatigue, il faut :", ["Boire beaucoup de café.", "Être bien installé au volant.", "Prendre la route après un bon repos."]),
  question(92, ["A", "B", "C", "D"], ["A"], "En cas de fatigue, il faut :", ["Marquer une pause.", "Rouler plus lentement.", "Rouler plus vite pour maintenir la vigilance.", "Passer le volant à un passager."]),
  question(93, ["A", "B", "C"], ["A", "C"], "Lors d’un accident, s’il y a risque d’incendie :", ["Je débranche la batterie des véhicules.", "Je maintiens le contact des véhicules.", "Je coupe le contact des véhicules."]),
  question(94, ["A", "B", "C"], ["A", "B", "C"], "De nuit pour signaler un accident :", ["J’utilise les feux de mon véhicule.", "Je fais des signes avec une lampe de poche.", "Je place mes triangles de présignalisation."]),
  question(95, ["A", "B", "C"], ["B", "C"], "Lors d’un accident le règlement à l’amiable est :", ["Obligatoire.", "Facultatif.", "Recommandé."]),
  question(96, ["A", "B", "C"], ["A", "C"], "L’assurance minimum obligatoire :", ["Couvre les dommages occasionnés aux autres.", "Couvre les dégâts occasionnés aux véhicules seulement.", "Est aussi appelée assurance aux tiers."]),
  question(97, ["A", "B", "C", "D"], ["A", "D"], "Si je suis témoin d’un accident, je dois :", ["Exposer ce que j’ai vu aux forces de l’ordre.", "Remplir le contrat amiable.", "Déterminer les responsabilités.", "Laisser mes coordonnées pour un témoignage ultérieur."]),
  question(98, ["A", "B", "C", "D"], ["A", "B"], "En présence de blessés après un accident il faut :", ["Les couvrir.", "Pratiquer les gestes qui sauvent.", "Les faire boire pour éviter qu’ils ne se déshydratent.", "Les transporter sur l’accotement."]),
  question(99, ["A", "B", "C", "D"], ["A", "C", "D"], "Lors de l’alerte des secours, j’indique :", ["Le lieu précis de l’accident.", "Le numéro d’immatriculation des véhicules impliqués.", "Le nombre et le type de véhicules impliqués.", "Le nombre et l’état des blessés."]),
  question(100, ["A", "B", "C"], ["A"], "Protéger les lieux d’un accident, c’est :", ["Baliser les lieux pour éviter un autre accident.", "Dégager complètement la chaussée.", "Barrer complètement la voie aux autres véhicules."]),
  question(101, ["A", "B", "C"], ["A"], "Après avoir déplacé un blessé, je le mets allongé sur :", ["Le côté.", "Le dos.", "Le ventre."]),
  question(102, ["A", "B", "C"], ["B"], "Si mon véhicule est immobilisé dangereusement sur la chaussée, je le déplace de préférence :", ["En le poussant.", "En enclenchant la première ou la marche arrière et en actionnant le démarreur.", "En faisant appel à des secours."]),
  question(103, ["A", "B", "C"], ["B"], "La présence à bord d’une boîte d’ampoules et de fusibles de rechange est :", ["Obligatoire.", "Recommandée.", "Inutile."]),
  question(104, ["A", "B", "C"], ["A"], "Le réglage de la hauteur des faisceaux lumineux du véhicule :", ["Dépend de la charge du véhicule.", "Nécessite toujours l’intervention d’un spécialiste.", "Est effectué une fois pour toutes lors de la mise en circulation."]),
  question(105, ["A", "B", "C"], ["B"], "Pour remplir le réservoir de mon lave-glace, j’utilise de préférence :", ["De l’eau uniquement.", "Un produit détergent spécial.", "Un détergent ménager."]),
  question(106, ["A", "B", "C", "D"], ["A", "C"], "Je dois faire vérifier l’équilibrage des roues de mon véhicule :", ["Après un choc violent contre un trottoir.", "En cas d’usure anormale de mes pneus.", "Lorsque je ressens des vibrations au niveau du volant.", "Si mon véhicule se déporte au freinage."]),
  question(107, ["A", "B", "C"], ["B", "C"], "Parmi ces équipements, ceux qui déchargent le plus la batterie sont :", ["L’autoradio.", "Les feux.", "Le système de dégivrage de la lunette arrière."]),
  question(108, ["A", "B", "C", "D"], ["A", "B", "D"], "Pour économiser du carburant, il faut :", ["Faire entretenir régulièrement son véhicule.", "Éviter de rouler avec une galerie vide sur le toit.", "Rouler le plus souvent possible en sous régime.", "Avoir les pneus bien gonflés."]),
  question(109, ["A", "B", "C", "D"], ["A", "B", "D"], "Je dois faire vérifier le parallélisme des roues de mon véhicule :", ["Après un choc violent.", "En cas d’usure de mes pneus.", "Si je ressens des vibrations au niveau du volant.", "Si mon véhicule se déporte."]),
  question(110, ["A", "B", "C", "D"], ["A", "B", "D"], "L’installation au poste de conduite influence :", ["La vision.", "Le confort.", "La tenue de route.", "La manipulation des commandes."]),
  question(111, ["A", "B", "C"], ["A", "B", "C"], "Il est indispensable de regarder dans ses rétroviseurs avant de :", ["Modifier sa trajectoire.", "Activer ses clignotants.", "Modifier son allure."]),
  question(112, ["A", "B", "C"], ["A", "C"], "Les appels lumineux servent à signaler :", ["Une intention de dépasser.", "La présence de gendarmes.", "L’approche à une intersection la nuit."]),
  question(113, ["A", "B", "C"], ["A"], "Je peux utiliser l’avertisseur sonore pour :", ["Avertir de ma présence un usager qui ne me regarde pas.", "Signaler à un usager qu’il vient de commettre une faute.", "Passer lorsque j’ai la priorité."]),
  question(114, ["A", "B", "C"], ["B", "C"], "L’usage de l’avertisseur sonore est interdit :", ["La nuit, uniquement en agglomération.", "La nuit, en agglomération et hors agglomération.", "Le jour en agglomération sauf danger immédiat."]),
  question(115, ["A", "B", "C"], ["A", "B", "C"], "Avant de monter à bord ou de descendre de mon véhicule je dois :", ["M’assurer qu’il n’y a aucun risque.", "Contrôler que ma position ne gêne d’autres usagers.", "Tenir compte des mouvements des autres usagers."]),
  question(116, ["A", "B"], ["A"], "Lorsque la visibilité est réduite :", ["Je ralentis pour pouvoir m’arrêter le cas échéant.", "Je ne ralentis pas car cela n’améliore pas la visibilité."]),
  question(117, ["A", "B", "C"], ["B"], "Lors d’un démarrage (départ) en côte, il faut desserrer le frein à main :", ["Avant de commencer à embrayer.", "Dès que l’on a trouvé le point de patinage.", "Dès que l’on a fini d’embrayer."]),
  question(118, ["A", "B", "C"], ["B"], "Lors d’un arrêt en circulation, pour éviter de caler le moteur il faut :", ["Débrayer dès le début du freinage.", "Débrayer en fin de freinage seulement.", "Débrayer avant de freiner."]),
  question(119, ["A", "B", "C", "D"], ["B", "D"], "Les mains sur le volant sont placées correctement sur le dessin :", ["(voir l’image)", "(voir l’image)", "(voir l’image)", "(voir l’image)"]),
  question(120, ["A", "B", "C"], ["A", "B"], "La rétrogradation permet :", ["De ralentir le véhicule dans une descente.", "De repartir après un ralentissement.", "D’arrêter le véhicule en circulation."]),
  question(121, ["A", "B"], ["A"], "Le frein moteur intervient dès qu’on :", ["Lâche l’accélérateur.", "Appuie sur la pédale de frein."]),
  question(122, ["A", "B", "C"], ["A"], "À bord d’un véhicule de tourisme, pour effectuer une marche arrière, j’aurai une meilleure vision :", ["Si je me retourne bien.", "Si je me retourne peu.", "Si j’utilise mes 3 rétroviseurs."]),
  question(123, ["A", "B", "C"], ["A", "B"], "Il est dangereux d’effectuer un demi-tour :", ["Dans un virage.", "Lorsque la circulation est dense et rapide.", "Dans une rue sans issue."]),
  question(124, ["A", "B", "C", "D"], ["B", "C"], "La fatigue et la perte de vigilance sont accrues par :", ["Une vitesse modérée.", "La conduite de nuit.", "Une dette de sommeil.", "La prise de caféine."]),
  question(125, ["A", "B", "C"], ["C"], "Pendant l’arrêt au feu rouge :", ["Je peux rapidement prendre un appel téléphonique.", "Je peux rapidement passer un appel téléphonique avant le feu vert.", "Je ne dois pas toucher au téléphone."]),
  question(126, ["A", "B", "C", "D"], ["C"], "Au volant de mon véhicule, je peux utiliser mon téléphone portable :", ["Lorsque je me retrouve seul sur la chaussée.", "Lorsque je ne suis pas sur une route à grande circulation.", "Lorsque je suis équipé d’un kit oreillette en cas d’urgence.", "Lorsqu’il y a urgence."]),
  question(127, ["A", "B", "C"], ["A", "B"], "Au volant de mon véhicule, mon téléphone portable sonne :", ["J’arrête mon véhicule convenablement avant de toucher au téléphone.", "Je ne dois pas toucher au téléphone.", "Je prends le téléphone pour vérifier mon correspondant."]),
  question(128, ["A", "B", "C"], ["C"], "Je commets un délit de fuite si je ne m’arrête pas :", ["Lorsque je suis témoin d’un accident.", "Lorsqu’un agent de sécurité me fait signe de m’arrêter.", "Lorsque je suis impliqué dans un accident."]),
  question(129, ["A", "B", "C", "D", "E"], ["B", "C", "D"], "Je dois m’abstenir de conduire :", ["Si je prends un verre de jus de raisin.", "Si je suis sous l’effet de boissons alcoolisées ou de certains médicaments.", "Si je suis fatigué.", "Si je me sens nerveux ou surexcité.", "Après un bon sommeil."]),
  question(130, ["A", "B", "C", "D"], ["B"], "L’absorption d’alcool :", ["Permet de bien conduire.", "Augmente le temps de réaction.", "Permet de bien apprécier les distances.", "Augmente le champ visuel."]),
  question(131, ["A", "B", "C", "D"], ["C"], "On peut passer le feu rouge allumé à une intersection munie de feux tricolores :", ["Quand on s’y retrouve seul.", "Quand on s’y retrouve seul tard dans la nuit.", "À aucun moment.", "Si je veux tourner à droite."]),
  question(132, ["A", "B", "C"], ["C"], "Avant de me mettre au volant :", ["Je peux prendre de l’alcool.", "Je peux prendre de l’alcool sans me soûler.", "Je dois m’abstenir de prendre de l’alcool."]),
  question(133, ["A", "B", "C"], ["B"], "Je suis titulaire du permis de conduire :", ["Je peux conduire sans l’avoir sur moi.", "Je conduis toujours avec mon permis de conduire.", "Je peux conduire avec une photocopie légalisée de mon permis de conduire."]),
  question(134, ["A", "B", "C"], ["B"], "En cas de retrait de mon permis de conduire suite à une infraction ou à un accident, je dois :", ["Me présenter à la gendarmerie pour reprendre le permis de conduire.", "Me présenter au Centre National de Sécurité Routière pour les dispositions de reprise de mon permis de conduite.", "Me présenter au maire de la commune où l’accident a lieu pour le retrait de mon permis de conduire."]),
  question(135, ["A", "B", "C", "D"], ["A"], "La Commission Nationale de Retrait de Permis de Conduire est chargée :", ["D’auditionner le ou les mis en cause, de décider du retrait partiel ou définitif du permis de conduire et de sensibiliser.", "D’écouter simplement les conducteurs de véhicules impliqués dans les accidents.", "De décider du payement des dommages causés par l’accident survenu.", "De l’emprisonnement du conducteur impliqué dans un accident mortel."]),
  question(136, ["A", "B", "C", "D"], ["D"], "Après le retrait de mon permis de conduire suite à un accident, je peux :", ["Procéder au remplacement du permis de conduire.", "Demander le duplicata du permis de conduire.", "Continuer à conduire mon véhicule avec un certificat de perte.", "Rien de tout ce qui précède."]),
  question(137, ["A", "B", "C", "D"], ["D"], "Les travaux de la Commission Technique Spéciale de Retrait des permis de conduire sont organisés par :", ["La Direction Générale des Transports Terrestres.", "La Direction Générale des Travaux Publics.", "La Gendarmerie.", "Le Centre National de Sécurité Routière."]),
  question(138, ["A", "B", "C"], ["B"], "L’original du permis de conduire retiré par les Forces de Sécurité Publique suite à un accident est transmis :", ["Au parquet.", "Au Centre National de Sécurité Routière.", "À la Direction Générale des Transports Terrestres."]),
]
