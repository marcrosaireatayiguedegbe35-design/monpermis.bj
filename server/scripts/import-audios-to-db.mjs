/**
 * Importe en base (collection chapteraudios) les MP3 d'un dossier organisé par chapitre :
 *   <dossier>/chapitre-1/1.mp3, <dossier>/chapitre-1/2.mp3, … <dossier>/chapitre-19/10.mp3
 * Usage : node scripts/import-audios-to-db.mjs [dossier] [--chapter=N] [--dry]
 * Par défaut : ~/Bureau/transfer/code-audio. Remplace les audios déjà publiés au même numéro.
 */
import 'dotenv/config'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import mongoose from 'mongoose'
import { ChapterAudio } from '../src/models/ChapterAudio.js'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const only = Number((args.find((a) => a.startsWith('--chapter=')) || '').split('=')[1]) || null
const dir = args.find((a) => !a.startsWith('--')) || path.join(os.homedir(), 'Bureau', 'transfer', 'code-audio')

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
  const files = fs.readdirSync(path.join(dir, name)).filter((f) => /^\d+\.mp3$/i.test(f))
  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, name, file))
    const questionOrder = Number(file.replace(/\.mp3$/i, ''))
    if (!dry) {
      await ChapterAudio.findOneAndUpdate(
        { chapterOrder: n, questionOrder },
        { $set: { filename: file, mimeType: 'audio/mpeg', size: data.length, data } },
        { upsert: true },
      )
    }
    total += 1
  }
  console.log(`chapitre ${n} : ${files.length} audio(s)`)
}
console.log(`${dry ? '[simulation] ' : ''}${total} audio(s) ${dry ? 'à importer' : 'importés'}`)
if (!dry) await mongoose.disconnect()
