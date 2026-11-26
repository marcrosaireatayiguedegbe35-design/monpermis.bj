import type { ComponentType } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Bell, ChevronLeft } from 'lucide-react-native'
import { DriveModuleIcon } from './ModuleIcons'
import { fonts } from '../theme'

type Props = {
  title: string
  subtitle?: string
  onBack: () => void
  onBell: () => void
  unread?: number
  /** Logo Conduite à gauche du titre (premier écran). */
  logo?: boolean
  /** Icône carrée à gauche du titre (confirmation). */
  icon?: ComponentType<{ size?: number; color?: string }>
  iconTint?: string
  iconBg?: string
}

/** En-tête commun des écrans de réservation : retour, titre + sous-titre, cloche avec pastille. */
export function FlowHeader({ title, subtitle, onBack, onBell, unread = 0, logo, icon: Icon, iconTint = '#EA580C', iconBg = '#FFEBDD' }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]} onPress={onBack} accessibilityLabel="Retour" hitSlop={10}>
        <ChevronLeft size={26} color="#0A1E55" />
      </Pressable>
      <View style={styles.center}>
        {logo ? <DriveModuleIcon size={44} /> : null}
        {Icon ? (
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Icon size={22} color={iconTint} />
          </View>
        ) : null}
        <View style={logo || Icon ? styles.textLeft : styles.textCenter}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]} onPress={onBell} accessibilityLabel="Notifications" hitSlop={10}>
        <Bell size={24} color="#0A1E55" />
        {unread > 0 ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 10 },
  btn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF0F8' },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 0 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  textCenter: { alignItems: 'center', flexShrink: 1 },
  textLeft: { flexShrink: 1 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25, color: '#0A1E55', letterSpacing: -0.3 },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#5B6B86' },
  dot: { position: 'absolute', top: 9, right: 10, width: 11, height: 11, borderRadius: 6, backgroundColor: '#F97316', borderWidth: 2, borderColor: '#EAF0F8' },
})
