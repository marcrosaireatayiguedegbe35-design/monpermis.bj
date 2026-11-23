import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_ROOT = path.resolve(__dirname, '../../content')

/**
 * Médias embarqués dans le code (server/content/code-audio|code-images/chapitre-N/{n}.ext),
 * servis tels quels, sans passer par la base. Renvoie la taille du fichier, ou 0 s'il n'existe pas.
 */
function fileSize(kind, ext, chapterOrder, index) {
  try {
    const file = path.join(CONTENT_ROOT, kind, `chapitre-${Number(chapterOrder)}`, `${Number(index)}.${ext}`)
    return fs.statSync(file).size
  } catch {
    return 0
  }
}

export const codeAudioSize = (chapterOrder, questionOrder) =>
  fileSize('code-audio', 'mp3', chapterOrder, questionOrder)

export const codeImageSize = (chapterOrder, imageIndex) =>
  fileSize('code-images', 'png', chapterOrder, imageIndex)
