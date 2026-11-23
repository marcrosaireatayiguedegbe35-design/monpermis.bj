import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { useAuth } from '../context/AuthContext'
import type { AuthUser } from '../api/auth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validateName,
  validatePhone,
} from '../utils/validation'

import { AuthLight, PillButton } from '../components/AuthLight'
import { PillInput } from '../components/PillInput'
import { Phone, User } from 'lucide-react-native'
type Nav = NativeStackNavigationProp<RootStackParamList, 'Register'>

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  terms?: string
}

export function RegisterScreen() {
  const navigation = useNavigation<Nav>()
  const { signIn } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors & { form?: string }>({})
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslate = useRef(new Animated.Value(16)).current

  useEffect(() => {
    setStatusBarStyle('dark')
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 520,
        useNativeDriver: true,
      }),
    ]).start()
    return () => setStatusBarStyle('dark')
  }, [contentOpacity, contentTranslate])

  const handleContinue = () => {
    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      phone: validatePhone(phone),
      terms: !acceptTerms ? "Veuillez accepter les conditions d'utilisation" : undefined,
    }

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    navigation.navigate('RegisterPassword', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizePhone(phone),
    })
  }

  const handleGoogleSuccess = async (user: AuthUser, token: string) => {
    await signIn(token, user)
    if (!String(user.phone || '').trim()) {
      navigation.reset({ index: 0, routes: [{ name: 'CompletePhone' }] })
      return
    }
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
  }

  return (
    <AuthLight
      title="Crée ton compte"
      subtitle="Quelques infos et tu démarres ta préparation au permis."
      onClose={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Onboarding'))}
      footer={
        <>
          Déjà inscrit ?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
            Se connecter
          </Text>
        </>
      }
    >
      {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

      <GoogleAuthButton
        label="Continuer avec Google"
        onSuccess={handleGoogleSuccess}
        onError={(message) => setErrors({ form: message })}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou</Text>
        <View style={styles.dividerLine} />
      </View>

      <PillInput
        label="Prénom"
        icon={User}
        placeholder="Prénom"
        autoComplete="name-given"
        autoCapitalize="words"
        value={firstName}
        onChangeText={setFirstName}
        error={errors.firstName}
      />
      <PillInput
        label="Nom"
        icon={User}
        placeholder="Nom"
        autoComplete="name-family"
        autoCapitalize="words"
        value={lastName}
        onChangeText={setLastName}
        error={errors.lastName}
      />
      <PillInput
        label="Téléphone"
        icon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={(value) => setPhone(normalizePhone(value))}
        error={errors.phone}
      />

      <View style={styles.checkboxRow}>
        <Pressable style={styles.checkboxHit} onPress={() => setAcceptTerms((prev) => !prev)} hitSlop={8}>
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]} />
        </Pressable>
        <Text style={styles.checkboxLabel}>
          J'accepte les{' '}
          <Text style={styles.checkboxLink} onPress={() => navigation.navigate('TermsOfUse')}>
            conditions d'utilisation
          </Text>
        </Text>
      </View>
      {errors.terms ? <Text style={styles.termsError}>{errors.terms}</Text> : null}

      <PillButton label="Continuer" onPress={handleContinue} />
    </AuthLight>
  )
}

const styles = StyleSheet.create({
  formError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.coral,
    backgroundColor: dark.coralSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: dark.border },
  dividerText: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 6 },
  checkboxHit: { padding: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#B8C0C8',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: dark.green, borderColor: dark.green },
  checkboxLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    lineHeight: 20,
  },
  checkboxLink: { color: dark.green, fontFamily: fonts.bodySemiBold },
  termsError: { marginLeft: 6, fontFamily: fonts.bodyMedium, fontSize: 12, color: dark.coral },
  link: {
    fontFamily: fonts.bodySemiBold,
    color: dark.textPrimary,
    textDecorationLine: 'underline',
  },
})
