/**
 * Banque questions en dur — Chapitre 12.
 * Audio : /content/code-audio/chapitre-12/{n}.mp3
 * Images : /content/code-images/chapitre-12/{n}.png
 * Mis à jour — 2026-08-18.
 */

export const CHAPITRE_12_KEY = 'chapitre-12'
export const CHAPITRE_12_ORDER = 12

/** Détecte un chapitre Mongo correspondant au chapitre 12 figé. */
export function matchesChapitre12(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_12_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*12\b/i.test(name) || /^12([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-12/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-12/${n}.png`
}

/** Aucune image dans ce chapitre. */
const QUESTIONS_WITH_IMAGES = new Set([])

function answers(questionIndex, letters, correctLetters, texts = []) {
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter, i) => {
    const L = letter.toUpperCase()
    return {
      id: `hc-ch12-q${String(questionIndex).padStart(2, '0')}-${L.toLowerCase()}`,
      label: L,
      text: texts[i] || '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(order, letterOptions, correctLetters, promptText = '', choiceTexts = []) {
  return {
    id: `hc-ch12-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_12_KEY,
    chapterOrder: CHAPITRE_12_ORDER,
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
 * 59 questions — chapitre 12 (entretien, pneus, éclairage, documents). Voix Jérôme, eleven_v3.
 * Numérotation = numéro du manuel − 841 (manuel 842 à 900).
 * Audios servis depuis le code (server/content), pas depuis la base.
 */
export const CHAPITRE_12_QUESTIONS = [
  question(1, ["A", "B", "C"], ["A"], "À quoi sert le triangle de présignalisation ?", ["À signaler la position d’un véhicule en panne sur la chaussée.", "À signaler la présence d’un véhicule en stationnement.", "À signaler un arrêt."]),
  question(2, ["A", "B", "C"], ["A"], "À quoi sert l’extincteur ?", ["À éteindre un début d’incendie sur un véhicule.", "À secourir un blessé.", "À refroidir le moteur."]),
  question(3, ["A", "B", "C"], ["A"], "La roue secours :", ["Est obligatoire pour tout déplacement.", "N’est pas obligatoire lorsqu’on circule en ville.", "Est obligatoire seulement pour les longs voyages."]),
  question(4, ["A", "B", "C"], ["A", "B"], "Que faut-il faire pour éviter de polluer l’environnement par le gaz d’échappement de votre moteur ?", ["Bien régler le moteur de mon véhicule.", "Utiliser un carburant de bonne qualité.", "Rouler à vive allure."]),
  question(5, ["A", "B", "C"], ["A"], "Pour vidanger le moteur d’un véhicule bien entretenu, il faut tenir compte :", ["Du kilométrage parcouru.", "De la vitesse élevée.", "Du nombre de voyages effectués."]),
  question(6, ["A", "B", "C"], ["A"], "La vérification de l’huile à frein se fait :", ["Tous les jours.", "Tous les mois.", "Au bon vouloir du conducteur."]),
  question(7, ["A", "B", "C", "D", "E"], ["B", "D", "E"], "Qu’est-ce qui peut causer l’incendie sur un véhicule automobile ?", ["La chaleur ambiante.", "Un court-circuit.", "Des gouttes d’eau dans le moteur en marche.", "Fuite d’essence.", "Les flammes de la tuyauterie d’échappement."]),
  question(8, ["A", "B", "C"], ["A", "B"], "Quelles sont les causes d’usure prématurée des pneumatiques ?", ["La surcharge et le défaut de gonflage.", "Le démarrage violent et les coups de trottoir.", "L’utilisation des pneumatiques sur chaussées mouillées."]),
  question(9, ["A", "B", "C", "D"], ["B", "C"], "Le rétroviseur extérieur côté droit est obligatoire sur :", ["Tous véhicules.", "Les véhicules de transport de marchandises.", "Les véhicules de transport en commun de personnes.", "Les machines agricoles."]),
  question(10, ["A", "B", "C", "D"], ["B", "C", "D"], "Les dispositifs réfléchissants placés à l’arrière du véhicule sont :", ["Facultatifs.", "Obligatoires.", "De couleur rouge.", "Visibles la nuit par temps clair à une distance de 100 m quand ils sont éclairés par les feux de route."]),
  question(11, ["A", "B", "C", "D"], ["A", "B", "D"], "Un chargement dépassant de plus d’un mètre à l’arrière d’un véhicule doit être signalé par :", ["Un dispositif réfléchissant rouge.", "Un feu rouge visible à 150 m en cas de visibilité insuffisante.", "Un chiffon flottant.", "Une lanterne rouge."]),
  question(12, ["A", "B", "C"], ["B"], "À quelle distance les feux de route éclairent-ils, par temps normal ?", ["50 m environ.", "100 m environ.", "150 m environ."]),
  question(13, ["A", "B", "C"], ["B"], "Quels feux utilisez-vous lorsque votre véhicule suit un autre usager à faible distance ?", ["Feux de route.", "Feux de croisement.", "Feux de détresse."]),
  question(14, ["A", "B", "C", "D"], ["B", "C", "D"], "Le moteur au régime élevé fait des à-coups, à quoi cela peut-il être dû ?", ["La batterie mal chargée.", "Les bougies défectueuses.", "L’allumeur déréglé.", "La vis platinée déréglée."]),
  question(15, ["A", "B", "C"], ["B"], "Un véhicule automobile est équipé de combien de rétroviseurs obligatoires ?", ["Un.", "Deux.", "Trois."]),
  question(16, ["A", "B", "C"], ["A", "B"], "Que faut-il en cas de crevaison ?", ["Un cric.", "Une roue secours.", "Un extincteur."]),
  question(17, ["A", "B", "C"], ["C"], "À quoi sert la ceinture de sécurité ?", ["Pour régler le siège.", "Permet de maintenir les bagages en sécurité.", "Maintient efficacement le conducteur et les passagers sur leur siège en cas d’accident, de collision ou de freinage brusque."]),
  question(18, ["A", "B", "C", "D"], ["A", "D"], "Quel est le circuit d’alimentation en carburant d’un moteur à essence ?", ["Réservoir, pompe à essence, carburateur.", "Réservoir, carburateur, pompe à essence.", "Pompe à essence, réservoir, carburateur.", "Réservoir, pompe à essence, pompe à injection, injecteurs."]),
  question(19, ["A", "B", "C", "D"], ["B", "D"], "En cas de début d’incendie sur véhicule :", ["Je jette de l’eau sur les flammes.", "Je jette du sable ou de la terre à la base des flammes.", "J’utilise une couverture pour étouffer le feu.", "J’utilise l’extincteur."]),
  question(20, ["A", "B", "C"], ["A"], "Sur mon véhicule, en roulant je peux contrôler visuellement :", ["Certains niveaux.", "L’état des pneumatiques.", "L’état des courroies."]),
  question(21, ["A", "B", "C", "D", "E"], ["A", "B", "C", "D", "E"], "En cas de crevaison, pour changer la roue :", ["Je cale le véhicule et sors la roue secours, la clé de roue et le cric.", "Je desserre les écrous.", "Je soulève le véhicule du côté de la crevaison.", "Je débloque et libère la roue crevée.", "Je mets la roue secours et resserre les écrous."]),
  question(22, ["A", "B", "C"], ["B"], "Quelle pièce officielle permet d’identifier le propriétaire d’un véhicule ?", ["La police d’assurance.", "La carte grise.", "L’attestation de réglage phare."]),
  question(23, ["A", "B", "C"], ["A"], "Pour un véhicule léger de transport privé la visite technique doit s’effectuer :", ["Tous les ans.", "Tous les six mois.", "Tous les trois mois."]),
  question(24, ["A", "B", "C"], ["C"], "À quoi sert le contrat d’assurance au tiers ?", ["À couvrir les dégâts causés lors d’un accident.", "À couvrir les surcharges.", "À couvrir les dégâts causés à autrui."]),
  question(25, ["A", "B", "C"], ["B"], "Le contrat d’assurance est valable :", ["Sans la visite technique.", "Avec la visite technique.", "Avec la vignette."]),
  question(26, ["A", "B", "C", "D"], ["B", "C"], "La vignette fiscale est une pièce obligatoire :", ["Pour tout véhicule.", "Pour les véhicules de transport en commun de personnes.", "Pour les véhicules de transport de marchandises.", "Pour les véhicules administratifs."]),
  question(27, ["A", "B", "C", "D"], ["A", "C"], "Lorsque les pneus sont neufs :", ["La tenue de route est améliorée.", "Le risque d’aquaplaning est écarté.", "L’adhérence est bonne.", "Le risque de dérapage augmente."]),
  question(28, ["A", "B", "C", "D"], ["B"], "L’absence de bouchon sur la valve d’une roue :", ["Est dangereuse.", "Peut diminuer son étanchéité.", "Permet de libérer une surpression d’air.", "Permet d’augmenter l’air."]),
  question(29, ["A", "B", "C", "D"], ["D"], "Il n’est pas obligatoire de mettre la ceinture de sécurité :", ["Si le véhicule est équipé de coussin de gonflage.", "Si la conduite s’effectue en agglomération.", "Si la conduite s’effectue sur un long trajet.", "Rien de tout ce qui précède."]),
  question(30, ["A", "B", "C"], ["B"], "La profondeur des rainures principales d’un pneu doit être au minimum de :", ["0,6 mm.", "1,6 mm.", "1,5 mm."]),
  question(31, ["A", "B", "C", "D"], ["A", "C"], "La portée minimale des feux doit être de :", ["30 m pour les feux de croisement.", "45 m pour les feux de croisement.", "100 m pour les feux de route.", "150 m pour les feux de route."]),
  question(32, ["A", "B", "C"], ["C"], "Sur un même itinéraire et dans des conditions identiques, une voiture qui roule à 90 km/h consomme à 130 km/h :", ["La même quantité d’essence.", "Moins d’essence.", "Plus d’essence."]),
  question(33, ["A", "B", "C", "D"], ["B"], "La roue motrice est celle qui :", ["A un moteur.", "Est relié au moteur et entraîne le véhicule.", "Tire le moteur.", "Oriente le véhicule."]),
  question(34, ["A", "B", "C", "D"], ["A", "B", "C"], "Les roues motrices d’un véhicule peuvent être :", ["À l’avant.", "À l’arrière.", "À l’avant et à l’arrière.", "Sur le porte-à-faux."]),
  question(35, ["A", "B", "C", "D"], ["A"], "Quand dit-on qu’un véhicule est à traction avant ?", ["Si les roues motrices sont à l’avant.", "Si les roues motrices sont à l’arrière.", "Si le moteur est à l’avant.", "Si le moteur est à l’arrière."]),
  question(36, ["A", "B", "C", "D"], ["B"], "Quand dit-on qu’un véhicule est à propulsion arrière ?", ["Si les roues motrices sont à l’avant.", "Si les roues motrices sont à l’arrière.", "Si le moteur est à l’avant.", "Si le moteur est à l’arrière."]),
  question(37, ["A", "B", "C", "D"], ["A"], "Les roues directrices d’une voiture sont placées :", ["À l’avant.", "À l’arrière.", "À l’avant et à l’arrière.", "Rien de tout ce qui précède."]),
  question(38, ["A", "B", "C", "D"], ["A", "C", "D"], "Par temps de brouillard, je peux allumer les feux :", ["De croisement.", "De route.", "De brouillard avant.", "De brouillard arrière."]),
  question(39, ["A", "B", "C"], ["A", "C"], "Des amortisseurs usés :", ["Allongent la distance de freinage.", "Diminuent la distance de freinage.", "Compliquent la tenue de route."]),
  question(40, ["A", "B", "C", "D", "E"], ["A", "B", "C", "E"], "Dans une station service, l’extincteur est utilisable par :", ["Le technicien préposé.", "Le pompiste.", "Le gardien.", "N’importe quel client.", "Tout usager capable de s’en servir."]),
  question(41, ["A", "B", "C", "D", "E"], ["A", "B", "E"], "Lors d’un contrôle routier, je dois présenter :", ["Mon permis de conduire.", "La carte grise.", "Ma carte d’identité.", "Ma carte de groupe sanguin.", "L’assurance et la visite technique."]),
  question(42, ["A", "B", "C", "D"], ["A", "B", "C"], "La consommation du carburant augmente :", ["Si le chargement fait cabrer l’avant du véhicule.", "Si je charge des bagages sur le toit.", "Si je tracte une caravane.", "Rien de tout ce qui précède."]),
  question(43, ["A", "B", "C", "D"], ["A", "B", "C"], "Quel effet un sous gonflage peut-il avoir sur la durée de vie de la carcasse du pneumatique ?", ["Usure plus rapide.", "La carcasse se fatigue plus vite.", "Détérioration des composantes internes du pneu.", "Usure de la partie centrale."]),
  question(44, ["A", "B", "C", "D"], ["A", "B", "C"], "Pour un bon fonctionnement de mes pneus je dois régulièrement vérifier :", ["La pression à froid.", "La présence du bouchon de valve.", "Les écrous de fixation des roues.", "Le compteur kilométrique."]),
  question(45, ["A", "B", "C", "D"], ["A", "B", "C"], "Quelle incidence un sous gonflage peut avoir sur le comportement d’un véhicule ?", ["Tenue de route réduite.", "Instabilité.", "Risque de renversement.", "Réduction de la consommation de carburant."]),
  question(46, ["A", "B", "C"], ["A", "B"], "Pour diminuer les risques en cas de verglas, je peux équiper mon véhicule :", ["De pneus spéciaux.", "De pneus à crampons.", "De chaînes."]),
  question(47, ["A", "B", "C", "D"], ["B", "C", "D"], "Par temps de pluie, pour voir et être vu, j’allume :", ["Mes feux de route.", "Mes feux de croisement.", "Mes feux de brouillard avant.", "Mon ou mes feux de brouillard arrière."]),
  question(48, ["A", "B", "C", "D"], ["A", "B"], "Pour éviter la buée sur les vitres, je peux utiliser :", ["La ventilation et le chauffage.", "Le dégivreur arrière.", "Les essuie-glaces.", "Le lave-glace."]),
  question(49, ["A", "B", "C", "D"], ["A", "B", "C"], "Les éléments qui permettent une meilleure visibilité sont :", ["Le lave-glace.", "Les essuie-glaces.", "Le pare-soleil.", "Les déflecteurs de vitres."]),
  question(50, ["A", "B", "C"], ["C"], "Avant un voyage, je peux obtenir des renseignements sur la circulation par :", ["Téléphone.", "Radio.", "La carte routière."]),
  question(51, ["A", "B", "C"], ["A"], "Les véhicules prioritaires sont équipés de feux :", ["Tournant bleus.", "Clignotant bleus.", "Tournants jaunes."]),
  question(52, ["A", "B"], ["B"], "Lorsqu’un voyant s’allume au tableau de bord en circulation, il s’agit :", ["D’un indice informel.", "D’un indice formel."]),
  question(53, ["A", "B", "C"], ["A", "B"], "Les indices inquiétants relatifs à mon véhicule peuvent se caractériser :", ["Par une odeur.", "Par un bruit.", "Par un voyant bleu sur le tableau de bord."]),
  question(54, ["A", "B", "C"], ["A", "C"], "L’utilisation de la climatisation du véhicule a une influence :", ["Sur le confort.", "Sur la sécurité.", "Sur la consommation."]),
  question(55, ["A", "B", "C", "D"], ["A", "C"], "Sur mon pare-brise, je dois apposer :", ["La vignette fiscale en haut, à droite.", "La vignette fiscale en bas, à droite.", "Le certificat d’assurance en bas, à droite.", "Le certificat d’assurance en bas à gauche."]),
  question(56, ["A", "B", "C", "D"], ["A", "B", "C", "D"], "Mon assureur peut refuser de m’indemniser en totalité ou partiellement si :", ["Ma responsabilité est engagée.", "Je ne portais pas la ceinture.", "Je conduisais avec une alcoolémie positive.", "Je ne portais pas les lunettes mentionnées sur mon permis."]),
  question(57, ["A", "B", "C"], ["A", "C"], "Une différence importante de profondeur des rainures des pneus sur un même essieu a :", ["Une influence sur la tenue de route.", "N’a pas d’influence sur la tenue de route.", "A une influence sur la suspension."]),
  question(58, ["A", "B", "C", "D"], ["A", "B"], "Sur le même essieu d’un véhicule :", ["Il n’est pas recommandé de monter des pneus de structures différentes.", "Il n’est pas recommandé de monter des pneus de marques différentes.", "Il est recommandé de monter des pneus de structures différentes.", "Il est recommandé de monter des pneus de marques différentes."]),
  question(59, ["A", "B", "C", "D"], ["A", "B", "D"], "La suspension a pour rôle d’assurer :", ["Le contact permanent du pneu avec la route.", "La stabilité du véhicule.", "Le confort uniquement.", "La sécurité."]),
]
