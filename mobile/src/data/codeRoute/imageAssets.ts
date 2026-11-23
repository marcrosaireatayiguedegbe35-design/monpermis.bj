/**
 * Plus d'image embarquée dans l'APK : les images des questions sont publiées par les admins
 * (stockées en base) et chargées depuis l'API (/content/code-images/chapitre-{N}/{I}.png).
 */
export const CODE_IMAGE_MODULES: Record<number, Record<number, number>> = {}

export function getCodeImageModule(_chapterOrder: number, _imageIndex: number): number | null {
  return null
}
