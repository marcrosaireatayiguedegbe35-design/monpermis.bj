/**
 * Génère server/src/data/hardcodedCourses.js : les cours du code de la route, en dur dans le code
 * (plus de base de données). Les textes viennent des fichiers « chapitres » fournis par l'auto-école.
 *
 *   node scripts/generate-code-courses.mjs "/chemin/vers/textes_sources/chapitres"
 *
 * Les vidéos (server/content/code-cours/*.mp4) sont rattachées par le nom de fichier ci-dessous.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcDir = process.argv[2]
if (!srcDir) {
  console.error('Usage: node scripts/generate-code-courses.mjs <dossier chapitres>')
  process.exit(1)
}

/** Une notion par fichier de texte ; chapterOrder = chapitre du site auquel elle est rattachée. */
const NOTIONS = [
  { chapterOrder: 1, title: "Les cas d'abstinence à la conduite des véhicules", files: ["01 - Chapitre 01"], video: 'chapitre-01' },
  { chapterOrder: 2, title: 'Définition du permis de catégorie B', files: ['02 - Chapitre 02'], video: 'chapitre-02' },
  { chapterOrder: 3, title: 'Les règles générales de circulation', files: ['03 - Chapitre 03'], video: 'chapitre-03' },
  { chapterOrder: 4, title: 'Les signes des agents, les feux tricolores et les panneaux', files: ['04 - Chapitre 04'], video: 'chapitre-04' },
  { chapterOrder: 5, title: "La route, la chaussée, l'accotement", files: ['05 - Chapitre 05'], video: 'chapitre-05' },
  { chapterOrder: 5, title: 'Description de la route', files: ['06 - Hors chapitre'], video: 'chapitre-05-description-route' },
  { chapterOrder: 5, title: "L'autoroute", files: ["07 - Hors chapitre"], video: 'chapitre-05-autoroute' },
  { chapterOrder: 6, title: 'Les différentes catégories de signalisation routière', files: ['08 - Chapitre 06'], video: 'chapitre-06' },
  { chapterOrder: 7, title: 'Les balises', files: ['09 - Chapitre 07'], video: 'chapitre-07' },
  { chapterOrder: 8, title: 'Comment aborder un virage, quitter la route à gauche', files: ['10 - Chapitre 08'], video: 'chapitre-08' },
  { chapterOrder: 9, title: 'Les feux des véhicules et leur utilisation', files: ['11 - Chapitre 09'], video: 'chapitre-09' },
  { chapterOrder: 10, title: 'La pré-signalisation', files: ['12 - Chapitre 10'], video: 'chapitre-10' },
  { chapterOrder: 11, title: 'Les vérifications journalières sur le véhicule', files: ['13 - Chapitre 11'], video: 'chapitre-11' },
  { chapterOrder: 12, title: 'Les marques sur la chaussée', files: ['14 - Hors chapitre'], video: 'chapitre-12' },
  {
    chapterOrder: 13,
    title: 'Les trois freins',
    files: ['15 - Hors chapitre'],
    video: 'chapitre-13',
    // Dernière phrase du fichier : elle appartient au chapitre 18 (déjà présente dans ce chapitre).
    dropSentences: ['La règle demande en agglomération de céder le passage au véhicule de transport en commun'],
  },
  { chapterOrder: 14, title: 'Les dépassements', files: ['16 - Chapitre 14'], video: 'chapitre-14' },
  { chapterOrder: 15, title: 'Les cas de dépassement interdit', files: ['17 - Chapitre 15'], video: 'chapitre-15' },
  { chapterOrder: 16, title: "L'arrêt et le stationnement", files: ['18 - Chapitre 16'], video: 'chapitre-16' },
  { chapterOrder: 17, title: "Les cas d'arrêt et de stationnement interdit", files: ['19 - Chapitre 17'], video: 'chapitre-17' },
  { chapterOrder: 18, title: 'Les catégories de permis', files: ['20 - Chapitre 18'], video: 'chapitre-18' },
  { chapterOrder: 19, title: 'Le secourisme', files: ['21 - Chapitre 19'], video: 'chapitre-19' },
  // La mécanique : le texte est réparti sur trois fichiers (titre, pompes, puis filtres → circuit de l'eau).
  { chapterOrder: 20, title: 'La mécanique', files: ['22 - Chapitre 20', '23 - Hors chapitre', '24 - Hors chapitre'], video: 'chapitre-20' },
]

function readSource(prefix) {
  const file = fs.readdirSync(srcDir).find((name) => name.startsWith(prefix))
  if (!file) throw new Error(`Fichier introuvable : ${prefix}`)
  return fs.readFileSync(path.join(srcDir, file), 'utf8').replace(/\r\n/g, '\n')
}

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Majuscule après le préfixe de titre (« A. la route » → « A. La route »). */
const cap = (value) => value.replace(/^((?:[A-D]\.|[IVX]+[-.]|\d{1,2}\.|[A-D]\/)\s*)([a-zéèêà])/i, (_m, pre, ch) => pre + ch.toUpperCase())

const HEADING_MAIN = /^([A-D]\.|[IVX]+[-.]\s?|[A-D]\/)\s*\S/i
const HEADING_NUM = /^\d{1,2}\.\s*\S/

/** Texte brut → HTML simple (titres, listes, paragraphes). */
function toHtml(raw, dropSentences = []) {
  let text = raw
  for (const sentence of dropSentences) {
    // La phrase peut être coupée par des retours à la ligne : on tolère tout espacement, jusqu'au point final.
    const pattern = sentence.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
    text = text.replace(new RegExp(`${pattern}[^.]*\\.?`, 'i'), '')
  }

  let paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

  // Titre d'en-tête répété dans le fichier (« Cours de code de la route. », « Chapitre N : … »).
  paragraphs = paragraphs.filter(
    (p, index) => !(index < 3 && /^(cours de code de la route|chapitre\s*\d+\s*:|hors chapitre)/i.test(p)),
  )

  // Longs paragraphes issus d'un copier-coller : on rétablit les points numérotés.
  const expanded = []
  for (const p of paragraphs) {
    if (p.length > 280) {
      const parts = p.split(/\s(?=(?:\d{1,2}\.\s+[A-ZÉÈ])|(?:[A-D]\.\s+[a-zéèA-Z]))/)
      expanded.push(...parts.map((part) => part.trim()).filter(Boolean))
    } else {
      expanded.push(p)
    }
  }

  // Points numérotés collés à leur explication (« 3. Le démarreur C'est un… ») : titre puis texte.
  const STARTERS = "Appelée|C'est|Il |Elle |La bougie|La pompe|L'allumeur|En la|En le|Son |Placé"
  const splitTitle = new RegExp(`^(\\d{1,2}\\.\\s+(?:La|Le|L')[^.]{1,40}?)\\s+(${STARTERS})`)
  for (let i = 0; i < expanded.length; i += 1) {
    const m = expanded[i].match(splitTitle)
    if (m && expanded[i].length > 90) {
      expanded.splice(i, 1, m[1], expanded[i].slice(m[1].length).trim())
    }
  }

  const out = []
  let list = []
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`)
      list = []
    }
  }
  let afterColon = false
  for (const p of expanded) {
    const short = p.length <= 90
    if (short && HEADING_MAIN.test(p)) {
      flushList()
      afterColon = false
      out.push(`<h2>${escapeHtml(cap(p.replace(/[.:]\s*$/, '')))}</h2>`)
    } else if (short && HEADING_NUM.test(p)) {
      flushList()
      afterColon = false
      out.push(`<h3>${escapeHtml(cap(p.replace(/[.:]\s*$/, '')))}</h3>`)
    } else if (afterColon && p.length <= 110 && /[;.]$/.test(p)) {
      list.push(p.replace(/\s*[;.]$/, ''))
    } else if (list.length && p.length <= 110 && /[;.]$/.test(p)) {
      list.push(p.replace(/\s*[;.]$/, ''))
    } else {
      flushList()
      const strong = /^(nota bene|remarques?)\b/i.test(p)
      out.push(strong ? `<p class="note">${escapeHtml(p)}</p>` : `<p>${escapeHtml(p)}</p>`)
      afterColon = /:\s*$/.test(p)
    }
  }
  flushList()
  return out.join('')
}

const CHAPTER_COUNT = 20
const result = NOTIONS.map((notion, index) => ({
  key: `${String(notion.chapterOrder).padStart(2, '0')}-${index + 1}`,
  chapterOrder: notion.chapterOrder,
  title: notion.title,
  video: notion.video,
  html: toHtml(
    notion.files.map(readSource).join('\n\n'),
    notion.dropSentences || [],
  ),
}))

const banner = `// Fichier généré par scripts/generate-code-courses.mjs — ne pas modifier à la main.
// Cours du code de la route : textes en dur dans le code (plus de base de données).
// Les vidéos sont dans server/content/code-cours/<video>.mp4, servies sur /content/code-cours/.
`
const body = `export const CODE_COURSE_CHAPTER_COUNT = ${CHAPTER_COUNT}

export const CODE_COURSES = ${JSON.stringify(result, null, 2)}
`
const outFile = path.join(here, '../src/data/hardcodedCourses.js')
fs.writeFileSync(outFile, banner + body)
console.log(`écrit ${outFile} — ${result.length} cours, ${result.reduce((n, c) => n + c.html.length, 0)} caractères`)
