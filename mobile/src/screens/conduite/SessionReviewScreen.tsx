import { useEffect, useState } from 'react'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, Lock, Star, ThumbsDown, ThumbsUp } from 'lucide-react-native'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchPendingReviews, submitSessionReview, ReservationError, type PendingReview } from '../../api/reservations'
import { Bouncy } from '../../components/Bouncy'
import { FlowHeader } from '../../components/FlowHeader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'SessionReview'>
type Route = RouteProp<RootStackParamList, 'SessionReview'>

const CRITERIA = [
  { key: 'punctuality', label: 'Ponctualité' },
  { key: 'pedagogy', label: 'Pédagogie et explications' },
  { key: 'vehicle', label: 'Véhicule et sécurité' },
] as const

const LABELS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent']

function Stars({ value, onChange, size = 30, label }: { value: number; onChange: (n: number) => void; size?: number; label: string }) {
  return (
    <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ selected: value === n }} accessibilityLabel={`${n} sur 5`}>
          <Star size={size} color={n <= value ? '#F5A623' : '#CBD5E1'} fill={n <= value ? '#F5A623' : 'transparent'} strokeWidth={1.8} />
        </Pressable>
      ))}
    </View>
  )
}

function dateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return date
  }
}

/** Avis après séance : une note, trois questions et un commentaire. Confidentiel : l'administration seule le lit. */
export function SessionReviewScreen() {
  const navigation = useNavigation<Nav>()
  const { params } = useRoute<Route>()
  const { user } = useRequireAuth(navigation)
  const unread = useUnreadNotifications(Boolean(user))
  const [session, setSession] = useState<PendingReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [rating, setRating] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({ punctuality: 0, pedagogy: 0, vehicle: 0 })
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchPendingReviews()
      .then((data) => {
        const found = data.reviews.find((item) => item.reservationId === params.reservationId)
        if (found) setSession(found)
        else setMissing(true)
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false))
  }, [user, params.reservationId])

  const ready = rating > 0 && CRITERIA.every((c) => scores[c.key] > 0)

  const send = async () => {
    if (!ready || sending) return
    setSending(true)
    setError(null)
    try {
      await submitSessionReview(params.reservationId, {
        rating,
        punctuality: scores.punctuality,
        pedagogy: scores.pedagogy,
        vehicle: scores.vehicle,
        wouldRecommend: recommend !== false,
        comment: comment.trim(),
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Envoi impossible, réessayez.')
    } finally {
      setSending(false)
    }
  }

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Conduite'))

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <FlowHeader
          title="Votre avis"
          subtitle={session ? `Séance du ${dateLabel(session.date)}` : 'Après votre séance'}
          unread={unread}
          onBack={goBack}
          onBell={() => navigation.navigate('Notifications')}
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={dark.green} />
          </View>
        ) : done ? (
          <View style={styles.center}>
            <View style={styles.doneBadge}>
              <Check size={38} color="#FFFFFF" strokeWidth={3.2} />
            </View>
            <Text style={styles.doneTitle}>Merci pour votre avis !</Text>
            <Text style={styles.doneText}>Il nous aide à améliorer chaque séance de conduite.</Text>
            <Bouncy scaleTo={0.98} onPress={() => navigation.navigate('Conduite')}>
              <View style={styles.bigBtn}>
                <Text style={styles.bigBtnText}>Retour à la conduite</Text>
              </View>
            </Bouncy>
          </View>
        ) : missing || !session ? (
          <View style={styles.center}>
            <Text style={styles.doneTitle}>Avis déjà envoyé</Text>
            <Text style={styles.doneText}>Cette séance a déjà été notée, ou elle n’est plus disponible.</Text>
            <Bouncy scaleTo={0.98} onPress={() => navigation.navigate('Conduite')}>
              <View style={styles.bigBtn}>
                <Text style={styles.bigBtnText}>Retour à la conduite</Text>
              </View>
            </Bouncy>
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <Text style={styles.who}>Séance avec {session.moniteurName}</Text>
                <Text style={styles.when}>{session.startTime} – {session.endTime}</Text>
                <Text style={styles.q}>Comment s’est passée votre séance ?</Text>
                <Stars value={rating} onChange={setRating} size={40} label="Note globale" />
                <Text style={styles.ratingLabel}>{LABELS[rating] || 'Touchez une étoile'}</Text>
              </View>

              <View style={styles.card}>
                {CRITERIA.map((c) => (
                  <View key={c.key} style={styles.crit}>
                    <Text style={styles.critLabel}>{c.label}</Text>
                    <Stars value={scores[c.key]} onChange={(n) => setScores((prev) => ({ ...prev, [c.key]: n }))} size={26} label={c.label} />
                  </View>
                ))}
                <View style={styles.crit}>
                  <Text style={styles.critLabel}>Recommanderiez-vous ce moniteur ?</Text>
                  <View style={styles.yesno}>
                    <Pressable style={[styles.yn, recommend === true && styles.ynYes]} onPress={() => setRecommend(true)}>
                      <ThumbsUp size={18} color={recommend === true ? '#FFFFFF' : '#0A1E55'} />
                      <Text style={[styles.ynText, recommend === true && { color: '#FFFFFF' }]}>Oui</Text>
                    </Pressable>
                    <Pressable style={[styles.yn, recommend === false && styles.ynNo]} onPress={() => setRecommend(false)}>
                      <ThumbsDown size={18} color={recommend === false ? '#FFFFFF' : '#0A1E55'} />
                      <Text style={[styles.ynText, recommend === false && { color: '#FFFFFF' }]}>Non</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.critLabel}>Un commentaire ? (facultatif)</Text>
                <TextInput
                  style={styles.input}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Ce qui s’est bien passé, ce qui pourrait être mieux…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  maxLength={1000}
                />
              </View>

              <View style={styles.privacy}>
                <Lock size={15} color="#5B6B86" />
                <Text style={styles.privacyText}>Votre avis est confidentiel : il est lu uniquement par l’administration, jamais par le moniteur.</Text>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.bottom}>
              <Bouncy scaleTo={0.98} disabled={!ready || sending} onPress={() => void send()}>
                <View style={[styles.bigBtn, (!ready || sending) && { opacity: 0.55 }]}>
                  <Text style={styles.bigBtnText}>{sending ? 'Envoi…' : 'Envoyer mon avis'}</Text>
                </View>
              </Bouncy>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FBFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28 },
  scroll: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16, gap: 12 },
  card: { padding: 16, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', gap: 8, ...shadows.md },
  who: { fontFamily: fonts.displayBold, fontSize: 18, color: '#0A1E55', textAlign: 'center' },
  when: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#5B6B86', textAlign: 'center' },
  q: { marginTop: 6, fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#0A1E55', textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  ratingLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#B45309', textAlign: 'center', minHeight: 20 },
  crit: { gap: 8, paddingVertical: 6 },
  critLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: '#0A1E55' },
  yesno: { flexDirection: 'row', gap: 10 },
  yn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, backgroundColor: '#EEF2F7' },
  ynYes: { backgroundColor: dark.green },
  ynNo: { backgroundColor: '#B42318' },
  ynText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#0A1E55' },
  input: { minHeight: 84, padding: 12, borderRadius: 14, backgroundColor: '#F4F7FB', fontFamily: fonts.body, fontSize: 15, color: '#0A1E55', textAlignVertical: 'top' },
  privacy: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  privacyText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 17, color: '#5B6B86' },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#B42318', textAlign: 'center' },
  bottom: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 14 },
  bigBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: dark.green, paddingHorizontal: 28 },
  bigBtnText: { fontFamily: fonts.displayBold, fontSize: 17, color: '#FFFFFF' },
  doneBadge: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#22BF63', alignItems: 'center', justifyContent: 'center', ...shadows.md },
  doneTitle: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: '#0A1E55', textAlign: 'center' },
  doneText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: '#5B6B86', textAlign: 'center' },
})
