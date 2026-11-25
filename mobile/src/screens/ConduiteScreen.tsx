import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  BookOpen,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Bell,
  GraduationCap,
  Info,
  Lock,
  User,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import {
  cancelReservation,
  fetchDrivingDashboard,
  type DrivingProgress,
  type ReservationItem,
  ReservationError,
} from '../api/reservations'
import {
  fetchAccessMe,
  fetchAccessModules,
  computeModuleAmount,
  redeemPromoCode,
  claimFreeAccess,
  type AccessMe,
  type AccessModule,
  type CheckoutCartItem,
} from '../api/accessRequests'
import { Bouncy } from '../components/Bouncy'
import { CodeRouteBanner } from '../components/CodeRouteBanner'
import { useUnreadNotifications } from '../hooks/useUnreadNotifications'
import { FadeUp } from '../components/FadeUp'
import { LegalFooter } from '../components/LegalFooter'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { ProgressBar } from '../components/ProgressBar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { brand, dark, fonts, shadows } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Conduite'>

const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'
const BLUE_SOFT = '#EFF6FF'
const BLUE_INFO = '#3B82F6'

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'En attente'
  return item.status
}

function HoursRing({ percent }: { percent: number }) {
  const size = 80
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, percent / 100))
  const offset = c * (1 - clamped)
  const label = `${Math.round(percent)}%`

  return (
    <View style={styles.ringWrap} accessibilityLabel={`Progression ${label}`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,16,48,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={dark.green}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringValue}>{label}</Text>
    </View>
  )
}

function ConduiteHeader({ onBack }: { onBack: () => void; onProfile?: () => void }) {
  const navigation = useNavigation<Nav>()
  const unread = useUnreadNotifications(true)
  return (
    <View style={styles.topBar}>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityLabel="Revenir à l'accueil"
        hitSlop={10}
      >
        <ChevronLeft size={26} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.topBarCenter}>
        <DriveModuleIcon size={42} />
        <View>
          <Text style={styles.topBarTitle}>Conduite</Text>
          <Text style={styles.topBarSub}>Apprendre • Réserver • Réussir</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Notifications')}
        accessibilityLabel="Notifications"
        hitSlop={10}
      >
        <Bell size={24} color={dark.textPrimary} />
        {unread > 0 ? <View style={styles.bellDot} /> : null}
      </Pressable>
    </View>
  )
}

let dashboardCache: { progress: DrivingProgress | null; upcoming: ReservationItem[] } | null = null
let accessCache: { me: AccessMe | null; modules: AccessModule[] } | null = null

export function ConduiteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [progress, setProgress] = useState<DrivingProgress | null>(dashboardCache?.progress ?? null)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>(dashboardCache?.upcoming ?? [])
  const [loadingDash, setLoadingDash] = useState(!dashboardCache)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(accessCache?.me ?? null)
  const [modules, setModules] = useState<AccessModule[]>(accessCache?.modules ?? [])
  const [accessLoading, setAccessLoading] = useState(!accessCache)
  const [pickHours, setPickHours] = useState(false)
  const [hoursQty, setHoursQty] = useState('1')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [claimingFree, setClaimingFree] = useState(false)
  const { height: windowHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const load = useCallback(async () => {
    if (!dashboardCache) setLoadingDash(true)
    setError(null)
    try {
      const data = await fetchDrivingDashboard()
      dashboardCache = { progress: data.progress, upcoming: data.upcoming || [] }
      setProgress(data.progress)
      setUpcoming(data.upcoming || [])
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    } finally {
      setLoadingDash(false)
    }
  }, [])

  const submitCancel = async () => {
    if (!cancelTarget) return
    const reason = cancelReason.trim()
    if (reason.length < 5) {
      setError('Indiquez une justification d’au moins 5 caractères')
      return
    }
    setCancelling(true)
    setError(null)
    try {
      await cancelReservation(String(cancelTarget.id), reason)
      setCancelTarget(null)
      setCancelReason('')
      await load()
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Annulation impossible')
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    if (!user) return
    // Le catalogue ne doit jamais faire perdre l'accès : chaque appel échoue séparément.
    void Promise.all([
      fetchAccessMe().catch(() => accessCache?.me ?? null),
      fetchAccessModules().catch(() => accessCache?.modules ?? ([] as AccessModule[])),
    ])
      .then(([me, catalog]) => {
        if (me) accessCache = { me, modules: catalog }
        setAccessMe(me)
        setModules(catalog)
      })
      .finally(() => setAccessLoading(false))
  }, [user])

  const conduiteUnlocked = Boolean(
    accessMe &&
      (accessMe.access?.conduite_videos ||
        accessMe.access?.conduite_heures ||
        (accessMe.user?.soldeHeures || 0) > 0),
  )

  useEffect(() => {
    if (conduiteUnlocked) void load()
  }, [conduiteUnlocked, load])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  if (loading || !user) return <ScreenLoader />

  const goHome = () => navigation.navigate('Home')
  const goProfile = () => navigation.navigate('Profile')

  if (accessLoading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ConduiteHeader onBack={goHome} onProfile={goProfile} />
          <View style={styles.accessState}>
            <ActivityIndicator color={dark.green} />
            <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
          </View>
          <View style={styles.footerPad}>
            <LegalFooter />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!conduiteUnlocked) {
    const hoursModule = modules.find((m) => m.key === 'conduite_heures')
    const qty = Math.max(1, Number(hoursQty) || 1)
    const hoursPrice = hoursModule
      ? computeModuleAmount('conduite_heures', hoursModule.price, qty)
      : qty >= 2
        ? qty * 5000 - 1000
        : qty * 5000
    const cartItems: CheckoutCartItem[] = pickHours
      ? [{ module: 'conduite_heures', quantity: qty }]
      : []
    const cartTotal = pickHours ? hoursPrice : 0
    const formatPrice = (amount: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        maximumFractionDigits: 0,
      }).format(amount)

    const activateFreeVideos = async () => {
      setClaimingFree(true)
      setError(null)
      try {
        const result = await claimFreeAccess(['conduite_videos'])
        setAccessMe(result.access)
        navigation.navigate('LeconsChapitres')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Activation impossible')
      } finally {
        setClaimingFree(false)
      }
    }

    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ConduiteHeader onBack={goHome} onProfile={goProfile} />
          <ScrollView contentContainerStyle={styles.accessScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.accessLock}>
              <Lock size={28} color={dark.textMuted} />
            </View>
            <Text style={styles.accessStateTitle}>Choisir tes accès conduite</Text>
            <Text style={styles.accessStateCopy}>
              Les cours vidéo sont gratuits. Les heures avec moniteur restent payantes.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!accessMe?.access?.conduite_videos ? (
              <Pressable
                style={[styles.offerCard, styles.offerCardSelected]}
                disabled={claimingFree}
                onPress={() => void activateFreeVideos()}
              >
                <Text style={styles.offerTitle}>Cours vidéo de conduite</Text>
                {claimingFree ? <Text style={styles.offerPrice}>Activation…</Text> : null}
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.offerCard, pickHours && styles.offerCardSelected]}
              onPress={() => setPickHours((v) => !v)}
            >
              <Text style={styles.offerTitle}>Heure avec moniteur</Text>
              <Text style={styles.offerPrice}>
                {formatPrice(hoursModule?.price || 5000)} / heure
                {qty >= 2 ? ` · total ${formatPrice(hoursPrice)} (−1 000)` : ''}
              </Text>
            </Pressable>

            {pickHours ? (
              <TextInput
                style={styles.hoursInput}
                keyboardType="number-pad"
                value={hoursQty}
                onChangeText={setHoursQty}
                placeholder="Nombre d’heures"
                placeholderTextColor={dark.textMuted}
              />
            ) : null}

            {pickHours ? (
              <Bouncy scaleTo={0.97} disabled={claimingFree} onPress={() => setCheckoutOpen(true)}>
                <View style={[styles.accessButton, claimingFree && { opacity: 0.5 }]}>
                  <Text style={styles.accessButtonText}>Payer {formatPrice(cartTotal)}</Text>
                </View>
              </Bouncy>
            ) : null}
            <LegalFooter />
          </ScrollView>
          <MobileMoneyCheckout
            visible={checkoutOpen}
            items={cartItems}
            modules={modules}
            defaultPhone={user.phone}
            onClose={() => setCheckoutOpen(false)}
            onRedeemPromo={async (code) => {
              // Code promo donné par l'administrateur : débloque l'accès sans paiement.
              const result = await redeemPromoCode(code)
              setAccessMe(result.access)
              setCheckoutOpen(false)
            }}
            onSuccess={(access) => {
              setAccessMe(access)
              setCheckoutOpen(false)
            }}
          />
        </SafeAreaView>
      </View>
    )
  }

  // Tout tient sur un seul écran : la hauteur disponible est répartie entre les blocs.
  const GAP = 12
  const bodyHeight = Math.max(380, Math.round(windowHeight - insets.top - insets.bottom - 68 - 24))
  const usable = Math.max(0, bodyHeight - GAP * 3)
  const scale = Math.max(0.68, Math.min(1.15, bodyHeight / 560))
  const bannerH = Math.round(usable * 0.32)
  const progressH = Math.round(usable * 0.16)
  const wideH = Math.round(usable * 0.16)
  const cardsH = usable - bannerH - progressH - wideH

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ConduiteHeader onBack={goHome} onProfile={goProfile} />

        <View style={styles.body}>
          <View style={{ height: bannerH }}>
            <CodeRouteBanner
              height={bannerH}
              scale={scale}
              title="Prends la route"
              text="Suis tes heures, réserve tes séances avec un moniteur."
            />
          </View>

          <View style={[styles.progressRow, { height: progressH }]}>
            {progress ? (
              <>
                <HoursRing percent={progress.percent} />
                <View style={styles.progressCopy}>
                  <Text style={styles.progressLabel} numberOfLines={1}>
                    {progress.heuresEffectuees} / {progress.heuresObjectif} h de conduite
                  </Text>
                  <ProgressBar
                    progress={progress.percent / 100}
                    color={dark.green}
                    trackColor="rgba(0,16,48,0.08)"
                    height={7}
                  />
                  <Text style={styles.progressMeta} numberOfLines={1}>
                    Solde heures moniteur : {progress.soldeHeures} h
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.progressMeta} numberOfLines={2}>
                {error ?? 'Chargement de ta progression…'}
              </Text>
            )}
          </View>

          <View style={[styles.cardsRow, { height: cardsH }]}>
            {[
              {
                key: 'lessons',
                title: 'Leçons',
                hint: 'Manœuvres, circulation et examen',
                image: require('../../assets/code-route/cards/revision.jpg'),
                shade: ['rgba(255,196,222,0.97)', 'rgba(255,214,232,0.72)', 'rgba(255,236,245,0)'] as [string, string, string],
                iconBg: 'rgba(219,39,119,0.92)',
                arrow: '#DB2777',
                Icon: BookOpen,
                go: () => navigation.navigate('LeconsChapitres'),
              },
              {
                key: 'reserve',
                title: 'Réserver une séance',
                hint: 'Choisir un créneau avec un moniteur',
                image: require('../../assets/code-route/cards/examens.jpg'),
                shade: ['rgba(255,205,150,0.97)', 'rgba(255,224,186,0.72)', 'rgba(255,243,226,0)'] as [string, string, string],
                iconBg: 'rgba(234,88,12,0.92)',
                arrow: '#EA580C',
                Icon: CalendarPlus,
                go: () => navigation.navigate('ReservationFlow'),
              },
            ].map((card) => (
              <View key={card.key} style={styles.cardCell}>
                <Bouncy scaleTo={0.98} onPress={card.go}>
                  <View style={[styles.tile, { height: cardsH }]}>
                    <Image source={card.image} style={styles.tileImage} resizeMode="cover" />
                    <LinearGradient
                      colors={card.shade}
                      locations={[0, 0.5, 1]}
                      start={{ x: 0, y: 0.7 }}
                      end={{ x: 1, y: 0.15 }}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />
                    <View style={styles.tileBody}>
                      <View style={[styles.tileIcon, { backgroundColor: card.iconBg }]}>
                        <card.Icon size={16} color="#FFFFFF" />
                      </View>
                      <Text style={styles.tileTitle} numberOfLines={2}>{card.title}</Text>
                      {cardsH >= 120 ? (
                        <Text style={styles.tileHint} numberOfLines={2}>{card.hint}</Text>
                      ) : null}
                      <View style={styles.tileArrow}>
                        <ChevronRight size={15} color={card.arrow} />
                      </View>
                    </View>
                  </View>
                </Bouncy>
              </View>
            ))}
          </View>

          <Bouncy scaleTo={0.98} onPress={() => navigation.navigate('MesReservations')}>
            <View style={[styles.wideCard, { height: wideH }]}>
              <Image
                source={require('../../assets/code-route/cards/notes.jpg')}
                style={styles.wideImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['#0A1E55', '#0A1E55', 'rgba(10,30,85,0.55)', 'rgba(10,30,85,0)']}
                locations={[0, 0.42, 0.7, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
              <View style={styles.wideBody}>
                <View style={styles.wideIcon}>
                  <Calendar size={22} color="#FFFFFF" />
                </View>
                <View style={styles.wideCopy}>
                  <Text style={styles.wideTitle}>Mes réservations</Text>
                  <Text style={styles.wideSub} numberOfLines={2}>
                    {upcoming.length === 0
                      ? 'Aucune séance réservée pour le moment.'
                      : `${upcoming.length} séance${upcoming.length > 1 ? 's' : ''} à venir.`}
                  </Text>
                </View>
                <View style={styles.wideArrow}>
                  <ChevronRight size={20} color={dark.textPrimary} />
                </View>
              </View>
            </View>
          </Bouncy>
        </View>

        <Modal
          visible={Boolean(cancelTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => !cancelling && setCancelTarget(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => !cancelling && setCancelTarget(null)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Annuler la séance</Text>
              <Text style={styles.modalMeta}>
                {cancelTarget?.creneau
                  ? `${cancelTarget.creneau.date} · ${cancelTarget.creneau.startTime}`
                  : 'Séance'}{' '}
                — {cancelTarget?.moniteur?.fullName || 'Moniteur'}
              </Text>
              <Text style={styles.modalLabel}>Justification (obligatoire)</Text>
              <TextInput
                style={styles.modalInput}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Ex. Empêchement, maladie, transport…"
                placeholderTextColor={dark.textMuted}
                multiline
                maxLength={500}
                editable={!cancelling}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalSecondary}
                  disabled={cancelling}
                  onPress={() => setCancelTarget(null)}
                >
                  <Text style={styles.modalSecondaryText}>Fermer</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalPrimary,
                    (cancelling || cancelReason.trim().length < 5) && styles.disabled,
                  ]}
                  disabled={cancelling || cancelReason.trim().length < 5}
                  onPress={() => void submitCancel()}
                >
                  <Text style={styles.modalPrimaryText}>
                    {cancelling ? 'Annulation…' : 'Confirmer'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12, gap: 12 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.05)',
    ...shadows.md,
  },
  cardsRow: { flexDirection: 'row', gap: 12 },
  cardCell: { flex: 1 },
  tile: { borderRadius: 26, overflow: 'hidden', ...shadows.card },
  tileImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  tileBody: { flex: 1, padding: 12, justifyContent: 'flex-end' },
  tileIcon: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileTitle: { fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 18, color: dark.textPrimary, paddingRight: 30 },
  tileHint: { marginTop: 3, fontFamily: fonts.bodyMedium, fontSize: 11.5, lineHeight: 15, color: '#475569', paddingRight: 34 },
  tileArrow: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  wideCard: { borderRadius: 26, overflow: 'hidden', backgroundColor: '#0A1E55', ...shadows.card },
  wideImage: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '62%', height: '100%' },
  wideBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, zIndex: 2 },
  wideIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  wideCopy: { flex: 1, maxWidth: '62%' },
  wideTitle: { fontFamily: fonts.displayBold, fontSize: 19, color: '#FFFFFF', letterSpacing: -0.3 },
  wideSub: { marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.92)' },
  wideArrow: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  topBarSub: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: dark.textMuted },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  topBarTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    lineHeight: 23,
    color: dark.textPrimary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  footerPad: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  hero: {
    marginBottom: 24,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: ORANGE,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 36,
    lineHeight: 42,
    color: dark.textPrimary,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textMuted,
  },

  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  ringWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    position: 'absolute',
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    color: dark.green,
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  progressLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 28,
    color: dark.textPrimary,
  },
  progressMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  progressMetaHint: {
    color: dark.textMuted,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  actionReserve: {
    borderColor: 'rgba(0,176,80,0.22)',
  },
  actionLessons: {
    borderColor: 'rgba(249,115,22,0.28)',
  },
  secondAction: {
    marginTop: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconReserve: {
    backgroundColor: brand.greenPale,
  },
  actionIconLessons: {
    backgroundColor: ORANGE_SOFT,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 3,
  },
  actionHint: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: dark.textMuted,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: dark.textPrimary,
  },
  seeAll: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    ...shadows.sm,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BLUE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  reservationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    ...shadows.sm,
  },
  reservationTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  reservationMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  cancelLink: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,93,59,0.4)',
  },
  cancelLinkText: {
    color: dark.coral,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: BLUE_SOFT,
    borderRadius: 16,
    padding: 16,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textPrimary,
  },

  accessScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  accessState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  accessLock: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    ...shadows.sm,
  },
  accessStateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  accessButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  accessButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  offerCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  offerCardSelected: {
    borderColor: dark.green,
  },
  offerTitle: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  offerPrice: {
    color: dark.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  hoursInput: {
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    backgroundColor: '#FFFFFF',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,16,48,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  modalMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginBottom: 14,
  },
  modalLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    color: dark.textPrimary,
    backgroundColor: '#F8FAFC',
    fontFamily: fonts.body,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondary: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalSecondaryText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  modalPrimary: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  error: {
    color: dark.coral,
    fontFamily: fonts.bodyMedium,
    marginBottom: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
  },
})
