import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, CloudDownload } from 'lucide-react-native'
import { useOffline } from '../context/OfflineContext'
import {
  cancelOfflinePackDownload,
  refreshOfflinePackStatus,
  startOfflinePackDownload,
  subscribeOfflinePack,
  type OfflinePackProgress,
} from '../utils/offlinePack'
import { dark } from '../theme'

/**
 * Bouton de téléchargement du Code hors connexion, placé dans l'en-tête :
 * nuage = à télécharger, pourcentage = en cours (appui = pause), coche verte = prêt sans connexion.
 */
export function OfflineHeaderButton() {
  const { isOffline } = useOffline()
  const [progress, setProgress] = useState<OfflinePackProgress | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeOfflinePack(setProgress)
    void refreshOfflinePackStatus()
    return unsubscribe
  }, [])

  if (!progress) return null
  const { running, done, total, complete } = progress
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Pressable
      style={({ pressed }) => [styles.btn, complete && styles.btnDone, pressed && styles.pressed]}
      disabled={complete || (isOffline && !running)}
      onPress={() => (running ? cancelOfflinePackDownload() : void startOfflinePackDownload())}
      accessibilityLabel={
        complete
          ? 'Code disponible sans connexion'
          : running
            ? 'Mettre le téléchargement en pause'
            : 'Télécharger le Code pour l’utiliser sans connexion'
      }
      hitSlop={8}
    >
      {complete ? (
        <Check size={22} color={dark.green} strokeWidth={3} />
      ) : running ? (
        <Text style={styles.percent}>{percent}%</Text>
      ) : (
        <>
          <CloudDownload size={22} color={isOffline ? '#94A3B8' : '#2563EB'} />
          {done > 0 ? <View style={styles.dot} /> : null}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FE',
  },
  btnDone: { backgroundColor: '#E6F7EC' },
  pressed: { opacity: 0.85 },
  percent: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#E8F0FE',
  },
})
