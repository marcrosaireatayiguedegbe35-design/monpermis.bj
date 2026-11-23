import mongoose from 'mongoose'

/**
 * Image d'une question de chapitre (code de la route), publiée par les admins et stockée en base.
 * Servie publiquement sur /content/code-images/chapitre-{N}/{I}.png (I = numéro de la question).
 */
const chapterImageSchema = new mongoose.Schema(
  {
    chapterOrder: { type: Number, required: true, min: 1 },
    imageIndex: { type: Number, required: true, min: 1 },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: 'image/png' },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
)

chapterImageSchema.index({ chapterOrder: 1, imageIndex: 1 }, { unique: true })

export const ChapterImage = mongoose.model('ChapterImage', chapterImageSchema)
