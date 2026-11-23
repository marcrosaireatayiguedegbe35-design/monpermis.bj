import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { dark, fonts } from '../theme'

type Props = TextInputProps & {
  /** Libellé accessible (le champ n'affiche que son placeholder, comme le modèle Carentrix). */
  label: string
  icon: LucideIcon
  error?: string
}

/** Champ en pilule : icône à gauche, placeholder seul, œil pour les mots de passe, anneau vert au focus. */
export function PillInput({ label, icon: Icon, error, secureTextEntry, style, onFocus, onBlur, ...props }: Props) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  const isPassword = Boolean(secureTextEntry)
  const tint = error ? dark.coral : focused ? dark.green : '#7A8590'

  return (
    <View style={styles.group}>
      <View style={[styles.pill, focused && styles.pillFocused, error ? styles.pillError : null]}>
        <Icon size={20} color={tint} />
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, style]}
          placeholderTextColor="#7A8590"
          secureTextEntry={isPassword && !show}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...props}
          placeholder={props.placeholder ?? label}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setShow((v) => !v)}
            hitSlop={8}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {show ? <Eye size={20} color={tint} /> : <EyeOff size={20} color={tint} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#ECEFF3',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#0A1F33',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  pillFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: dark.green,
  },
  pillError: {
    borderColor: dark.coral,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 16,
    color: dark.textPrimary,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  eye: { padding: 4, marginRight: -4 },
  error: {
    marginLeft: 18,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.coral,
  },
})
