import RenderHTML from 'react-native-render-html'
import { fonts } from '../theme'
import { RES } from './ReserveFrame'
import { useViewport } from '../utils/viewport'

/**
 * Texte d'un cours : lecture confortable (gros corps de texte, titres de parties, listes à puces vertes,
 * encadré pour les « Nota bene »). Le HTML vient du code de l'application, jamais d'un utilisateur.
 */
export function CourseText({ html }: { html: string }) {
  const { width } = useViewport()
  const contentWidth = Math.max(width - 68, 240)
  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html }}
      defaultTextProps={{ selectable: true }}
      baseStyle={{ fontFamily: fonts.body, color: RES.ink }}
      tagsStyles={{
        p: { fontFamily: fonts.body, fontSize: 17, lineHeight: 28, color: '#1B2B3C', marginTop: 0, marginBottom: 14 },
        h2: {
          fontFamily: fonts.displayExtraBold,
          fontSize: 21,
          lineHeight: 27,
          color: RES.green,
          marginTop: 22,
          marginBottom: 10,
          paddingBottom: 8,
          borderBottomWidth: 2,
          borderBottomColor: '#CFE8D8',
        },
        h3: {
          fontFamily: fonts.displayBold,
          fontSize: 18,
          lineHeight: 24,
          color: RES.ink,
          marginTop: 16,
          marginBottom: 8,
        },
        ul: { marginTop: 0, marginBottom: 14, paddingLeft: 4 },
        li: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: '#1B2B3C', marginBottom: 8 },
        strong: { fontFamily: fonts.bodyBold },
      }}
      classesStyles={{
        note: {
          fontFamily: fonts.bodyBold,
          fontSize: 16.5,
          lineHeight: 26,
          color: '#0B4A2B',
          backgroundColor: '#EAF6EF',
          borderLeftWidth: 5,
          borderLeftColor: RES.green,
          borderRadius: 14,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginVertical: 12,
        },
      }}
      renderersProps={{ ul: { markerBoxStyle: { paddingRight: 10 } } }}
    />
  )
}
