import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Bell, Check, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { Bouncy } from './Bouncy'
import { fonts, shadows } from '../theme'

/** Couleurs du parcours de réservation (même famille que le parcours de première connexion du moniteur). */
export const RES = {
  green: '#0B7F47',
  greenDark: '#086A3B',
  leaf: '#1FA65A',
  soft: '#EAF6EF',
  blobA: '#E9F6EE',
  blobB: '#D8F0E1',
  ink: '#0B1F3A',
  muted: '#4D5F73',
  line: '#DFE6E1',
}

/** En-tête : retour, gros titre centré, cloche. */
export function ReserveHeader({
  title,
  subtitle,
  unread = 0,
  onBack,
  onBell,
}: {
  title: string
  subtitle?: string
  unread?: number
  onBack: () => void
  onBell: () => void
}) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.round} onPress={onBack} accessibilityLabel="Retour" hitSlop={10}>
        <ChevronLeft size={26} color={RES.ink} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Pressable style={styles.round} onPress={onBell} accessibilityLabel="Notifications" hitSlop={10}>
        <Bell size={22} color={RES.ink} />
        {unread > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  )
}

/** Pastille d'étape entre deux traits : « ① Étape 1 sur 3 • Moniteur ». */
export function StepChip({ step, label, done }: { step?: number; label: string; done?: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepLine} />
      <View style={styles.chip}>
        <View style={styles.chipNum}>
          {done ? <Check size={14} color="#FFFFFF" strokeWidth={3.2} /> : <Text style={styles.chipNumText}>{step}</Text>}
        </View>
        <Text style={styles.chipText}>{label}</Text>
      </View>
      <View style={styles.stepLine} />
    </View>
  )
}

/** Gros bouton vert foncé dégradé, flèche dans un rond blanc. */
export function ReserveButton({
  label,
  onPress,
  disabled,
  icon,
  arrow = true,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  icon?: ReactNode
  arrow?: boolean
}) {
  return (
    <Bouncy scaleTo={0.98} disabled={disabled} onPress={onPress}>
      <LinearGradient
        colors={['#0F8A4D', RES.greenDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, disabled && { opacity: 0.55 }]}
      >
        {icon}
        <Text style={styles.btnText}>{label}</Text>
        {arrow ? (
          <View style={styles.btnArrow}>
            <ChevronRight size={20} color={RES.green} />
          </View>
        ) : null}
      </LinearGradient>
    </Bouncy>
  )
}

/** Bouton contour (action secondaire). */
export function ReserveOutlineButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable style={styles.outline} onPress={onPress}>
      {icon}
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6 },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: RES.line, ...shadows.sm },
  headerText: { flex: 1, alignItems: 'center', minWidth: 0 },
  headerTitle: { fontFamily: fonts.displayExtraBold, fontSize: 25, lineHeight: 30, color: RES.ink, letterSpacing: -0.5 },
  headerSub: { fontFamily: fonts.bodyMedium, fontSize: 13, color: RES.muted, marginTop: 1 },
  dot: { position: 'absolute', top: 9, right: 10, width: 11, height: 11, borderRadius: 6, backgroundColor: '#F97316', borderWidth: 2, borderColor: '#FFFFFF' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 8 },
  stepLine: { flex: 1, height: 1, backgroundColor: RES.line },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, paddingLeft: 7, paddingRight: 16, borderRadius: 999, backgroundColor: '#F1F5F2' },
  chipNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: RES.leaf, alignItems: 'center', justifyContent: 'center' },
  chipNumText: { fontFamily: fonts.displayBold, fontSize: 14, color: '#FFFFFF' },
  chipText: { fontFamily: fonts.displayBold, fontSize: 14.5, color: '#10261B' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60, borderRadius: 30, ...shadows.md },
  btnText: { fontFamily: fonts.displayBold, fontSize: 19, color: '#FFFFFF' },
  btnArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  outline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#0B6B3C', backgroundColor: '#FFFFFF' },
  outlineText: { fontFamily: fonts.displayBold, fontSize: 17, color: '#0B6B3C' },
})
