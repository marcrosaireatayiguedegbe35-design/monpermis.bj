import { BarChart3, BookOpen, House, Settings } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fonts, shadows } from '../theme'

export type CodeTab = 'Home' | 'MesNotes' | 'CodeCours' | 'Profile'

const TABS: { key: CodeTab; label: string; Icon: typeof House }[] = [
  { key: 'Home', label: 'Accueil', Icon: House },
  { key: 'MesNotes', label: 'Mes stats', Icon: BarChart3 },
  { key: 'CodeCours', label: 'Cours', Icon: BookOpen },
  { key: 'Profile', label: 'Paramètres', Icon: Settings },
]

const ACTIVE = '#2563EB'
const IDLE = '#64748B'

/** Barre d'onglets en bas de l'accueil du Code (Accueil · Mes stats · Cours · Paramètres). */
export function CodeBottomBar({ active, onSelect }: { active: CodeTab; onSelect: (tab: CodeTab) => void }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {TABS.map(({ key, label, Icon }) => {
          const on = key === active
          return (
            <Pressable
              key={key}
              style={styles.tab}
              onPress={() => onSelect(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
            >
              <Icon size={26} color={on ? ACTIVE : IDLE} fill={on ? ACTIVE : 'none'} strokeWidth={on ? 2.2 : 1.9} />
              <Text style={[styles.label, { color: on ? ACTIVE : IDLE }, on && styles.labelOn]}>{label}</Text>
              <View style={[styles.indicator, on && styles.indicatorOn]} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    ...shadows.md,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12 },
  labelOn: { fontFamily: fonts.bodyBold },
  indicator: { width: 42, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: 2 },
  indicatorOn: { backgroundColor: ACTIVE },
})
