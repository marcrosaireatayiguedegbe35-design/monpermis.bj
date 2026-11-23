import { X } from 'lucide-react-native'
import type { ReactNode } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Bouncy } from './Bouncy'
import { LegalFooter } from './LegalFooter'
import { dark, fonts, gradients } from '../theme'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
}

/** Cadre clair des pages d'authentification (modèle Carentrix) : logo centré, titre, champs en pilule. */
export function AuthLight({ title, subtitle, children, footer, onClose }: Props) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <X size={22} color={dark.textPrimary} />
          </Pressable>
        ) : null}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.column}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {children}
              {footer ? <Text style={styles.footer}>{footer}</Text> : null}
              <LegalFooter />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

/** Bouton principal en pilule dégradé vert. */
export function PillButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Bouncy onPress={onPress} disabled={disabled} scaleTo={0.97} style={disabled ? styles.disabled : undefined}>
      <LinearGradient
        colors={gradients.green}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </LinearGradient>
    </Bouncy>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  close: {
    position: 'absolute',
    top: 8,
    left: 14,
    zIndex: 5,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  column: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 },
  logo: { alignSelf: 'center', width: 190, height: 72, marginBottom: 14 },
  title: {
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 34,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    marginTop: -10,
    marginBottom: 8,
  },
  footer: {
    textAlign: 'center',
    marginTop: 18,
    fontFamily: fonts.body,
    fontSize: 15,
    color: dark.textPrimary,
  },
  button: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: dark.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  buttonText: { fontFamily: fonts.displayBold, fontSize: 16, color: '#FFFFFF' },
  disabled: { opacity: 0.7 },
})
