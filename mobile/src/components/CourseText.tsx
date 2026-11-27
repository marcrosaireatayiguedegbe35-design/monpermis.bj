import { Image, StyleSheet, Text, View } from 'react-native'
import RenderHTML from 'react-native-render-html'
import { fonts } from '../theme'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { RES } from './ReserveFrame'
import { useViewport } from '../utils/viewport'

/**
 * Texte d'un cours : lecture confortable (gros corps de texte, titres de parties, listes à puces vertes,
 * encadré pour les « Nota bene »). Le HTML vient du code de l'application, jamais d'un utilisateur.
 */
type SignItem = { code: string; label: string; image: string }
type SignGroup = { title: string; items: SignItem[] }

/** Découpe le HTML : les blocs « {{signs:[…]}} » deviennent des grilles de panneaux. */
function splitSigns(html: string): ({ html: string } | { groups: SignGroup[] })[] {
  const parts: ({ html: string } | { groups: SignGroup[] })[] = []
  const pattern = /<p>\{\{signs:(.*?)\}\}<\/p>/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) {
    if (match.index > last) parts.push({ html: html.slice(last, match.index) })
    try {
      parts.push({ groups: JSON.parse(match[1]) as SignGroup[] })
    } catch {
      /* bloc illisible : ignoré */
    }
    last = match.index + match[0].length
  }
  if (last < html.length) parts.push({ html: html.slice(last) })
  return parts
}

function SignGrid({ groups }: { groups: SignGroup[] }) {
  return (
    <View style={signStyles.box}>
      {groups.map((group, index) => (
        <View key={`${group.title}-${index}`} style={signStyles.group}>
          {group.title ? <Text style={signStyles.title}>{group.title}</Text> : null}
          <View style={signStyles.row}>
            {group.items.map((item) => (
              <View key={item.code} style={signStyles.card}>
                <Image
                  source={{ uri: resolveMediaUrl(item.image) }}
                  style={signStyles.image}
                  resizeMode="contain"
                  accessibilityLabel={item.label}
                />
                <Text style={signStyles.label}>{item.label}</Text>
                <Text style={signStyles.code}>{item.code}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

const signStyles = StyleSheet.create({
  box: { marginTop: 2, marginBottom: 16, padding: 12, borderRadius: 22, backgroundColor: '#F6FAF7', borderWidth: 1, borderColor: '#DCEBE1', gap: 14 },
  group: { gap: 10 },
  title: { fontFamily: fonts.displayBold, fontSize: 14.5, color: RES.green, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '30.5%', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, backgroundColor: '#FFFFFF' },
  image: { width: 74, height: 74 },
  label: { fontFamily: fonts.bodyBold, fontSize: 12.5, lineHeight: 16, color: RES.ink, textAlign: 'center' },
  code: { fontFamily: fonts.bodyMedium, fontSize: 11, color: RES.muted },
})

export function CourseText({ html }: { html: string }) {
  const { width } = useViewport()
  const contentWidth = Math.max(width - 68, 240)
  return (
    <>
      {splitSigns(html).map((part, index) =>
        'groups' in part ? (
          <SignGrid key={index} groups={part.groups} />
        ) : (
          <Html key={index} html={part.html} contentWidth={contentWidth} />
        ),
      )}
    </>
  )
}

function Html({ html, contentWidth }: { html: string; contentWidth: number }) {
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
