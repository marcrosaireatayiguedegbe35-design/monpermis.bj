import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { CheckCircle2, CloudDownload, Trash2, WifiOff } from 'lucide-react-native'
import { useOffline } from '../context/OfflineContext'
import {
  cancelOfflinePackDownload,
  fetchOfflinePackSize,
  refreshOfflinePackStatus,
  removeOfflinePack,
  startOfflinePackDownload,
  subscribeOfflinePack,
  type OfflinePackProgress,
} from '../utils/offlinePack'
import { dark, fonts, radii } from '../theme'

const formatMo = (bytes: number) => `${Math.max(1, Math.round(bytes / (1024 * 1024)))} Mo`

/**
 * Carte « Code sans connexion » : télécharge les audios et images pour réviser et passer des examens
 * hors ligne pendant toute la durée de l'abonnement. À n'afficher que si l'accès Code est actif.
 */
export function OfflinePackCard() {
  const { isOffline } = useOffline()
  const [progress, setProgress] = useState<OfflinePackProgress | null>(null)
  const [sizeBytes, setSizeBytes] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeOfflinePack(setProgress)
    void refreshOfflinePackStatus()
    void fetchOfflinePackSize().then((info) => setSizeBytes(info?.totalBytes ?? null))
    return unsubscribe
  }, [])

  const start = useCallback(() => {
    void startOfflinePackDownload()
  }, [])

  if (!progress) return null
  const { running, done, total, complete, failed } = progress
  const ratio = total > 0 ? Math.min(1, done / total) : 0

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, complete && styles.iconWrapDone]}>
          {complete ? (
            <CheckCircle2 size={20} color="#FFFFFF" />
          ) : isOffline ? (
            <WifiOff size={20} color="#FFFFFF" />
          ) : (
            <CloudDownload size={20} color="#FFFFFF" />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {complete ? 'Code disponible sans connexion' : 'Utiliser le Code sans connexion'}
          </Text>
          <Text style={styles.sub}>
            {complete
              ? 'Les questions, les audios et les images sont sur ton téléphone, pendant toute la durée de ton abonnement.'
              : isOffline
                ? 'Connecte-toi à internet pour télécharger les audios et images.'
                : `Télécharge les audios et images une fois${sizeBytes ? ` (≈ ${formatMo(sizeBytes)})` : ''}, de préférence en Wi-Fi, puis révise et passe des examens sans internet.`}
          </Text>
        </View>
      </View>

      {running || (!complete && done > 0) ? (
        <View style={styles.progressBlock}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {done} / {total} fichiers{progress.bytes ? ` · ${formatMo(progress.bytes)}` : ''}
            {failed > 0 ? ` · ${failed} à réessayer` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {running ? (
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={cancelOfflinePackDownload}>
            <ActivityIndicator size="small" color={dark.green} />
            <Text style={styles.btnGhostText}>Mettre en pause</Text>
          </Pressable>
        ) : complete ? (
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => void removeOfflinePack()}>
            <Trash2 size={16} color={dark.textMuted} />
            <Text style={[styles.btnGhostText, { color: dark.textMuted }]}>Libérer l’espace</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, styles.btnPrimary, isOffline && styles.btnDisabled]}
            disabled={isOffline}
            onPress={start}
          >
            <CloudDownload size={16} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>{done > 0 ? 'Reprendre le téléchargement' : 'Télécharger'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.25)',
    gap: 10,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.textPrimary,
  },
  iconWrapDone: { backgroundColor: dark.green },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, color: dark.textPrimary },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: dark.textMuted },
  progressBlock: { gap: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,16,48,0.08)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: dark.green },
  progressText: { fontFamily: fonts.body, fontSize: 12, color: dark.textMuted },
  actions: { flexDirection: 'row' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
  },
  btnPrimary: { backgroundColor: dark.green },
  btnPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#FFFFFF' },
  btnGhost: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.12)' },
  btnGhostText: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.green },
  btnDisabled: { opacity: 0.5 },
})
