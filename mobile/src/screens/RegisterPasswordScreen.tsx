import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { registerUser } from '../api/auth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { validatePassword } from '../utils/validation'
import { showAuthError } from '../utils/showAuthError'

import { AuthLight, PillButton } from '../components/AuthLight'
import { PillInput } from '../components/PillInput'
import { Lock } from 'lucide-react-native'
type Nav = NativeStackNavigationProp<RootStackParamList, 'RegisterPassword'>
type Route = RouteProp<RootStackParamList, 'RegisterPassword'>

interface FormErrors {
  password?: string
  confirmPassword?: string
}

export function RegisterPasswordScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { firstName, lastName, phone } = route.params

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
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

  const handleSubmit = async () => {
    const passwordError = validatePassword(password)
    const confirmPasswordError = !confirmPassword
      ? 'Confirme ton mot de passe'
      : confirmPassword !== password
        ? 'Les mots de passe ne correspondent pas'
        : undefined

    if (passwordError || confirmPasswordError) {
      setErrors({ password: passwordError, confirmPassword: confirmPasswordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { message } = await registerUser({
        firstName,
        lastName,
        phone,
        password,
      })
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: {
              message:
                message || 'Compte créé. Connecte-toi avec ton téléphone et ton mot de passe.',
            },
          },
        ],
      })
    } catch (error) {
      showAuthError(error, 'Inscription impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLight
      title="Mot de passe"
      subtitle="Choisis un mot de passe pour finaliser ton inscription."
      onClose={() => navigation.goBack()}
    >
      <PillInput
        label="Mot de passe"
        icon={Lock}
        placeholder="Mot de passe"
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />
      <PillInput
        label="Confirmer le mot de passe"
        icon={Lock}
        placeholder="Confirmer le mot de passe"
        secureTextEntry
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
      />
      <Text style={styles.hint}>Min. 8 caractères, avec majuscule, minuscule et chiffre.</Text>
      <PillButton
        label={loading ? 'Inscription en cours…' : "S'inscrire"}
        onPress={handleSubmit}
        disabled={loading}
      />
    </AuthLight>
  )
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    textAlign: 'center',
  },
})
