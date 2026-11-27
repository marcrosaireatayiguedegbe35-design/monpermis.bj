import crypto from 'crypto'
import { Chapter } from '../models/Chapter.js'
import { CODE_COURSES } from '../data/hardcodedCourses.js'
import { STANDARD_REVISION_CHAPTER_COUNT } from '../data/standardRevisionChapters.js'

/**
 * Cours du code de la route : le contenu est dans le code (data/hardcodedCourses.js), plus dans la base.
 * Les identifiants sont des hexadécimaux de 24 caractères, stables d'un déploiement à l'autre
 * (la progression des apprenants est enregistrée dessus).
 */
const hash = (value) => crypto.createHash('md5').update(`monpermis-cours:${value}`).digest('hex').slice(0, 24)

export const codeCourseId = (key) => hash(`cours:${key}`)
export const codeChapterFallbackId = (order) => hash(`chapitre:${order}`)

function publicModule(course) {
  return {
    id: hash(`module:${course.key}`),
    name: course.title,
    title: '',
    text: course.html,
    mediaType: 'video',
    // Chemin relatif : l'application le résout sur l'adresse du serveur.
    videoUrl: `/content/code-cours/${course.video}.mp4`,
    imageUrl: '',
    mediaBytes: 0,
    order: 0,
  }
}

function toNotion(course, index, chapterId) {
  const id = codeCourseId(course.key)
  const publicJson = {
    id,
    title: course.title,
    chapterId: String(chapterId),
    order: index,
    modules: [publicModule(course)],
  }
  return {
    _id: id,
    chapter: chapterId,
    chapterOrder: course.chapterOrder,
    title: course.title,
    order: index,
    published: true,
    toPublicJSON: () => publicJson,
  }
}

/** Id de chapitre : celui de la base quand il existe (questions, quiz), sinon un id fixe (chapitre 20). */
async function chapterIdsByOrder() {
  const rows = await Chapter.find({ order: { $gte: 1, $lte: STANDARD_REVISION_CHAPTER_COUNT } })
    .select('_id order')
    .lean()
  const map = new Map(rows.map((row) => [row.order, String(row._id)]))
  return (order) => map.get(order) || codeChapterFallbackId(order)
}

/** Toutes les notions (cours), classées par chapitre. */
export async function loadCodeNotions() {
  const chapterId = await chapterIdsByOrder()
  return CODE_COURSES.map((course, index) => toNotion(course, index, chapterId(course.chapterOrder)))
}

/** Chapitres du parcours Cours avec leurs notions. */
export async function loadCodeCourseChapters() {
  const chapterId = await chapterIdsByOrder()
  const byOrder = new Map()
  CODE_COURSES.forEach((course, index) => {
    if (!byOrder.has(course.chapterOrder)) byOrder.set(course.chapterOrder, [])
    byOrder.get(course.chapterOrder).push(toNotion(course, index, chapterId(course.chapterOrder)).toPublicJSON())
  })
  return [...byOrder.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([order, courses]) => ({ id: chapterId(order), name: `Chapitre ${order}`, order, courses }))
}

/** Retrouve une notion par id (sans base de données) ; null si l'id n'est pas un cours du code. */
export function findCodeNotion(courseId) {
  const id = String(courseId || '')
  const index = CODE_COURSES.findIndex((course) => codeCourseId(course.key) === id)
  if (index === -1) return null
  const course = CODE_COURSES[index]
  return { _id: id, published: true, title: course.title, chapterOrder: course.chapterOrder }
}
