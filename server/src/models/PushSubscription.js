import mongoose from 'mongoose'

/**
 * Appareil à qui envoyer des notifications poussées (téléphone, navigateur).
 *  - kind « web »  : abonnement Web Push (navigateur / site installé), identifié par son endpoint ;
 *  - kind « expo » : jeton de l'application mobile (envoi via le service Expo).
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ['user', 'moniteur'], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    kind: { type: String, enum: ['web', 'expo'], required: true },
    endpoint: { type: String, default: '', trim: true },
    keys: {
      p256dh: { type: String, default: '' },
      auth: { type: String, default: '' },
    },
    expoToken: { type: String, default: '', trim: true },
    platform: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true, partialFilterExpression: { kind: 'web', endpoint: { $gt: '' } } })
pushSubscriptionSchema.index({ expoToken: 1 }, { unique: true, partialFilterExpression: { kind: 'expo', expoToken: { $gt: '' } } })

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema)
