import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { History } from 'lucide-react-native'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  fetchDrivingHistory,
  ReservationError,
  type DrivingHistory,
  type DrivingHistorySession,
} from '../../api/reservations'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ProgressBar } from '../../components/ProgressBar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'HistoriqueConduite'>

function hoursText(value: number) {
  const rounded = Math.round(value * 100) / 100
  return `${String(rounded).replace('.', ',')} h`
}

function dayText(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return date
  }
}

function monthTitle(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  } catch {
    return date
  }
}

/** Historique de conduite : total d'heures sur le minimum de 48 h, puis séances par mois. */
export function HistoriqueConduiteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [data, setData] = useState<DrivingHistory | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setData(await fetchDrivingHistory())
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    } finally {
      setBusy(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const groups = useMemo(() => {
    const map = new Map<string, DrivingHistorySession[]>()
    for (const item of data?.sessions ?? []) {
      const key = item.date.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [data])

  if (loading || !user) return <ScreenLoader />

  const summary = data?.summary

  return (
    <DarkScreen>
      <PageNavbar title="Historique de conduite" icon={History} onBack={() => navigation.goBack()} tone="drive" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {busy && !data ? <ActivityIndicator color={dark.green} style={{ marginVertical: 20 }} /> : null}

        {summary ? (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Heures de conduite effectuées</Text>
            <Text style={styles.summaryBig}>
              {hoursText(summary.heuresEffectuees)}
              <Text style={styles.summaryOf}> / {summary.heuresObjectif} h</Text>
            </Text>
            <ProgressBar
              progress={summary.percent / 100}
              color={dark.green}
              trackColor="rgba(0,16,48,0.08)"
              height={9}
            />
            <Text style={styles.summaryHint}>
              Minimum exigé : {summary.heuresMinimum} h.{' '}
              {summary.heuresRestantes > 0
                ? `Il te reste ${hoursText(summary.heuresRestantes)} à effectuer.`
                : 'Bravo, tu as atteint le minimum !'}
            </Text>
          </View>
        ) : null}

        {!busy && data && data.sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune séance pour le moment</Text>
            <Text style={styles.emptyText}>Tes séances terminées apparaîtront ici avec leur durée.</Text>
            <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('ReservationFlow')}>
              <Text style={styles.primaryBtnText}>Réserver une séance</Text>
            </Pressable>
          </View>
        ) : null}

        {groups.map(([key, list]) => (
          <View key={key}>
            <Text style={styles.section}>{monthTitle(`${key}-01`)}</Text>
            {list.map((item) => {
              const cancelled = item.status === 'cancelled'
              return (
                <View key={item.id} style={[styles.card, cancelled && styles.cardCancelled]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.badge, cancelled && styles.badgeCancelled]}>
                      <Text style={[styles.badgeText, cancelled && styles.badgeTextCancelled]}>
                        {cancelled ? 'Annulée' : 'Effectuée'}
                      </Text>
                    </View>
                    {!cancelled ? <Text style={styles.hours}>{hoursText(item.hours)}</Text> : null}
                  </View>
                  <Text style={styles.cardTitle}>{dayText(item.date)}</Text>
                  <Text style={styles.cardLine}>
                    {item.startTime} – {item.endTime}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.moniteurName || 'Moniteur'}
                    {item.vehicleBrand ? ` · ${item.vehicleBrand}` : ''}
                  </Text>
                </View>
              )
            })}
          </View>
        ))}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32, gap: 8 },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: dark.coral },
  summary: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 6,
  },
  summaryLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: dark.textMuted },
  summaryBig: { fontFamily: fonts.displayExtraBold, fontSize: 32, color: dark.textPrimary },
  summaryOf: { fontFamily: fonts.displayBold, fontSize: 18, color: dark.textMuted },
  summaryHint: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: dark.textMuted },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  cardCancelled: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  badge: { backgroundColor: dark.green, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeCancelled: { backgroundColor: 'rgba(0,16,48,0.08)' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#0B0F1A' },
  badgeTextCancelled: { color: dark.textMuted },
  hours: { fontFamily: fonts.displayBold, fontSize: 16, color: dark.green },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: dark.textPrimary, textTransform: 'capitalize' },
  cardLine: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.green },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
  empty: { alignItems: 'center', paddingTop: 30, gap: 10 },
  emptyTitle: { fontFamily: fonts.displayExtraBold, fontSize: 20, color: dark.textPrimary },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: dark.textMuted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { marginTop: 12, backgroundColor: dark.green, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22 },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#0B0F1A' },
})
