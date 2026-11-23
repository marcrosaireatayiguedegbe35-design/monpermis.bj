import mongoose from 'mongoose'

/**
 * Audio d'une question de chapitre (code de la route), publié par les admins
 * et stocké en base. Servi publiquement sur /content/code-audio/chapitre-{N}/{Q}.mp3
 */
const chapterAudioSchema = new mongoose.Schema(
  {
    chapterOrder: { type: Number, required: true, min: 1 },
    questionOrder: { type: Number, required: true, min: 1 },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: 'audio/mpeg' },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
)

chapterAudioSchema.index({ chapterOrder: 1, questionOrder: 1 }, { unique: true })

export const ChapterAudio = mongoose.model('ChapterAudio', chapterAudioSchema)
