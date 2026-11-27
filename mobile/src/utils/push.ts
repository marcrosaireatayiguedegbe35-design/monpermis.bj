import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { apiAuthed } from '../api/client'

/** Notifications poussées de l'application mobile (jeton Expo envoyé au serveur). */

export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function needsInstallForPush() {
  return false
}

export async function getPushStatus(): Promise<PushStatus> {
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status === 'granted') return 'granted'
    if (status === 'denied') return 'denied'
    return 'undetermined'
  } catch {
    return 'unsupported'
  }
}

async function registerToken() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Monpermis.bj',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0B7F47',
    })
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  const { data: expoToken } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  await apiAuthed('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ expoToken, platform: Platform.OS }),
  })
}

/** Demande l'autorisation (à appeler depuis un appui) puis enregistre le téléphone. */
export async function enablePush(): Promise<'granted' | 'denied' | 'error'> {
  try {
    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return 'denied'
    await registerToken()
    return 'granted'
  } catch {
    return 'error'
  }
}

/** Déjà autorisé : le téléphone est simplement ré-enregistré (jeton renouvelé, nouvelle connexion). */
export async function syncPushIfGranted() {
  try {
    if ((await getPushStatus()) === 'granted') await registerToken()
  } catch {
    /* sans importance : la prochaine ouverture réessaiera */
  }
}

/** Toucher une notification ouvre la page indiquée. */
export function listenNotificationTaps() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = String(response.notification.request.content.data?.url || '').replace(/^\//, '')
    if (url) void Linking.openURL(Linking.createURL(url)).catch(() => undefined)
  })
  return () => subscription.remove()
}
