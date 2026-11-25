import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, CloudDownload, FileText, Pause, Play, Trash2, WifiOff } from 'lucide-react-native'
import Svg, { Circle } from 'react-native-svg'
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
import { dark, fonts, radii, shadows } from '../theme'

const formatMo = (bytes: number) => `${Math.max(1, Math.round(bytes / (1024 * 1024)))} Mo`

const STROKE = 6

/** Anneau de progression (pourcentage au centre). */
function ProgressRing({ ratio, complete, size: RING }: { ratio: number; complete: boolean; size: number }) {
  const radius = (RING - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, Math.max(0, ratio)))
  return (
    <View style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke="#E6EEF8" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={radius}
          stroke={dark.green}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        {complete ? (
          <Check size={30} color={dark.green} strokeWidth={3} />
        ) : (
          <Text style={[styles.ringText, { fontSize: RING * 0.26 }]}>{Math.round(ratio * 100)}%</Text>
        )}
      </View>
    </View>
  )
}

/**
 * Carte « Code sans connexion » : télécharge les audios et images pour réviser et passer des examens
 * hors ligne pendant toute la durée de l'abonnement. À n'afficher que si l'accès Code est actif.
 */
export function OfflinePackCard({ height, scale = 1 }: { height?: number; scale?: number }) {
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
    <View style={[styles.card, height ? { height, marginBottom: 0 } : null]}>
      <ProgressRing ratio={complete ? 1 : ratio} complete={complete} size={Math.round(58 * scale)} />
      <View style={styles.copy}>
        <Text style={[styles.title, { fontSize: 15 * scale, lineHeight: 19 * scale }]} numberOfLines={1}>
          {complete ? 'Code sans connexion prêt' : 'Code sans connexion'}
        </Text>
        <Text style={[styles.sub, { fontSize: 12.5 * scale }]} numberOfLines={1}>
          {isOffline && !complete
            ? 'Connecte-toi pour télécharger'
            : `${done} / ${total} fichiers${progress.bytes ? ` • ${formatMo(progress.bytes)}` : ''}${failed > 0 ? ` • ${failed} à réessayer` : ''}`}
        </Text>
      </View>
      {running ? (
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={cancelOfflinePackDownload}>
          <Pause size={15} color={dark.green} />
          <Text style={styles.btnGhostText}>Pause</Text>
        </Pressable>
      ) : complete ? (
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => void removeOfflinePack()}>
          <Trash2 size={15} color={dark.textMuted} />
          <Text style={[styles.btnGhostText, { color: dark.textMuted }]}>Libérer</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.btn, styles.btnPrimary, isOffline && styles.btnDisabled]}
          disabled={isOffline}
          onPress={start}
        >
          <Play size={15} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.btnPrimaryText}>{done > 0 ? 'Reprendre' : 'Télécharger'}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    ...shadows.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { fontFamily: fonts.displayBold, fontSize: 22, color: dark.textPrimary },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, color: dark.textPrimary },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: dark.textMuted },
  cloud: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FE',
    alignSelf: 'flex-start',
  },
  cloudDone: { backgroundColor: dark.greenSoft },
  divider: { height: 1, backgroundColor: 'rgba(0,16,48,0.07)', marginTop: 14, marginBottom: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  fileInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileText: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: dark.textPrimary },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
  },
  btnPrimary: { backgroundColor: '#16A34A' },
  btnPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
  btnGhost: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.14)' },
  btnGhostText: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.green },
  btnDisabled: { opacity: 0.5 },
})
