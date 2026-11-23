import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native'
import { loginUser, type AuthUser } from '../api/auth'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validatePhone,
  validatePassword,
} from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'

import { AuthLight, PillButton } from '../components/AuthLight'
import { PillInput } from '../components/PillInput'
import { Lock, Phone } from 'lucide-react-native'
type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>
type Route = RouteProp<RootStackParamList, 'Login'>

export function LoginScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { signIn } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ phone?: string; password?: string; info?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    const message = route.params?.message?.trim()
    if (message) {
      setErrors((prev) => ({ ...prev, info: message }))
      navigation.setParams({ message: undefined })
    }
  }, [route.params?.message, navigation])

  const finishAuth = useCallback(
    async (token: string, user: Awaited<ReturnType<typeof loginUser>>['user']) => {
      await signIn(token, user)
      if (!String(user.phone || '').trim()) {
        navigation.reset({ index: 0, routes: [{ name: 'CompletePhone' }] })
        return
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
    },
    [navigation, signIn],
  )

  const handleSubmit = async () => {
    const phoneError = validatePhone(phone)
    const passwordError = validatePassword(password)

    if (phoneError || passwordError) {
      setErrors({ phone: phoneError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({
        identifier: normalizePhone(phone),
        password,
      })
      await finishAuth(token, user)
    } catch (error) {
      showAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (user: AuthUser, token: string) => {
    await finishAuth(token, user)
  }

  return (
    <AuthLight
      title="Content de te revoir"
      subtitle="Connecte-toi pour reprendre ta préparation au permis."
      onClose={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Onboarding'))}
      footer={
        <>
          Pas encore de compte ?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            S'inscrire
          </Text>
        </>
      }
    >
      {errors.info ? <Text style={styles.info}>{errors.info}</Text> : null}
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
        label="Téléphone"
        icon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={(value) => setPhone(normalizePhone(value))}
        error={errors.phone}
      />
      <PillInput
        label="Mot de passe"
        icon={Lock}
        placeholder="Mot de passe"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />
      <Text style={styles.forgotWrap}>
        <Text style={styles.link} onPress={() => navigation.navigate('ForgotPassword')}>
          Mot de passe oublié ?
        </Text>
      </Text>

      <PillButton
        label={loading ? 'Connexion en cours…' : 'Se connecter'}
        onPress={handleSubmit}
        disabled={loading}
      />
    </AuthLight>
  )
}

const styles = StyleSheet.create({
  info: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.green,
    textAlign: 'center',
  },
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
  forgotWrap: { textAlign: 'right', marginRight: 6, marginTop: -4 },
  link: {
    fontFamily: fonts.bodySemiBold,
    color: dark.textPrimary,
    textDecorationLine: 'underline',
  },
})
