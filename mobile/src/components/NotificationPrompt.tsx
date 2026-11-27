import AsyncStorage from '@react-native-async-storage/async-storage'
import { Bell } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { dark, fonts } from '../theme'
import { enablePush, getPushStatus, listenNotificationTaps, needsInstallForPush, syncPushIfGranted } from '../utils/push'
import { PillButton } from './AuthLight'

const SHOW_DELAY_MS = 2500
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
const FOREVER_MS = 365 * 24 * 60 * 60 * 1000
const askedKey = (id: string) => `push-asked:${id}`

/**
 * Première connexion ou inscription : propose d'activer les notifications sur le téléphone,
 * pour les recevoir directement dans la liste des notifications, avec le logo de l'application.
 * Déjà autorisé : le téléphone est simplement ré-enregistré en silence.
 */
export function NotificationPrompt() {
  const { user } = useAuth()
  const userId = user?.id ? String(user.id) : ''
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const install = needsInstallForPush()

  useEffect(() => listenNotificationTaps(), [])

  useEffect(() => {
    setVisible(false)
    if (!userId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    void (async () => {
      const status = await getPushStatus()
      if (cancelled) return
      if (status === 'granted') {
        void syncPushIfGranted()
        return
      }
      if (status !== 'undetermined') return // refusé ou indisponible : on ne harcèle pas
      try {
        const until = Number((await AsyncStorage.getItem(askedKey(userId))) || 0)
        if (until > Date.now()) return
      } catch {
        // stockage indisponible : on affiche quand même
      }
      timer = setTimeout(() => {
        if (!cancelled) setVisible(true)
      }, SHOW_DELAY_MS)
    })()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [userId])

  const remember = useCallback(
    async (ms: number) => {
      try {
        await AsyncStorage.setItem(askedKey(userId), String(Date.now() + ms))
      } catch {
        // sans importance
      }
    },
    [userId],
  )

  const later = useCallback(async () => {
    setVisible(false)
    setMessage(undefined)
    await remember(SNOOZE_MS)
  }, [remember])

  const accept = async () => {
    setBusy(true)
    setMessage(undefined)
    const result = await enablePush()
    setBusy(false)
    if (result === 'granted') {
      await remember(FOREVER_MS)
      setVisible(false)
    } else if (result === 'denied') {
      await remember(FOREVER_MS)
      setMessage('Notifications refusées. Vous pourrez les activer dans les réglages de votre téléphone.')
      setTimeout(() => setVisible(false), 3500)
    } else {
      setMessage('Impossible d’activer les notifications pour le moment. Réessayez plus tard.')
    }
  }

  if (!userId) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={later}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Bell size={28} color="#0B7F47" />
          </View>
          <Text style={styles.title}>Recevoir tes notifications ?</Text>
          {install ? (
            <>
              <Text style={styles.text}>
                Sur iPhone, ajoute d’abord ce site à l’écran d’accueil : touche Partager, puis « Sur l’écran d’accueil ». Ouvre ensuite
                l’application depuis son icône et active les notifications.
              </Text>
              <PillButton label="J’ai compris" onPress={later} />
            </>
          ) : (
            <>
              <Text style={styles.text}>
                Sois prévenu directement sur ton téléphone, avec le logo de l’application : réservation confirmée, abonnement validé, rappels et
                annonces.
              </Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}
              <PillButton label={busy ? 'Activation…' : 'Activer les notifications'} onPress={accept} disabled={busy} />
              <Pressable onPress={later} hitSlop={8} accessibilityRole="button">
                <Text style={styles.later}>Plus tard</Text>
              </Pressable>
            </>
          )}
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
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
  },
  icon: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAF6EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 22, color: dark.textPrimary },
  text: { textAlign: 'center', fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: dark.textMuted },
  message: { textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#8A5200' },
  later: {
    textAlign: 'center',
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: dark.textMuted,
    textDecorationLine: 'underline',
  },
})
