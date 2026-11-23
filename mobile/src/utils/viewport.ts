import { Dimensions, Platform, useWindowDimensions } from 'react-native'

/** Sur le web, l'app reste au format téléphone (jamais PC ni tablette). */
export const MOBILE_MAX_WIDTH = 430

function clamp(width: number): number {
  return Platform.OS === 'web' ? Math.min(width, MOBILE_MAX_WIDTH) : width
}

/** Remplace useWindowDimensions : largeur plafonnée au format mobile sur le web. */
export function useViewport() {
  const { width, height, scale, fontScale } = useWindowDimensions()
  return { width: clamp(width), height, scale, fontScale }
}

/** Remplace Dimensions.get('window') : largeur plafonnée au format mobile sur le web. */
export function getViewport() {
  const { width, height, scale, fontScale } = Dimensions.get('window')
  return { width: clamp(width), height, scale, fontScale }
}
