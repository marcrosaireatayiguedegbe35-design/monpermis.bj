import mongoose from 'mongoose'

/** Réglages de la plateforme modifiables par l'administrateur (clé → valeur). */
const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true },
)

export const PlatformSetting = mongoose.model('PlatformSetting', platformSettingSchema)
