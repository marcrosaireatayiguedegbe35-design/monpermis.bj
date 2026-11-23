import AsyncStorage from '@react-native-async-storage/async-storage'
import { Phone } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { getAuthErrorDetails, updateProfile } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { dark, fonts } from '../theme'
import { normalizePhone, PHONE_PLACEHOLDER, validatePhone } from '../utils/validation'
import { PillButton } from './AuthLight'
import { PillInput } from './PillInput'

/** Délai avant la demande du numéro après l'arrivée dans l'espace apprenant. */
const PROMPT_DELAY_MS = 3 * 60 * 1000
/** Si l'élève choisit « Plus tard », on ne redemande pas avant ce délai. */
const SNOOZE_MS = 24 * 60 * 60 * 1000
const CHECK_EVERY_MS = 15 * 1000

/** userId -> instant où l'on a vu l'utilisateur sans numéro (pour compter les « quelques minutes »). */
const firstSeen = new Map<string, number>()
const snoozeKey = (id: string) => `phone-reminder-snooze:${id}`

/**
 * Compte créé via Google (sans numéro) : l'élève entre directement dans l'espace apprenant,
 * puis une fenêtre lui demande son numéro quelques minutes plus tard (Mobile Money et rappels).
 */
export function PhoneReminderModal() {
  const { user, updateUser } = useAuth()
  const [visible, setVisible] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const shownRef = useRef(false)

  const userId = user?.id ? String(user.id) : ''
  const missingPhone = Boolean(userId) && !String(user?.phone || '').trim()

  useEffect(() => {
    shownRef.current = false
    setVisible(false)
    if (!missingPhone) return
    if (!firstSeen.has(userId)) firstSeen.set(userId, Date.now())

    let cancelled = false
    const check = async () => {
      if (cancelled || shownRef.current) return
      const elapsed = Date.now() - (firstSeen.get(userId) ?? Date.now())
      if (elapsed < PROMPT_DELAY_MS) return
      try {
        const until = Number((await AsyncStorage.getItem(snoozeKey(userId))) || 0)
        if (until > Date.now()) return
      } catch {
        // stockage indisponible : on affiche quand même
      }
      if (cancelled) return
      shownRef.current = true
      setVisible(true)
    }
    void check()
    const timer = setInterval(() => void check(), CHECK_EVERY_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [missingPhone, userId])

  const snooze = useCallback(async () => {
    setVisible(false)
    setError(undefined)
    try {
      await AsyncStorage.setItem(snoozeKey(userId), String(Date.now() + SNOOZE_MS))
    } catch {
      // sans importance
    }
  }, [userId])

  const save = async () => {
    const invalid = validatePhone(phone)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(undefined)
    setSaving(true)
    try {
      const { user: updated } = await updateProfile({ phone: normalizePhone(phone) })
      await updateUser(updated)
      setVisible(false)
    } catch (err) {
      setError(getAuthErrorDetails(err).message)
    } finally {
      setSaving(false)
    }
  }

  if (!missingPhone) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={snooze}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Ajoute ton numéro</Text>
          <Text style={styles.text}>
            Ton numéro sert à payer en Mobile Money et à recevoir tes rappels.
          </Text>
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
          <PillButton label={saving ? 'Enregistrement…' : 'Enregistrer'} onPress={save} disabled={saving} />
          <Pressable onPress={snooze} hitSlop={8} accessibilityRole="button">
            <Text style={styles.later}>Plus tard</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,16,48,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
  },
  title: { textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 22, color: dark.textPrimary },
  text: { textAlign: 'center', fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: dark.textMuted },
  later: {
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textMuted,
    textDecorationLine: 'underline',
  },
})
