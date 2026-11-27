import { MeetingPointCard } from '../../components/MeetingPointCard'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  Calendar,
  CalendarOff,
  CalendarPlus,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Images,
  MapPin,
  Pencil,
  RefreshCw,
  ShieldCheck,
  User,
  Wallet,
  X,
  Moon,
  Sun,
  Sunset,
  Timer,
  CalendarCheck,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  computeDrivingAmount,
  createReservation,
  earliestBookableTime,
  fetchMoniteurAvailability,
  fetchMoniteurProfile,
  fetchPublicMoniteurs,
  HOURS_DISCOUNT_FCFA,
  HOURS_DISCOUNT_MIN_HOURS,
  requestReservationSlot,
  ReservationError,
  type AvailabilityDay,
  type AvailabilityWindow,
  type GroupSlot,
  type MoniteurProfile,
  type MoniteurPublic,
} from '../../api/reservations'
import { fetchAccessMe } from '../../api/accessRequests'
import { Bouncy } from '../../components/Bouncy'
import { CodeRouteBanner } from '../../components/CodeRouteBanner'
import { FlowHeader } from '../../components/FlowHeader'
import { DriveModuleIcon } from '../../components/ModuleIcons'
import { EmptyState } from '../../components/EmptyState'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import {
  ReservationMobileMoneyCheckout,
  type ReservationCheckoutSlot,
} from '../../components/ReservationMobileMoneyCheckout'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useHoldTimer } from '../../hooks/useHoldTimer'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'
import { optimizedImageUrl, resolveMediaUrl } from '../../utils/mediaUrl'
import { useViewport } from '../../utils/viewport'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReservationFlow'>
type Step = 'moniteur' | 'profile' | 'duration' | 'slots'

const DURATION_OPTIONS = [1, 2, 3, 4]

/** « Marc Rosaire ATAYI GUEDEGBE » → prénoms / nom (les mots tout en majuscules forment le nom). */
function splitFullName(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  const firstUpper = words.findIndex((w, i) => i > 0 && w === w.toUpperCase() && /[A-ZÀ-Ý]/.test(w))
  const cut = firstUpper > 0 ? firstUpper : words.length > 1 ? 1 : words.length
  return { first: words.slice(0, cut).join(' '), last: words.slice(cut).join(' ') }
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map((v) => parseInt(v, 10) || 0)
  return h * 60 + m
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Créneaux de départ possibles pour une durée, dans les fenêtres libres.
 * `minStart` exclut les heures déjà passées si l'écran reste ouvert.
 */
function slotsForDuration(
  windows: AvailabilityWindow[],
  durationHours: number,
  minStart: string | null = null,
  stepMinutes = 30,
) {
  const durationMin = Math.round(durationHours * 60)
  const floorMin = minStart ? timeToMinutes(minStart) : -1
  const out: { start: string; end: string }[] = []
  for (const window of windows) {
    const startMin = Math.max(timeToMinutes(window.start), floorMin)
    const endMin = timeToMinutes(window.end)
    for (let t = startMin; t + durationMin <= endMin; t += stepMinutes) {
      out.push({
        start: minutesToTime(t),
        end: minutesToTime(t + durationMin),
      })
    }
  }
  return out
}

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return date
  }
}

function formatDayChip(date: string) {
  try {
    const d = new Date(`${date}T12:00:00`)
    return {
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace(/\.$/, ''),
      day: String(d.getDate()),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace(/\.$/, ''),
    }
  } catch {
    return { weekday: date, day: '', month: '' }
  }
}

const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'

const STEP_META = [
  { id: 'moniteur', label: 'Moniteur', Icon: User },
  { id: 'duration', label: 'Durée', Icon: Clock },
  { id: 'slots', label: 'Créneau', Icon: Calendar },
] as const

export function ReservationFlowScreen() {
  const navigation = useNavigation<Nav>()
  const { width: windowWidth } = useViewport()
  const { user, loading } = useRequireAuth(navigation)
  const unreadCount = useUnreadNotifications(Boolean(user))
  const [step, setStep] = useState<Step>('moniteur')
  const vehicleSlideWidth = Math.max(windowWidth - 48 - 40, 260)
  const [moniteurId, setMoniteurId] = useState<string | undefined>(undefined)
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [profile, setProfile] = useState<MoniteurProfile | null>(null)
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([])
  const [hourlyPriceFcfa, setHourlyPriceFcfa] = useState(5000)
  const [bookingMode, setBookingMode] = useState<'solo' | 'group'>('solo')
  const [groupPriceFcfa, setGroupPriceFcfa] = useState(2000)
  const [groupSlots, setGroupSlots] = useState<GroupSlot[]>([])
  const [hoursDiscount, setHoursDiscount] = useState(HOURS_DISCOUNT_FCFA)
  const [hoursDiscountMin, setHoursDiscountMin] = useState(HOURS_DISCOUNT_MIN_HOURS)
  const [durationHours, setDurationHours] = useState(1)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null)
  const [checkoutSlot, setCheckoutSlot] = useState<ReservationCheckoutSlot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mmOpen, setMmOpen] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [galleryAll, setGalleryAll] = useState(false)
  const [pagerHeight, setPagerHeight] = useState(0)
  const [profileTab, setProfileTab] = useState<'about' | 'photos'>('about')
  const [slotPeriod, setSlotPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [vehicleImageIndex, setVehicleImageIndex] = useState(0)
  const [durationHelpVisible, setDurationHelpVisible] = useState(true)
  const stepProgress = useRef(new Animated.Value(0)).current

  const pagerRef = useRef<ScrollView>(null)
  const [pagerWidth, setPagerWidth] = useState(0)
  const [moniteurIndex, setMoniteurIndex] = useState(0)
  const stepOrder = step === 'moniteur' || step === 'profile' ? 0 : step === 'duration' ? 1 : 2

  useEffect(() => {
    Animated.timing(stepProgress, {
      toValue: stepOrder / 2,
      duration: 280,
      useNativeDriver: false,
    }).start()
  }, [stepOrder, stepProgress])

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? profile,
    [moniteurs, moniteurId, profile],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || 'voiture'

  const daysWithSlots = useMemo(() => {
    const byDate = new Map<string, { start: string; end: string; seatsTaken?: number; seatsTotal?: number }[]>()
    for (const day of availabilityDays) {
      byDate.set(day.date, slotsForDuration(day.windows, durationHours, earliestBookableTime(day.date)))
    }
    if (bookingMode === 'group') {
      for (const g of groupSlots) {
        const minutes = timeToMinutes(g.endTime) - timeToMinutes(g.startTime)
        if (minutes !== Math.round(durationHours * 60)) continue
        const list = byDate.get(g.date) ?? []
        list.push({ start: g.startTime, end: g.endTime, seatsTaken: g.seatsTaken, seatsTotal: g.seatsTotal })
        byDate.set(g.date, list)
      }
    }
    return [...byDate.entries()]
      .map(([date, slots]) => ({
        date,
        slots: slots.sort((a, b) => a.start.localeCompare(b.start)),
      }))
      .filter((day) => day.slots.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [availabilityDays, durationHours, bookingMode, groupSlots])

  const selectedDaySlots = useMemo(
    () => daysWithSlots.find((day) => day.date === selectedDate)?.slots ?? [],
    [daysWithSlots, selectedDate],
  )

  const priceFcfa =
    bookingMode === 'group'
      ? Math.round(groupPriceFcfa * durationHours)
      : computeDrivingAmount(hourlyPriceFcfa, durationHours, hoursDiscount, hoursDiscountMin)
  const priceDiscount =
    bookingMode === 'group' ? 0 : Math.max(0, Math.round(hourlyPriceFcfa * durationHours) - priceFcfa)

  const loadMoniteurs = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchPublicMoniteurs()
      setMoniteurs(data.moniteurs)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Moniteurs indisponibles')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadProfile = useCallback(async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMoniteurProfile(id)
      setProfile(data.moniteur)
      setMoniteurId(data.moniteur.id)
      setBioExpanded(false)
      setVehicleImageIndex(0)
      setStep('profile')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Profil indisponible')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadAvailability = useCallback(async () => {
    if (!moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMoniteurAvailability({ moniteurId, days: 14 })
      setAvailabilityDays(data.days)
      setHourlyPriceFcfa(data.hourlyPriceFcfa || 5000)
      if (data.groupPricePerHour) setGroupPriceFcfa(data.groupPricePerHour)
      setGroupSlots(data.groupSlots ?? [])
      if (data.hoursDiscountFcfa !== undefined) setHoursDiscount(data.hoursDiscountFcfa)
      if (data.hoursDiscountMinHours !== undefined) setHoursDiscountMin(data.hoursDiscountMinHours)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Disponibilités indisponibles')
    } finally {
      setBusy(false)
    }
  }, [moniteurId])

  useEffect(() => {
    if (step === 'moniteur') void loadMoniteurs()
  }, [step, loadMoniteurs])

  useEffect(() => {
    if (step === 'duration' || step === 'slots') void loadAvailability()
  }, [step, loadAvailability])

  useEffect(() => {
    fetchAccessMe()
      .then((data) => setSoldeHeures(data.user.soldeHeures))
      .catch(() => setSoldeHeures(null))
  }, [])

  useEffect(() => {
    if (!daysWithSlots.length) {
      setSelectedDate('')
      setSelectedStart('')
      setSelectedEnd('')
      return
    }
    setSelectedDate((prev) =>
      daysWithSlots.some((day) => day.date === prev) ? prev : daysWithSlots[0].date,
    )
  }, [daysWithSlots])

  useEffect(() => {
    const slots = daysWithSlots.find((day) => day.date === selectedDate)?.slots ?? []
    if (!slots.length) {
      setSelectedStart('')
      setSelectedEnd('')
      return
    }
    setSelectedStart((prevStart) => {
      const still = slots.some((s) => s.start === prevStart)
      return still ? prevStart : slots[0].start
    })
    setSelectedEnd((prevEnd) => {
      const match = slots.find((s) => s.end === prevEnd && s.start === selectedStart)
      if (match) return prevEnd
      const byStart = slots.find((s) => s.start === selectedStart)
      return byStart?.end || slots[0].end
    })
  }, [daysWithSlots, selectedDate, selectedStart])

  const goConfirmPage = (params: {
    reservationId: string
    moniteurName: string
    vehicleBrand?: string
    date: string
    startTime: string
    endTime: string
    hours: number
    priceFcfa: number
    paymentMethod: 'solde' | 'mobile_money' | 'promo'
    whatsappLink?: string
  }) => {
    setMmOpen(false)
    setCheckoutSlot(null)
    navigation.replace('ReservationConfirm', { ...params, fromList: false })
  }

  const onHoldExpired = useCallback(() => {
    setMmOpen(false)
    setCheckoutSlot(null)
    setError('Créneau libéré — le délai de réservation est écoulé. Choisissez un autre horaire.')
    void loadAvailability()
  }, [loadAvailability])

  const hold = useHoldTimer(
    mmOpen && checkoutSlot?.lockedUntil ? checkoutSlot.lockedUntil : null,
    onHoldExpired,
  )

  const onContinue = async () => {
    if (!moniteurId || !selectedDate || !selectedStart || !selectedEnd) {
      setError('Choisissez un créneau disponible')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let currentSolde = soldeHeures
      try {
        const access = await fetchAccessMe()
        currentSolde = access.user.soldeHeures
        setSoldeHeures(currentSolde)
      } catch {
        /* ignore */
      }

      const data = await requestReservationSlot({
        moniteurId,
        date: selectedDate,
        startTime: selectedStart,
        endTime: selectedEnd,
        vehicleType: vehicleType || 'voiture',
        mode: bookingMode,
      })

      if (bookingMode === 'solo' && currentSolde !== null && currentSolde >= durationHours) {
        const result = await createReservation({
          creneauIds: [String(data.creneau.id)],
          vehicleType: data.creneau.vehicleType || vehicleType || 'voiture',
          moniteurId,
          paymentMethod: 'solde',
        })
        const reservation = result.reservations?.[0] || result.reservation
        goConfirmPage({
          reservationId: reservation?.id || String(data.creneau.id),
          moniteurName: selectedMoniteur?.fullName || 'Moniteur',
          vehicleBrand: selectedMoniteur?.vehicleBrand || '',
          date: selectedDate,
          startTime: selectedStart,
          endTime: selectedEnd,
          hours: durationHours,
          priceFcfa: data.amountFcfa ?? priceFcfa,
          paymentMethod: 'solde',
          whatsappLink: result.whatsappLink,
        })
        return
      }

      setCheckoutSlot({
        moniteurId,
        date: selectedDate,
        startTime: selectedStart,
        endTime: selectedEnd,
        vehicleType: vehicleType || 'voiture',
        hours: durationHours,
        amount: data.amountFcfa ?? priceFcfa,
        creneauId: String(data.creneau.id),
        lockedUntil: data.lockedUntil || null,
        mode: bookingMode,
      })
      setMmOpen(true)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Impossible de continuer')
      void loadAvailability()
    } finally {
      setBusy(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  if (loading || !user) return <ScreenLoader />

  const handleBack = () => {
    if (step === 'profile') setStep('moniteur')
    else if (step === 'duration') setStep('profile')
    else if (step === 'slots') setStep('duration')
    else navigation.goBack()
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <FlowHeader
          title={step === 'slots' ? 'Créneaux disponibles' : 'Nouvelle séance'}
          subtitle={
            step === 'slots'
              ? 'Sélectionnez un créneau pour votre séance'
              : step === 'moniteur'
                ? 'Votre formation, notre priorité'
                : 'Moniteur • Durée • Créneau'
          }
          logo={step === 'moniteur'}
          unread={unreadCount}
          onBack={handleBack}
          onBell={() => navigation.navigate('Notifications')}
        />

        <View style={styles.flowBody}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step === 'moniteur' ? (
            <View
              style={{ flex: 1 }}
              onLayout={(e) => {
                setPagerWidth(Math.round(e.nativeEvent.layout.width))
                setPagerHeight(Math.round(e.nativeEvent.layout.height))
              }}
            >
              {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 24 }} /> : null}
              {!busy && moniteurs.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <CalendarOff size={22} color="#3B82F6" />
                  </View>
                  <Text style={styles.emptyCardText}>Aucun moniteur disponible pour le moment.</Text>
                </View>
              ) : null}

              {moniteurs.length > 0 && pagerHeight > 0 && pagerWidth > 0 ? (
                <ScrollView
                  ref={pagerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ height: pagerHeight }}
                  onMomentumScrollEnd={(e) =>
                    setMoniteurIndex(Math.round(e.nativeEvent.contentOffset.x / pagerWidth))
                  }
                  scrollEventThrottle={16}
                >
                  {moniteurs.map((moniteur, position) => {
                    const photo = moniteur.photoUrl || moniteur.vehiclePhotoUrl
                    return (
                      <View key={moniteur.id} style={{ width: pagerWidth, height: pagerHeight, padding: 2 }}>
                        <View style={styles.mCard}>
                          <View style={styles.mPhotoWrap}>
                            {photo ? (
                              <Image
                                source={{ uri: optimizedImageUrl(resolveMediaUrl(photo)) }}
                                style={styles.mPhoto}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={[styles.mPhoto, styles.mNoPhoto]}>
                                <Text style={styles.mInitial}>{moniteur.fullName.slice(0, 1).toUpperCase()}</Text>
                              </View>
                            )}
                            <View style={styles.mVerified}>
                              <Check size={13} color="#FFFFFF" strokeWidth={3} />
                              <Text style={styles.mVerifiedText}>Vérifié</Text>
                            </View>
                            {position > 0 ? (
                              <Pressable
                                style={[styles.mArrow, { left: 10 }]}
                                hitSlop={10}
                                accessibilityLabel="Moniteur précédent"
                                onPress={() => {
                                  pagerRef.current?.scrollTo({ x: (position - 1) * pagerWidth, animated: true })
                                  setMoniteurIndex(position - 1)
                                }}
                              >
                                <ChevronLeft size={22} color="#0A1E55" />
                              </Pressable>
                            ) : null}
                            {position < moniteurs.length - 1 ? (
                              <Pressable
                                style={[styles.mArrow, { right: 10 }]}
                                hitSlop={10}
                                accessibilityLabel="Moniteur suivant"
                                onPress={() => {
                                  pagerRef.current?.scrollTo({ x: (position + 1) * pagerWidth, animated: true })
                                  setMoniteurIndex(position + 1)
                                }}
                              >
                                <ChevronRight size={22} color="#0A1E55" />
                              </Pressable>
                            ) : null}
                            {moniteurs.length > 1 ? (
                              <View style={styles.mDots}>
                                {moniteurs.slice(0, 6).map((m, i) => (
                                  <View key={m.id} style={[styles.mDot, i === position && styles.mDotOn]} />
                                ))}
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.mName} numberOfLines={1}>{moniteur.fullName}</Text>
                          <View style={styles.mRole}>
                            <User size={15} color="#2563EB" />
                            <Text style={styles.mRoleText} numberOfLines={1}>
                              Moniteur de conduite{moniteur.city ? ` · ${moniteur.city}` : ''}
                            </Text>
                          </View>
                          <View style={styles.mTiles}>
                            <View style={[styles.mTile, { backgroundColor: '#EEF3FB' }]}>
                              <Car size={26} color="#0A1E55" />
                              <View style={{ flexShrink: 1 }}>
                                <Text style={styles.mTileValue} numberOfLines={1}>{moniteur.vehicleBrand || 'Véhicule'}</Text>
                                <Text style={styles.mTileLabel}>Véhicule</Text>
                              </View>
                            </View>
                            <View style={[styles.mTile, { backgroundColor: '#EAF8EF' }]}>
                              <Wallet size={26} color={dark.green} />
                              <View style={{ flexShrink: 1 }}>
                                <Text style={[styles.mTileValue, { color: dark.green }]} numberOfLines={1}>
                                  5 000 F / h
                                </Text>
                                <Text style={styles.mTileLabel} numberOfLines={1}>
                                  Solo · Groupe {groupPriceFcfa.toLocaleString('fr-FR')} F / h
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          {step === 'profile' && profile ? (
            <View style={{ flex: 1, gap: 12 }}>
              {busy ? <ActivityIndicator color={dark.green} /> : null}
              <View style={styles.pCard}>
                <View style={styles.pHead}>
                  {profile.photoUrl ? (
                    <Image
                      source={{ uri: optimizedImageUrl(resolveMediaUrl(profile.photoUrl), 500) }}
                      style={styles.pPhotoSmall}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.pPhotoSmall, styles.mNoPhoto]}>
                      <Text style={[styles.mInitial, { fontSize: 44 }]}>{profile.fullName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.pHeadCopy}>
                    <Text style={styles.pFirst} numberOfLines={2}>{splitFullName(profile.fullName).first}</Text>
                    {splitFullName(profile.fullName).last ? (
                      <Text style={styles.pLast} numberOfLines={1}>{splitFullName(profile.fullName).last}</Text>
                    ) : null}
                    <View style={styles.pVerified}>
                      <ShieldCheck size={16} color={dark.green} />
                      <Text style={styles.pVerifiedText}>Profil vérifié</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.tabsRow}>
                {([
                  ['about', 'À propos'],
                  ['photos', 'Photos'],
                ] as const).map(([key, label]) => (
                  <Pressable
                    key={key}
                    style={[styles.tab, profileTab === key && styles.tabOn]}
                    onPress={() => setProfileTab(key)}
                  >
                    <Text style={[styles.tabText, profileTab === key && styles.tabTextOn]}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.hoursRow}>
                {([
                  { id: 'solo', label: 'Solo', price: 5000, note: 'Créneau pour vous seul' },
                  { id: 'group', label: 'En groupe', price: groupPriceFcfa, note: `Jusqu’à 7 élèves` },
                ] as const).map((opt) => {
                  const active = bookingMode === opt.id
                  return (
                    <Bouncy key={opt.id} scaleTo={0.97} style={{ flex: 1 }} onPress={() => setBookingMode(opt.id)}>
                      <View
                        style={[styles.hoursPill, { height: 72 }, active && styles.hoursPillOn]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Mode ${opt.label}`}
                      >
                        <Text style={[styles.hoursPillText, { fontSize: 16 }, active && styles.hoursPillTextOn]}>
                          {opt.label} · {opt.price.toLocaleString('fr-FR')} F/h
                        </Text>
                        <Text style={[styles.dSub, active && { color: '#FFFFFF' }]}>{opt.note}</Text>
                      </View>
                    </Bouncy>
                  )
                })}
              </View>

              <View style={[styles.pCard, { flex: 1 }]}>
                {profileTab === 'about' ? (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    <Text style={styles.pBio}>
                      {profile.bio?.trim() || 'Ce moniteur n’a pas encore ajouté de présentation.'}
                    </Text>
                    <MeetingPointCard url={profile.meetingPointUrl} note={profile.meetingPointNote} />
                    <View style={styles.pFactsRow}>
                      <View style={styles.pChip}>
                        <MapPin size={15} color="#0A1E55" />
                        <Text style={styles.pChipText}>{profile.city || 'Ville non renseignée'}</Text>
                      </View>
                      <View style={styles.pChip}>
                        <Car size={15} color="#0A1E55" />
                        <Text style={styles.pChipText}>{profile.vehicleBrand || 'Véhicule'}</Text>
                      </View>
                      <View style={styles.pChip}>
                        <Wallet size={15} color="#0A1E55" />
                        <Text style={styles.pChipText}>Solo 5 000 F / h</Text>
                      </View>
                      <View style={styles.pChip}>
                        <Wallet size={15} color="#0A1E55" />
                        <Text style={styles.pChipText}>Groupe {groupPriceFcfa.toLocaleString('fr-FR')} F / h</Text>
                      </View>
                    </View>
                  </ScrollView>
                ) : null}

                {profileTab === 'photos' ? (
                  (() => {
                    const gallery = [profile.vehiclePhotoUrl, ...(profile.photos || [])].filter(
                      (uri): uri is string => Boolean(uri?.trim()),
                    )
                    if (gallery.length === 0) return <Text style={styles.pBio}>Pas encore de photos.</Text>
                    return (
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.pGalleryGrid}>
                          {gallery.map((uri) => (
                            <Image
                              key={uri}
                              source={{ uri: optimizedImageUrl(resolveMediaUrl(uri), 500) }}
                              style={styles.pGalleryCell}
                              resizeMode="cover"
                            />
                          ))}
                        </View>
                      </ScrollView>
                    )
                  })()
                ) : null}

              </View>
            </View>
          ) : null}

          {step === 'duration' ? (() => {
            const isGroup = bookingMode === 'group'
            const rate = isGroup ? groupPriceFcfa : hourlyPriceFcfa
            const base = rate * durationHours
            const total = isGroup
              ? base
              : computeDrivingAmount(hourlyPriceFcfa, durationHours, hoursDiscount, hoursDiscountMin)
            const discount = Math.max(0, base - total)
            return (
              <View style={{ flex: 1, gap: 14 }}>
                <View style={styles.dHead}>
                  <View style={styles.dHeadIcon}>
                    <Clock size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dTitle}>Durée de la séance</Text>
                    <Text style={styles.dSub}>Choisissez la durée de votre séance de conduite.</Text>
                  </View>
                </View>

                <View style={styles.hoursRow}>
                  {([
                    { id: 'solo', label: 'Solo', price: hourlyPriceFcfa },
                    { id: 'group', label: 'En groupe', price: groupPriceFcfa },
                  ] as const).map((opt) => {
                    const active = bookingMode === opt.id
                    return (
                      <Bouncy key={opt.id} scaleTo={0.97} style={{ flex: 1 }} onPress={() => setBookingMode(opt.id)}>
                        <View
                          style={[styles.hoursPill, active && styles.hoursPillOn]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`Mode ${opt.label}`}
                        >
                          <Text style={[styles.hoursPillText, active && styles.hoursPillTextOn]}>{opt.label}</Text>
                          <Text style={[styles.dSub, active && { color: '#FFFFFF' }]}>{opt.price.toLocaleString('fr-FR')} F/h</Text>
                        </View>
                      </Bouncy>
                    )
                  })}
                </View>
                <Text style={styles.recapHint}>
                  {isGroup
                    ? 'En groupe : vous partagez la séance avec d’autres élèves. Paiement Mobile Money.'
                    : 'Solo : le créneau est à vous seul, personne d’autre ne peut le prendre.'}
                </Text>

                <View style={styles.hoursRow}>
                  {DURATION_OPTIONS.map((hours) => {
                    const active = durationHours === hours
                    return (
                      <Bouncy key={hours} scaleTo={0.97} style={{ flex: 1 }} onPress={() => setDurationHours(hours)}>
                        <View
                          style={[styles.hoursPill, active && styles.hoursPillOn]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`${hours} heures`}
                        >
                          <Text style={[styles.hoursPillText, active && styles.hoursPillTextOn]}>{hours} h</Text>
                        </View>
                      </Bouncy>
                    )
                  })}
                </View>

                <View style={styles.recap}>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Durée</Text>
                    <Text style={styles.recapValue}>{durationHours} heure{durationHours > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Tarif horaire</Text>
                    <Text style={styles.recapValue}>{hourlyPriceFcfa.toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Sous-total</Text>
                    <Text style={styles.recapValue}>{base.toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  <View style={styles.recapRow}>
                    <Text style={styles.recapLabel}>Remise</Text>
                    <Text style={[styles.recapValue, discount > 0 && { color: dark.green }]}>
                      {discount > 0 ? `− ${discount.toLocaleString('fr-FR')} FCFA` : '—'}
                    </Text>
                  </View>
                  <View style={styles.recapTotalRow}>
                    <Text style={styles.recapTotalLabel}>Total</Text>
                    <Text style={styles.recapTotal}>{total.toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                  {discount === 0 && hoursDiscount > 0 ? (
                    <Text style={styles.recapHint}>
                      Remise de {hoursDiscount.toLocaleString('fr-FR')} FCFA à partir de {hoursDiscountMin} h.
                    </Text>
                  ) : null}
                </View>
              </View>
            )
          })() : null}

          {step === 'slots' ? (
            <View style={{ flex: 1, gap: 12 }}>
              {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 12 }} /> : null}

              {daysWithSlots.length === 0 && !busy ? (
                <EmptyState
                  icon={<CalendarOff size={30} color={dark.textMuted} />}
                  title="Aucun créneau disponible"
                  message={`Pas de plage de ${durationHours} h libre sur les 14 prochains jours.`}
                  action={
                    <View style={{ width: '100%', gap: 8 }}>
                      <Pressable style={styles.primaryBtn} onPress={() => setStep('duration')}>
                        <Text style={styles.primaryBtnText}>Réduire la durée</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
                        <Text style={styles.secondaryBtnText}>Voir un autre moniteur</Text>
                      </Pressable>
                    </View>
                  }
                />
              ) : null}

              {daysWithSlots.length > 0 ? (
                <>
                  <View style={styles.sSummary}>
                    <Text style={styles.sSummaryText}>
                      {durationHours} h · {priceFcfa.toLocaleString('fr-FR')} FCFA
                    </Text>
                    <Pressable style={styles.sEdit} onPress={() => setStep('duration')} accessibilityLabel="Modifier la durée" hitSlop={8}>
                      <Text style={styles.sEditText}>Modifier</Text>
                      <Pencil size={15} color={dark.green} />
                    </Pressable>
                  </View>

                  <View style={{ height: 78 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
                      {daysWithSlots.map((day) => {
                        const active = selectedDate === day.date
                        const chip = formatDayChip(day.date)
                        return (
                          <Bouncy
                            key={day.date}
                            scaleTo={0.97}
                            onPress={() => {
                              setSelectedDate(day.date)
                              setSelectedStart(day.slots[0]?.start || '')
                              setSelectedEnd(day.slots[0]?.end || '')
                            }}
                          >
                            <View style={[styles.weekDay, active && styles.weekDayOn]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                              <Text style={[styles.weekDayName, active && styles.weekDayTextOn]}>{chip.weekday}</Text>
                              <Text style={[styles.weekDayNum, active && styles.weekDayTextOn]}>{chip.day}</Text>
                              <Text style={[styles.weekDayMonth, active && styles.weekDayTextOn]}>{chip.month}</Text>
                            </View>
                          </Bouncy>
                        )
                      })}
                    </ScrollView>
                  </View>

                  {selectedDate && earliestBookableTime(selectedDate) ? (
                    <Text style={styles.sNote}>Réservation possible à partir de {earliestBookableTime(selectedDate)} aujourd’hui.</Text>
                  ) : null}
                  {selectedDate && selectedDaySlots.length === 0 && !busy ? (
                    <Text style={styles.sNote}>Plus de créneau disponible ce jour-là. Choisissez un autre jour.</Text>
                  ) : null}

                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {selectedDaySlots.map((slot) => {
                      const active = selectedStart === slot.start && selectedEnd === slot.end
                      const hour = parseInt(slot.start.slice(0, 2), 10) || 0
                      const period = hour < 12 ? 'Matin' : hour < 16 ? 'Après-midi' : 'Soir'
                      return (
                        <Bouncy
                          key={`${slot.start}-${slot.end}`}
                          scaleTo={0.98}
                          onPress={() => {
                            setSelectedStart(slot.start)
                            setSelectedEnd(slot.end)
                            void import('../../utils/haptics').then((m) => m.hapticSelect())
                          }}
                        >
                          <View
                            style={[styles.slotRow, active && styles.slotRowOn]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`${slot.start} à ${slot.end}`}
                          >
                            <Text style={styles.slotRowTime}>{slot.start} → {slot.end}</Text>
                            <Text style={[styles.slotRowPeriod, active && { color: dark.green }]}>
                              {slot.seatsTaken ? `Groupe ouvert · ${slot.seatsTaken}/${slot.seatsTotal} places` : period}
                            </Text>
                            {active ? (
                              <View style={styles.slotRowCheck}>
                                <Check size={14} color="#FFFFFF" strokeWidth={3} />
                              </View>
                            ) : null}
                          </View>
                        </Bouncy>
                      )
                    })}
                  </ScrollView>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        {(step === 'moniteur' && moniteurs.length > 0) || (step === 'profile' && profile) || step === 'duration' || (step === 'slots' && daysWithSlots.length > 0) ? (
          <View style={styles.bottomBar}>
            <Bouncy
              scaleTo={0.98}
              disabled={busy || (step === 'slots' && !(selectedStart && selectedEnd))}
              onPress={() => {
                if (step === 'moniteur') {
                  const chosen = moniteurs[Math.min(moniteurIndex, moniteurs.length - 1)]
                  if (chosen) void loadProfile(chosen.id)
                } else if (step === 'profile') setStep('duration')
                else if (step === 'duration') setStep('slots')
                else void onContinue()
              }}
            >
              <View style={[styles.bigBtn, (busy || (step === 'slots' && !(selectedStart && selectedEnd))) && styles.disabled]}>
                <Text style={styles.bigBtnText}>
                  {step === 'moniteur'
                    ? 'Sélectionner ce moniteur'
                    : step === 'slots'
                      ? busy
                        ? 'Un instant…'
                        : 'Confirmer le créneau'
                      : 'Continuer'}
                </Text>
                <View style={styles.bigBtnArrow}>
                  <ChevronRight size={20} color={dark.green} />
                </View>
              </View>
            </Bouncy>
          </View>
        ) : null}

        {checkoutSlot ? (
          <ReservationMobileMoneyCheckout
            visible={mmOpen}
            label={`${checkoutSlot.date} · ${checkoutSlot.startTime} – ${checkoutSlot.endTime}`}
            amount={checkoutSlot.amount || priceFcfa}
            slot={checkoutSlot}
            hoursNeeded={durationHours}
            defaultPhone={user.phone || ''}
            holdLabel={hold.label}
            holdExpired={hold.expired}
            holdUrgent={(hold.remainingMs ?? 0) <= 60_000}
            onClose={() => {
              setMmOpen(false)
              setCheckoutSlot(null)
            }}
            onSoldeSuccess={(result) => {
              const reservation = result.reservations?.[0]
              goConfirmPage({
                reservationId: reservation?.id || checkoutSlot.creneauId || 'ok',
                moniteurName: selectedMoniteur?.fullName || 'Moniteur',
                vehicleBrand: selectedMoniteur?.vehicleBrand || '',
                date: checkoutSlot.date,
                startTime: checkoutSlot.startTime,
                endTime: checkoutSlot.endTime,
                hours: durationHours,
                priceFcfa: checkoutSlot.amount || priceFcfa,
                paymentMethod: 'promo',
                whatsappLink: result.whatsappLink,
              })
            }}
            onSuccess={(reservations) => {
              const first = reservations[0]
              goConfirmPage({
                reservationId: first?.id || 'ok',
                moniteurName: selectedMoniteur?.fullName || first?.moniteur?.fullName || 'Moniteur',
                vehicleBrand:
                  selectedMoniteur?.vehicleBrand || first?.moniteur?.vehicleBrand || '',
                date: first?.creneau?.date || checkoutSlot.date,
                startTime: first?.creneau?.startTime || checkoutSlot.startTime,
                endTime: first?.creneau?.endTime || checkoutSlot.endTime,
                hours: durationHours,
                priceFcfa: first?.priceFcfa || checkoutSlot.amount || priceFcfa,
                paymentMethod: 'mobile_money',
              })
            }}
          />
        ) : null}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  hoursRow: { flexDirection: 'row', gap: 8 },
  hoursPill: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(0,16,48,0.08)' },
  hoursPillOn: { backgroundColor: dark.green, borderColor: dark.green },
  hoursPillText: { fontFamily: fonts.displayBold, fontSize: 18, color: '#0A1E55' },
  hoursPillTextOn: { color: '#FFFFFF' },
  recap: { flex: 1, justifyContent: 'center', gap: 14, padding: 20, borderRadius: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', ...shadows.md },
  recapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recapLabel: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: '#5B6B86' },
  recapValue: { fontFamily: fonts.displayBold, fontSize: 16.5, color: '#0A1E55' },
  recapTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,16,48,0.08)' },
  recapTotalLabel: { fontFamily: fonts.displayBold, fontSize: 20, color: '#0A1E55' },
  recapTotal: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: dark.green },
  recapHint: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#5B6B86', textAlign: 'center' },
  sSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sSummaryText: { fontFamily: fonts.displayBold, fontSize: 17, color: '#0A1E55' },
  weekRow: { gap: 8, paddingVertical: 2 },
  weekDay: { width: 62, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.06)', ...shadows.sm },
  weekDayOn: { backgroundColor: dark.green, borderColor: dark.green },
  weekDayName: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#5B6B86', textTransform: 'capitalize' },
  weekDayNum: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: '#0A1E55' },
  weekDayMonth: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: '#5B6B86' },
  weekDayTextOn: { color: '#FFFFFF' },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(0,16,48,0.06)', ...shadows.sm },
  slotRowOn: { backgroundColor: '#EAF8EF', borderColor: dark.green },
  slotRowTime: { flex: 1, fontFamily: fonts.displayBold, fontSize: 19, color: '#0A1E55' },
  slotRowPeriod: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#5B6B86' },
  slotRowCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { height: 190, marginBottom: 12, borderRadius: 24, overflow: 'hidden', justifyContent: 'center' },
  heroCar: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '62%', height: '100%' },
  heroCopy: { paddingLeft: 4, maxWidth: '62%' },
  heroTitle: { fontFamily: fonts.displayExtraBold, fontSize: 34, lineHeight: 38, color: '#0A1E55', letterSpacing: -0.8 },
  heroTitleAccent: { fontFamily: fonts.displayExtraBold, fontSize: 34, lineHeight: 38, color: dark.green, fontStyle: 'italic', letterSpacing: -0.8 },
  heroUnderline: { width: 120, height: 4, borderRadius: 2, backgroundColor: dark.green, marginTop: 2, marginBottom: 10 },
  heroText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: '#33466B' },

  mCard: { flex: 1, padding: 12, borderRadius: 30, backgroundColor: '#FFFFFF', gap: 10, borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', ...shadows.md },
  mPhotoWrap: { flex: 1, minHeight: 120, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0B3A9E' },
  mPhoto: { width: '100%', height: '100%' },
  mNoPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B3A9E' },
  mInitial: { fontFamily: fonts.displayBold, fontSize: 96, color: 'rgba(255,255,255,0.28)' },
  mVerified: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: dark.green },
  mVerifiedText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
  mArrow: { position: 'absolute', top: '45%', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  mDots: { position: 'absolute', right: 16, bottom: 14, flexDirection: 'row', gap: 6 },
  mDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  mDotOn: { backgroundColor: '#FFFFFF' },
  mName: { fontFamily: fonts.displayBold, fontSize: 24, color: '#0A1E55', letterSpacing: -0.4, paddingHorizontal: 4 },
  mRole: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,16,48,0.06)' },
  mRoleText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#0A1E55' },
  mTiles: { flexDirection: 'row', gap: 10 },
  mTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 20 },
  mTileValue: { fontFamily: fonts.displayBold, fontSize: 17, color: '#0A1E55' },
  mTileLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#5B6B86' },
  mTrust: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 20, backgroundColor: '#F4F7FC' },
  mTrustItem: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  mTrustText: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 15, textAlign: 'center', color: '#0A1E55' },
  mTrustDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(0,16,48,0.08)' },
  mBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 58, borderRadius: 999, backgroundColor: dark.green },
  mBtnText: { fontFamily: fonts.displayBold, fontSize: 17, color: '#FFFFFF' },
  mFootPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: '#EAF0F8' },
  mFootText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#0A1E55' },

  pCard: { padding: 14, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', ...shadows.md },
  pHead: { flexDirection: 'row', gap: 14 },
  pPhoto: { width: 136, height: 196, borderRadius: 20, overflow: 'hidden' },
  pHeadCopy: { flex: 1, minWidth: 0 },
  pFirst: { fontFamily: fonts.displayExtraBold, fontSize: 24, lineHeight: 28, color: '#0A1E55', letterSpacing: -0.4 },
  pLast: { fontFamily: fonts.displayBold, fontSize: 17, color: '#5B6B86', marginBottom: 8 },
  pVerified: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E7F7EC', marginBottom: 10 },
  pVerifiedText: { fontFamily: fonts.bodyBold, fontSize: 13, color: dark.green },
  pFacts: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,16,48,0.06)' },
  pFact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pFactLabel: { fontFamily: fonts.body, fontSize: 11.5, color: '#5B6B86' },
  pFactValue: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#0A1E55' },
  pSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pSectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pSectionTitle: { fontFamily: fonts.displayBold, fontSize: 19, color: '#0A1E55' },
  pBio: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: '#1F2F4D' },
  pMore: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#E7F7EC' },
  pMoreText: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.green },
  pLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: dark.green },
  pGallery: { gap: 8 },
  pGalleryPhoto: { width: 118, height: 108, borderRadius: 16, backgroundColor: '#E8EEF6' },

  dCard: { padding: 16, borderRadius: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', gap: 12, ...shadows.md },
  dHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  dHeadIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center' },
  dTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: '#0A1E55', letterSpacing: -0.3 },
  dSub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: '#5B6B86', marginTop: 2 },
  dRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(0,16,48,0.06)', ...shadows.sm },
  dRowActive: { backgroundColor: '#EAF8EF', borderColor: dark.green },
  dRowIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#E9EFFA', alignItems: 'center', justifyContent: 'center' },
  dRowIconActive: { backgroundColor: '#D3F2DE' },
  dHours: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: '#0A1E55' },
  dPrice: { fontFamily: fonts.bodyMedium, fontSize: 16, color: '#0B3A8C' },
  dCheck: { position: 'absolute', top: -4, right: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center' },

  sDateCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', ...shadows.md },
  sDateIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E7F7EC', alignItems: 'center', justifyContent: 'center' },
  sDateTitle: { fontFamily: fonts.displayBold, fontSize: 21, color: '#0A1E55' },
  sDateSub: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#5B6B86', marginTop: 2 },
  sEdit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sEditText: { fontFamily: fonts.bodyBold, fontSize: 15, color: dark.green },
  sNote: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: '#5B6B86', paddingHorizontal: 4 },
  sGroupHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sGroupTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: '#0A1E55' },
  sGroupLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,16,48,0.1)' },
  sGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  sCell: { width: '25%', padding: 5 },
  sPill: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,16,48,0.05)', ...shadows.sm },
  sPillActive: { backgroundColor: dark.green, borderColor: dark.green },
  sPillText: { fontFamily: fonts.displayBold, fontSize: 16, color: '#0A1E55' },
  sPillTextActive: { color: '#FFFFFF' },
  sPillCheck: { marginLeft: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  flowBody: { flex: 1, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 6 },
  bottomBar: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 16 },
  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 999, backgroundColor: '#E8EEF6' },
  tabOn: { backgroundColor: '#0A1E55' },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#0A1E55' },
  tabTextOn: { color: '#FFFFFF' },
  pPhotoSmall: { width: 96, height: 120, borderRadius: 18, overflow: 'hidden' },
  pFactsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EEF3FB' },
  pChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#0A1E55' },
  pGalleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pGalleryCell: { width: '48.5%', height: 110, borderRadius: 16, backgroundColor: '#E8EEF6' },
  dTile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 26, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(0,16,48,0.06)', ...shadows.md },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 58, borderRadius: 29, backgroundColor: dark.green, ...shadows.md },
  bigBtnText: { fontFamily: fonts.displayBold, fontSize: 20, color: '#FFFFFF' },
  bigBtnArrow: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  pickTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: dark.textPrimary, letterSpacing: -0.4 },
  pickSub: { marginTop: 2, marginBottom: 14, fontFamily: fonts.body, fontSize: 13.5, color: dark.textMuted },
  pickCard: {
    height: 430,
    justifyContent: 'flex-end',
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#0A1E55',
  },
  pickPhoto: { position: 'absolute', top: 0, left: 0 },
  pickNoPhoto: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B3A9E' },
  pickInitial: { fontFamily: fonts.displayBold, fontSize: 120, color: 'rgba(255,255,255,0.25)', marginBottom: 90 },
  pickVerified: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  pickVerifiedText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#FFFFFF' },
  pickInfo: { padding: 22, gap: 4 },
  pickName: { fontFamily: fonts.displayBold, fontSize: 26, color: '#FFFFFF', letterSpacing: -0.4 },
  pickMeta: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: 'rgba(255,255,255,0.88)' },
  pickPills: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pickPricePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFFFFF' },
  pickPrice: { fontFamily: fonts.displayBold, fontSize: 16, color: '#EA580C' },
  pickTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pickTypeText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: '#FFFFFF', textTransform: 'capitalize' },
  pickNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginVertical: 14 },
  pickDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBD5E1' },
  pickDotOn: { width: 20, backgroundColor: dark.textPrimary },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  pickBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFFFFF' },
  root: {
    flex: 1,
    backgroundColor: '#F8FBFC',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topBarSub: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: dark.textMuted },
  bannerWrap: { marginBottom: 14 },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginBottom: 14,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    ...shadows.md,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F0FE',
  },
  emptyCardText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: dark.textPrimary },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    lineHeight: 23,
    color: dark.textPrimary,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 120,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    backgroundColor: '#FFFFFF',
    ...shadows.lg,
  },
  stickyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  stickyCalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
    textTransform: 'capitalize',
  },
  stickyPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.green,
    marginTop: 2,
  },
  stickyBtn: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: dark.green,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stickyBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  stickyBtnArrow: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    ...shadows.md,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperFillHidden: {
    height: 0,
    opacity: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(0,16,48,0.1)',
  },
  stepConnectorLeft: {
    marginRight: 4,
  },
  stepConnectorRight: {
    marginLeft: 4,
  },
  stepConnectorActive: {
    backgroundColor: dark.green,
  },
  stepConnectorSpacer: {
    flex: 1,
  },
  stepDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.12)',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    borderColor: dark.green,
    backgroundColor: dark.green,
  },
  stepDotCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: dark.green,
    borderWidth: 2,
  },
  stepDotText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textMuted,
  },
  stepDotTextCurrent: {
    color: dark.green,
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  stepPillTextActive: {
    color: dark.green,
  },
  introTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  introText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginTop: 0,
    marginBottom: 2,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  choice: {
    borderRadius: 26,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    ...shadows.md,
  },
  choiceText: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  moniteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  listAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 3,
    borderColor: dark.green,
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.textPrimary,
  },
  carPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
  },
  carPlaceholderText: {
    fontSize: 10,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
  },
  brandText: {
    marginTop: 4,
    fontSize: 14,
    color: dark.textMuted,
    fontFamily: fonts.body,
  },
  typeText: {
    marginTop: 2,
    fontSize: 12,
    color: dark.green,
    fontFamily: fonts.displayBold,
  },
  typePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: brand.greenPale,
  },
  typePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: dark.textMuted,
  },
  seeProfileBtn: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    backgroundColor: ORANGE_SOFT,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeProfile: {
    fontSize: 14,
    color: ORANGE,
    fontFamily: fonts.bodyBold,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
    padding: 16,
    borderRadius: 24,
    backgroundColor: brand.greenPale,
  },
  trustCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trustTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  trustText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  trustCheck: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  profileWrap: {
    paddingBottom: 8,
  },
  scrollWithProfileSticky: {
    paddingBottom: 120,
  },
  titleAccent: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: dark.green,
    marginTop: -8,
    marginBottom: 20,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 3,
    borderColor: dark.green,
  },
  profileHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  profileName: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
  },
  priceTypePill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: dark.green,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceTypePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  vehicleCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    gap: 10,
    ...shadows.card,
  },
  vehicleCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleCardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  vehicleCarousel: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  vehiclePhoto: {
    height: 190,
    borderRadius: 18,
    backgroundColor: dark.surfaceRaised,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,16,48,0.15)',
  },
  dotActive: {
    backgroundColor: dark.green,
    width: 16,
  },
  vehicleBrand: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: brand.greenPale,
    minWidth: '30%',
    flexGrow: 1,
  },
  featureChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textPrimary,
    flexShrink: 1,
  },
  infoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    ...shadows.sm,
  },
  infoRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    backgroundColor: dark.green,
  },
  infoRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  infoRowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  infoRowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  seeMore: {
    marginTop: 2,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.green,
  },
  galleryRow: {
    gap: 8,
    paddingTop: 4,
  },
  profileSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    ...shadows.md,
  },
  recapAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 2,
    borderColor: dark.green,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  bioBox: { marginTop: 4 },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
  },
  specialtyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  specialtyText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textPrimary,
  },
  galleryPhoto: {
    width: 96,
    height: 72,
    borderRadius: 12,
    backgroundColor: dark.surfaceRaised,
  },
  recapStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  durationMoniteurCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    padding: 18,
    borderRadius: 24,
    backgroundColor: brand.greenPale,
    ...shadows.sm,
  },
  durationMoniteurAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: dark.green,
  },
  durationMoniteurCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  vehicleTypeAccent: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  durationCardWrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
  },
  durationCard: {
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.1)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...shadows.sm,
  },
  durationCardActive: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  durationCardHours: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: dark.textPrimary,
  },
  durationCardHoursActive: {
    color: dark.textPrimary,
  },
  durationCardPrice: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textMuted,
  },
  durationCardPriceActive: {
    color: dark.textPrimary,
  },
  durationCheck: {
    marginTop: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPrimaryBtn: {
    minHeight: 58,
    borderRadius: 20,
  },
  changeMoniteurCard: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.sm,
  },
  changeMoniteurIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeMoniteurText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  helpCard: {
    marginTop: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: brand.greenPale,
  },
  helpIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  helpCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  helpTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  helpText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  primaryBtn: {
    marginTop: 12,
    minHeight: 56,
    backgroundColor: dark.green,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  primaryBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
  },
  slotsRecapCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    padding: 18,
    borderRadius: 24,
    backgroundColor: brand.greenPale,
    ...shadows.sm,
  },
  slotsRecapMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  slotsRecapAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: dark.green,
  },
  slotsRecapCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  slotsRecapVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotsRecapTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  slotsRecapTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  slotsRecapTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textPrimary,
  },
  slotsEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.35)',
    backgroundColor: '#FFFFFF',
  },
  slotsEditText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
  },
  dayChipsRow: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 8,
    marginBottom: 16,
  },
  dayChip: {
    width: 76,
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.1)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    ...shadows.sm,
  },
  dayChipActive: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  dayChipWeekday: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipDay: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    lineHeight: 26,
  },
  dayChipMonth: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipTextActive: {
    color: dark.textPrimary,
  },
  dayChipCheck: {
    marginTop: 6,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsHoursCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
    ...shadows.card,
  },
  slotsHoursHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  slotsHoursTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dayTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    textTransform: 'capitalize',
  },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCardWrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
  },
  slotCard: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: dark.green,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slotCardActive: {
    backgroundColor: dark.green,
    borderColor: dark.green,
  },
  slotCardText: {
    fontFamily: fonts.bodyBold,
    color: dark.green,
    fontSize: 14,
  },
  slotCardTextActive: {
    color: '#FFFFFF',
  },
  windowChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: dark.green,
    backgroundColor: dark.surfaceRaised,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  windowChipActive: {
    backgroundColor: dark.green,
    borderColor: dark.green,
  },
  windowChipText: {
    fontFamily: fonts.bodyBold,
    color: dark.green,
    fontSize: 13,
  },
  windowChipTextActive: {
    color: '#FFFFFF',
  },
  durationBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  durationBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  empty: {
    color: dark.textMuted,
    marginBottom: 12,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  error: {
    color: dark.coral,
    marginBottom: 10,
    fontFamily: fonts.bodySemiBold,
  },
  disabled: { opacity: 0.55 },
})
