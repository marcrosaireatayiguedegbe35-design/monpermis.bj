import { ChevronRight, Crown, History, LogOut, MessageCircle, UserCog, X } from 'lucide-react-native'
import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AuthUser } from '../api/session'
import { dark, fonts } from '../theme'

type Props = {
  visible: boolean
  user: AuthUser
  greeting: string
  onClose: () => void
  onLogout: () => void
  onOpenAbonnement: () => void
  onOpenPayments: () => void
  onOpenSupport: () => void
  onOpenProfile: () => void
}

function initialsOf(user: AuthUser) {
  return `${(user.firstName || '').trim().charAt(0)}${(user.lastName || '').trim().charAt(0)}`.toUpperCase() || '·'
}

/** Panneau « Mon compte » : simple et compact (aucun défilement), accès rapide + déconnexion. */
export function AccountSheet({
  visible,
  user,
  greeting,
  onClose,
  onLogout,
  onOpenAbonnement,
  onOpenPayments,
  onOpenSupport,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets()
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(40)).current

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  const contact = (user.email || user.phone || '').trim()

  useEffect(() => {
    fade.setValue(0)
    slide.setValue(40)
    if (!visible) return
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [visible, fade, slide])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 4, opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user)}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {fullName || 'Mon compte'}
              </Text>
              {contact ? (
                <Text style={styles.contact} numberOfLines={1}>
                  {contact}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel="Fermer" accessibilityRole="button">
              <X size={20} color={dark.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.menu}>
            <MenuRow icon={<Crown size={20} color={dark.green} />} title="Abonnement et accès" onPress={onOpenAbonnement} />
            <MenuRow icon={<History size={20} color={dark.green} />} title="Historique des paiements" onPress={onOpenPayments} />
            <MenuRow icon={<MessageCircle size={20} color={dark.green} />} title="Support WhatsApp" onPress={onOpenSupport} />
            <MenuRow icon={<UserCog size={20} color={dark.green} />} title="Mon profil" onPress={onOpenProfile} last />
          </View>

          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
          >
            <LogOut size={18} color={dark.coral} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

function MenuRow({ icon, title, onPress, last }: { icon: ReactNode; title: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && { backgroundColor: '#F4F7FA' }]}
      accessibilityRole="button"
    >
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowTitle}>{title}</Text>
      <ChevronRight size={18} color="#9AA6B2" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,16,48,0.5)' },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#D8DEE4' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 20, color: dark.green },
  headerCopy: { flex: 1, gap: 1 },
  greeting: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
  name: { fontFamily: fonts.displayBold, fontSize: 19, color: dark.textPrimary },
  contact: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F4F7',
  },
  menu: { borderRadius: 20, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EAEFF3' },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
  },
  rowTitle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: dark.textPrimary },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 999,
    backgroundColor: dark.coralSoft,
  },
  logoutText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: dark.coral },
})
