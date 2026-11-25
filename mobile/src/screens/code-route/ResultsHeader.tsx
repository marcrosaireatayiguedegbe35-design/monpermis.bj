import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { CodeModuleIcon } from '../../components/ModuleIcons'
import { dark, fonts } from '../../theme'

/** En-tête commun des pages de résultats : retour, logo, titre + sous-titre, action facultative à droite. */
export function ResultsHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle: string
  onBack: () => void
  right?: ReactNode
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        onPress={onBack}
        accessibilityLabel="Retour"
        hitSlop={10}
      >
        <ChevronLeft size={26} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.center}>
        <CodeModuleIcon size={40} />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
      {right ?? <View style={styles.btn} />}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
  },
  btn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 8 },
  title: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 23, color: dark.textPrimary, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: dark.textMuted },
})
