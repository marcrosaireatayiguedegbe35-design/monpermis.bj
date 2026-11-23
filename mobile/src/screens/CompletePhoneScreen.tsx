import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Phone } from 'lucide-react-native'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { getAuthErrorDetails, updateProfile } from '../api/auth'
import { AuthLight, PillButton } from '../components/AuthLight'
import { PillInput } from '../components/PillInput'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { normalizePhone, PHONE_PLACEHOLDER, validatePhone } from '../utils/validation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CompletePhone'>

/** Étape après une connexion Google sans numéro : saisie du téléphone (Mobile Money et rappels). */
export function CompletePhoneScreen() {
  const navigation = useNavigation<Nav>()
  const { updateUser } = useAuth()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)

  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })

  const save = async () => {
    const invalid = validatePhone(phone)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      const { user: updated } = await updateProfile({ phone: normalizePhone(phone) })
      await updateUser(updated)
      goHome()
    } catch (err) {
      setError(getAuthErrorDetails(err).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLight
      title="Ton numéro de téléphone"
      subtitle="Il sert à payer en Mobile Money et à recevoir tes rappels."
    >
      <PillInput
        label="Téléphone"
        icon={Phone}
        placeholder={PHONE_PLACEHOLDER}
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={(value) => setPhone(normalizePhone(value))}
        error={error}
      />
      <PillButton label={loading ? 'Enregistrement…' : 'Continuer'} onPress={save} disabled={loading} />
      <Text style={styles.later} onPress={goHome}>
        Plus tard
      </Text>
    </AuthLight>
  )
}

const styles = StyleSheet.create({
  later: {
    textAlign: 'center',
    marginTop: 4,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textMuted,
    textDecorationLine: 'underline',
  },
})
