import { Alert, Platform } from 'react-native'

/** Alert.alert est sans effet sur le web (react-native-web) : on utilise window.alert à la place. */
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`)
    return
  }
  Alert.alert(title, message)
}
