import { useEffect, useMemo, useState } from 'react'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CalendarCheck, Car, Check, ChevronRight, Clock, CreditCard, House, Info, Timer, User, Wallet } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Bouncy } from '../../components/Bouncy'
import { RES, ReserveButton, ReserveHeader, ReserveOutlineButton, StepChip } from '../../components/ReserveFrame'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, shadows } from '../../theme'
import { fetchMyReservations } from '../../api/reservations'
import { MeetingPointCard } from '../../components/MeetingPointCard'
import { safeOpenUrl } from '../../utils/safeOpenUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReservationConfirm'>
type Route = RouteProp<RootStackParamList, 'ReservationConfirm'>

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return date
  }
}

export function ReservationConfirmScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const {
    moniteurName,
    vehicleBrand,
    date,
    startTime,
    endTime,
    hours,
    priceFcfa,
    paymentMethod,
    whatsappLink,
    fromList,
  } = route.params

  const calendarUrl = useMemo(() => {
    if (!date || !startTime || !endTime) return ''
    const start = `${date.replace(/-/g, '')}T${startTime.replace(':', '')}00`
    const end = `${date.replace(/-/g, '')}T${endTime.replace(':', '')}00`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      'Séance de conduite — Monpermis.bj',
    )}&dates=${start}/${end}`
  }, [date, startTime, endTime])

  const [meeting, setMeeting] = useState<{ url: string; note: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    void fetchMyReservations()
      .then((data) => {
        const found = data.reservations.find((item) => String(item.id) === String(route.params.reservationId))
        if (!cancelled && found?.moniteur && (found.moniteur.meetingPointUrl || found.moniteur.meetingPointNote)) {
          setMeeting({ url: found.moniteur.meetingPointUrl || '', note: found.moniteur.meetingPointNote || '' })
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [route.params.reservationId])

  const unread = useUnreadNotifications(true)
  const rows: { key: string; label: string; value: string; Icon: typeof Car; green?: boolean }[] = [
    ...(vehicleBrand ? [{ key: 'v', label: 'Véhicule', value: vehicleBrand, Icon: Car }] : []),
    { key: 'd', label: 'Date', value: formatDateLabel(date), Icon: CalendarCheck },
    { key: 'h', label: 'Horaire', value: `${startTime} – ${endTime}`, Icon: Clock },
    { key: 'u', label: 'Durée', value: `${hours} heure${hours > 1 ? 's' : ''}`, Icon: Timer },
    ...(priceFcfa > 0
      ? [{ key: 'm', label: 'Montant', value: `${priceFcfa.toLocaleString('fr-FR')} FCFA`, Icon: Wallet, green: true }]
      : []),
    {
      key: 'p',
      label: 'Paiement',
      value: paymentMethod === 'solde' || paymentMethod === 'promo' ? 'Solde / code promo' : 'Mobile Money',
      Icon: CreditCard,
    },
  ]

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ReserveHeader
          title={fromList ? 'Détail de la séance' : 'Réservation confirmée'}
          unread={unread}
          onBack={() => {
            if (fromList) navigation.goBack()
            else navigation.navigate('MesReservations')
          }}
          onBell={() => navigation.navigate('Notifications')}
        />
        <StepChip done label={fromList ? 'Séance confirmée' : 'Terminé • Séance réservée'} />
        <View style={styles.scroll}>
          <View style={styles.badgeWrap}>
            <View style={styles.badgeHalo}>
              <View style={styles.badgeCore}>
                <Check size={30} color="#FFFFFF" strokeWidth={3.2} />
              </View>
            </View>
          </View>
          <Text style={styles.title}>{fromList ? 'Séance confirmée' : 'Réservation confirmée !'}</Text>
          <Text style={styles.subtitle}>
            {fromList
              ? 'Voici les détails de votre séance de conduite.'
              : 'Votre séance a bien été prise en compte. Conservez ces informations.'}
          </Text>

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.avatar}>
                <User size={30} color={RES.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headLabel}>Moniteur</Text>
                <Text style={styles.headName} numberOfLines={2}>{moniteurName}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.grid}>
              {rows.map((row) => (
                <View key={row.key} style={styles.cell}>
                  <View style={styles.rowIcon}>
                    <row.Icon size={18} color={RES.green} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={[styles.rowValue, row.green && { color: RES.green }]} numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {meeting ? <MeetingPointCard url={meeting.url} note={meeting.note} /> : null}

          <View style={styles.info}>
            <Info size={18} color={RES.green} />
            <Text style={styles.infoText}>Vous recevrez une notification avec les détails.</Text>
          </View>

          <View style={{ flex: 1 }} />
          {calendarUrl ? (
            <ReserveButton
              label="Ajouter à mon agenda"
              icon={<CalendarCheck size={22} color="#FFFFFF" />}
              onPress={() => void safeOpenUrl(calendarUrl)}
            />
          ) : null}
          {whatsappLink ? (
            <ReserveOutlineButton label="Notifier par WhatsApp" onPress={() => void safeOpenUrl(whatsappLink)} />
          ) : null}
          <ReserveOutlineButton
            label="Retour à l’accueil"
            icon={<House size={22} color={RES.green} />}
            onPress={() => navigation.navigate('Home')}
          />
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 14, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  cell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  badgeWrap: { alignItems: 'center', marginTop: 4 },
  badgeHalo: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(31,191,98,0.14)', alignItems: 'center', justifyContent: 'center' },
  badgeCore: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0B7F47', alignItems: 'center', justifyContent: 'center', ...shadows.md },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: '#0B1F3A', textAlign: 'center', letterSpacing: -0.6 },
  subtitle: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: '#4D5F80', textAlign: 'center', marginTop: -4 },
  card: { padding: 16, borderRadius: 32, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE6E1', ...shadows.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#DDF4E6', alignItems: 'center', justifyContent: 'center' },
  headLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: RES.green },
  headName: { fontFamily: fonts.displayBold, fontSize: 19, color: '#0B1F3A' },
  divider: { height: 1, backgroundColor: 'rgba(0,16,48,0.07)', marginVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E7F7EC', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#4D5F80' },
  rowValue: { fontFamily: fonts.displayBold, fontSize: 14.5, color: '#0B1F3A' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 22, backgroundColor: '#EAF6EF' },
  infoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#22BF63', alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: '#0B1F3A' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 56, borderRadius: 28, backgroundColor: '#22BF63', ...shadows.md },
  primaryText: { fontFamily: fonts.displayBold, fontSize: 18, color: '#FFFFFF' },
  outline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#22BF63', backgroundColor: '#FFFFFF' },
  outlineText: { fontFamily: fonts.displayBold, fontSize: 17, color: '#0B1F3A' },
  link: { alignSelf: 'center', padding: 6 },
  linkText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: RES.green, textDecorationLine: 'underline' },
})
