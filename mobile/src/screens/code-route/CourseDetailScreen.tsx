import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { BookOpen, Check, ClipboardList, Lock } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  fetchCourseProgress,
  markCourseCompleted,
  startCourseSession,
} from '../../api/revision'
import { EmptyState } from '../../components/EmptyState'
import { LegalFooter } from '../../components/LegalFooter'
import { MediaContent } from '../../components/MediaContent'
import { RES, ReserveButton, ReserveHeader, ReserveOutlineButton } from '../../components/ReserveFrame'
import { ScreenLoader } from '../../components/ScreenLoader'
import { CourseDetailSkeleton } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useOffline } from '../../context/OfflineContext'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, shadows } from '../../theme'
import { formatSeconds, isCourseUnlocked } from '../../utils/unlock'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CourseDetail'>
type Route = RouteProp<RootStackParamList, 'CourseDetail'>

const STANDALONE_CHAPTER = 'standalone'

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Détail cours code — même UX que LeconDetailScreen (conduite). */
export function CourseDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { isOffline, enqueue } = useOffline()
  const unreadCount = useUnreadNotifications(Boolean(user))
  const { chapterId, chapterName, course, courses: coursesParam } = route.params
  const courses = coursesParam?.length ? coursesParam : [course]
  const isStandalone = chapterId === STANDALONE_CHAPTER

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessBlocked, setAccessBlocked] = useState(false)

  const courseIndex = useMemo(
    () => courses.findIndex((item) => item.id === course.id),
    [courses, course.id],
  )
  const nextCourse = courseIndex >= 0 ? courses[courseIndex + 1] : undefined
  const isCompleted = completedIds.has(course.id)
  const allCompleted = courses.length > 0 && courses.every((item) => completedIds.has(item.id))
  const canValidate = !isCompleted
  
  const loadProgress = useCallback(async () => {
    setProgressLoading(true)
    setError(null)
    try {
      const entries = await fetchCourseProgress(chapterId)
      const ids = new Set(entries.map((entry) => entry.courseId))
      setCompletedIds(ids)

      const unlocked = isCourseUnlocked(courseIndex, courses[courseIndex - 1]?.id, ids)
      if (!unlocked) {
        setAccessBlocked(true)
        return
      }
      setAccessBlocked(false)

      if (ids.has(course.id)) {
        setSecondsRemaining(0)
        return
      }

      const session = await startCourseSession(chapterId, course.id)
      setSecondsRemaining(session.alreadyCompleted ? 0 : session.secondsRemaining)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Progression indisponible')
    } finally {
      setProgressLoading(false)
    }
  }, [chapterId, course.id, courseIndex, courses])

  useEffect(() => {
    if (user) void loadProgress()
  }, [user, loadProgress])

  useEffect(() => {
    if (isCompleted || progressLoading || accessBlocked) return
    const timer = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isCompleted, progressLoading, accessBlocked, course.id])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  const handleToggleComplete = async () => {
    if (isCompleted || saving || !canValidate) return
    setSaving(true)
    setError(null)
    try {
      if (isOffline) {
        await enqueue('markCourseCompleted', { chapterId, courseId: course.id })
      } else {
        await markCourseCompleted(chapterId, course.id)
      }
      setCompletedIds((current) => new Set(current).add(course.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) return <ScreenLoader />

  // Un chapitre = un cours : « Cours 3 ». Le numéro vient de la liste.
  const courseNumber = courseIndex >= 0 ? courseIndex + 1 : 1
  const unlockLabel =
    secondsRemaining > 0 ? `Encore ${formatSeconds(secondsRemaining)} avant de valider` : ''

  const header = (
    <ReserveHeader
      title={`Cours ${courseNumber}`}
      unread={unreadCount}
      onBack={() => navigation.goBack()}
      onBell={() => navigation.navigate('Notifications')}
    />
  )

  if (accessBlocked) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {header}
          <EmptyState
            icon={<Lock size={30} color={dark.textMuted} />}
            title="Cours verrouillé"
            message="Terminez le cours précédent pour accéder à celui-ci."
          />
          <View style={styles.footerPad}>
            <LegalFooter />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  const goNext = () => {
    if (!nextCourse) return
    navigation.replace('CourseDetail', {
      chapterId,
      chapterName: `Cours ${courseNumber + 1}`,
      course: nextCourse,
      courses,
    })
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          removeClippedSubviews={false}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{course.title}</Text>
            {isCompleted ? (
              <View style={styles.donePill}>
                <Check size={13} color="#FFFFFF" strokeWidth={3.2} />
                <Text style={styles.donePillText}>Terminé</Text>
              </View>
            ) : null}
          </View>

          {progressLoading ? <CourseDetailSkeleton /> : null}

          {!progressLoading && course.modules.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={30} color={RES.green} />}
              title="Contenu à venir"
              message="Ce cours ne contient pas encore de contenu publié."
            />
          ) : null}

          {!progressLoading
            ? course.modules.map((module) => (
                <View key={module.id} style={styles.contentCard}>
                  <MediaContent
                    videoUrl={module.mediaType === 'image' ? '' : module.videoUrl}
                    imageUrl={module.mediaType === 'video' ? '' : module.imageUrl}
                    text={module.text}
                  />
                </View>
              ))
            : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <LegalFooter />
        </ScrollView>

        {!progressLoading && course.modules.length > 0 ? (
          <View style={styles.bottomBar}>
            {isCompleted ? (
              nextCourse ? (
                <ReserveButton label="Cours suivant" onPress={goNext} />
              ) : isStandalone ? (
                <ReserveOutlineButton label="Retour aux cours" onPress={() => navigation.navigate('CodeCours')} />
              ) : (
                <ReserveButton
                  label={allCompleted ? 'Accéder aux sujets test' : 'Terminez tous les cours pour le test'}
                  disabled={!allCompleted}
                  icon={<ClipboardList size={20} color="#FFFFFF" />}
                  arrow={false}
                  onPress={() => navigation.navigate('ChapterTestSubject', { chapterId, chapterName })}
                />
              )
            ) : (
              <>
                {unlockLabel ? <Text style={styles.hint}>{unlockLabel}</Text> : null}
                <ReserveButton
                  label={saving ? 'Enregistrement…' : 'J’ai terminé ce cours'}
                  disabled={saving || secondsRemaining > 0}
                  arrow={false}
                  icon={<Check size={20} color="#FFFFFF" strokeWidth={3} />}
                  onPress={() => void handleToggleComplete()}
                />
              </>
            )}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, gap: 14 },
  titleBlock: { gap: 10 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 26, lineHeight: 32, color: RES.ink, letterSpacing: -0.5 },
  donePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: RES.green,
  },
  donePillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' },
  contentCard: {
    padding: 14,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: RES.line,
    ...shadows.sm,
  },
  errorText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: dark.coral },
  hint: { textAlign: 'center', fontFamily: fonts.bodyMedium, fontSize: 13.5, color: RES.muted, marginBottom: 8 },
  bottomBar: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, backgroundColor: '#FFFFFF' },
  footerPad: { paddingHorizontal: 18 },
})
