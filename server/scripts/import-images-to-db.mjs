/**
 * Importe en base (collection chapterimages) les images d'un dossier organisé par chapitre :
 *   <dossier>/chapitre-1/3.png, <dossier>/chapitre-11/7.png, …
 * Usage : node scripts/import-images-to-db.mjs [dossier] [--chapter=N] [--dry]
 * Par défaut : ~/Bureau/transfer/code-images. Remplace les images déjà publiées au même numéro.
 */
import 'dotenv/config'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import mongoose from 'mongoose'
import { ChapterImage } from '../src/models/ChapterImage.js'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const only = Number((args.find((a) => a.startsWith('--chapter=')) || '').split('=')[1]) || null
const dir = args.find((a) => !a.startsWith('--')) || path.join(os.homedir(), 'Bureau', 'transfer', 'code-images')
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }

if (!fs.existsSync(dir)) {
  console.error(`Dossier introuvable : ${dir}`)
  process.exit(1)
}

const chapters = fs
  .readdirSync(dir)
  .map((name) => ({ name, n: Number((/^chapitre-(\d+)$/.exec(name) || [])[1]) }))
  .filter((c) => c.n && (!only || c.n === only))
  .sort((a, b) => a.n - b.n)

if (!dry) await mongoose.connect(process.env.MONGODB_URI)
let total = 0
for (const { name, n } of chapters) {
  const files = fs.readdirSync(path.join(dir, name)).filter((f) => /^\d+\.(png|jpe?g|webp)$/i.test(f))
  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, name, file))
    const imageIndex = Number(file.split('.')[0])
    const ext = file.split('.').pop().toLowerCase()
    if (!dry) {
      await ChapterImage.findOneAndUpdate(
        { chapterOrder: n, imageIndex },
        { $set: { filename: file, mimeType: MIME[ext], size: data.length, data } },
        { upsert: true },
      )
    }
    total += 1
  }
  console.log(`chapitre ${n} : ${files.length} image(s)`)
}
console.log(`${dry ? '[simulation] ' : ''}${total} image(s) ${dry ? 'à importer' : 'importées'}`)
if (!dry) await mongoose.disconnect()
