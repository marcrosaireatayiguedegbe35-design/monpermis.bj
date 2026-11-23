import { Alert, Platform } from 'react-native'

/** Alert.alert est sans effet sur le web (react-native-web) : on utilise window.alert à la place. */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`)
    return
  }
  Alert.alert(title, message)
}

/** Confirmation Oui/Non : window.confirm sur le web (Alert.alert avec boutons est inopérant), Alert sinon. */
export function confirmAction(title: string, message: string, confirmLabel = 'Confirmer'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false)
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ])
  })
}
