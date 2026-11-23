import { useEffect } from 'react'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'
import { useFonts } from './src/hooks/useFonts'
import { RootNavigator } from './src/navigation/RootNavigator'
import { brand } from './src/theme'
import { ensureAudioSession } from './src/utils/audioSession'
import { MOBILE_MAX_WIDTH } from './src/utils/viewport'

const BOOT_BG = '#FAF9F6'

export default function App() {
  const [fontsLoaded] = useFonts()

  useEffect(() => {
    void ensureAudioSession()
  }, [])

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={brand.green} />
      </View>
    )
  }

  const app = (
    <View style={styles.root}>
      <RootNavigator />
    </View>
  )

  // Web : toujours au format téléphone, centré (jamais en pleine largeur PC ou tablette).
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webBackdrop}>
        <View style={styles.webPhone}>{app}</View>
      </View>
    )
  }

  return app
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BOOT_BG,
  },
  webBackdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E8E6E1',
  },
  webPhone: {
    flex: 1,
    width: '100%',
    maxWidth: MOBILE_MAX_WIDTH,
    overflow: 'hidden',
    backgroundColor: BOOT_BG,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_BG,
  },
})
