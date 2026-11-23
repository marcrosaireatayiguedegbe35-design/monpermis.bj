/**
 * Plus d'audio embarqué dans l'APK : les MP3 des questions sont publiés par les admins
 * (stockés en base) et lus en streaming depuis l'API (/content/code-audio/chapitre-{N}/{Q}.mp3).
 */
export const CODE_AUDIO_MODULES: Record<number, Record<number, number>> = {}

export function getCodeAudioModule(_chapterOrder: number, _questionOrder: number): number | null {
  return null
}
