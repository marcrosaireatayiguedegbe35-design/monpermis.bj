import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { Check, ChevronRight } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchCourseChapters, fetchCourseProgress, type CourseChapter } from '../../api/revision'
import { LegalFooter } from '../../components/LegalFooter'
import { RES, ReserveHeader } from '../../components/ReserveFrame'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { fonts, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeCours'>

/** La progression des cours est enregistrée sous cette clé. */
const STANDALONE_CHAPTER = 'standalone'

/** Liste des cours du code de la route : un chapitre = un cours, présentés à plat. */
export function CodeCoursesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const unreadCount = useUnreadNotifications(Boolean(user))
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)

  const load = useCallback(async () => {
    setProgressLoading(true)
    try {
      const [list, entries] = await Promise.all([
        fetchCourseChapters(),
        fetchCourseProgress(STANDALONE_CHAPTER),
      ])
      setChapters(list)
      setCompletedIds(new Set(entries.map((entry) => entry.courseId)))
    } catch {
      setChapters([])
      setCompletedIds(new Set())
    } finally {
      setProgressLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) void load()
      return () => setStatusBarStyle('dark')
    }, [user, load]),
  )

  const courses = useMemo(() => chapters.flatMap((chapter) => chapter.courses), [chapters])
  const doneCount = useMemo(
    () => courses.filter((course) => completedIds.has(course.id)).length,
    [courses, completedIds],
  )
  const ratio = courses.length > 0 ? doneCount / courses.length : 0

  if (loading || !user) return <ScreenLoader />

  const open = (index: number) => {
    const course = courses[index]
    navigation.navigate('CourseDetail', {
      chapterId: STANDALONE_CHAPTER,
      chapterName: `Cours ${index + 1}`,
      course: { id: course.id, title: course.title, modules: course.modules },
      courses: courses.map((item) => ({ id: item.id, title: item.title, modules: item.modules })),
    })
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ReserveHeader
          title="Les cours"
          subtitle="Code de la route"
          unread={unreadCount}
          onBack={() => navigation.navigate('CodeRoute')}
          onBell={() => navigation.navigate('Notifications')}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {progressLoading ? <ActivityIndicator color={RES.green} style={{ marginVertical: 16 }} /> : null}

          {!progressLoading && courses.length > 0 ? (
            <View style={styles.progress}>
              <Text style={styles.progressText}>
                {doneCount} sur {courses.length} terminé{doneCount > 1 ? 's' : ''}
              </Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
            </View>
          ) : null}

          {!progressLoading && courses.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aucun cours</Text>
              <Text style={styles.emptyText}>Aucun cours publié pour le moment.</Text>
            </View>
          ) : null}

          {courses.map((course, index) => {
            const done = completedIds.has(course.id)
            return (
              <Pressable
                key={course.id}
                style={({ pressed }) => [styles.row, done && styles.rowDone, pressed && { opacity: 0.85 }]}
                onPress={() => open(index)}
                accessibilityRole="button"
                accessibilityLabel={`Cours ${index + 1} : ${course.title}`}
              >
                <View style={[styles.num, done && styles.numDone]}>
                  {done ? (
                    <Check size={18} color="#FFFFFF" strokeWidth={3.2} />
                  ) : (
                    <Text style={styles.numText}>{index + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={3}>
                    {course.title}
                  </Text>
                  <Text style={[styles.rowSub, done && { color: RES.green }]}>
                    {done ? 'Terminé' : 'Vidéo et texte'}
                  </Text>
                </View>
                <ChevronRight size={20} color={RES.muted} />
              </Pressable>
            )
          })}

          <LegalFooter />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, gap: 10 },
  progress: { gap: 8, marginBottom: 4 },
  progressText: { fontFamily: fonts.displayBold, fontSize: 15, color: RES.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: '#E8EEE9', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: RES.green },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: RES.line,
    ...shadows.sm,
  },
  rowDone: { backgroundColor: '#F5FBF7', borderColor: '#BFE3CC' },
  num: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: RES.soft },
  numDone: { backgroundColor: RES.green },
  numText: { fontFamily: fonts.displayExtraBold, fontSize: 17, color: RES.green },
  rowTitle: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, color: RES.ink },
  rowSub: { fontFamily: fonts.bodyMedium, fontSize: 13, color: RES.muted, marginTop: 2 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 40 },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: RES.ink },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: RES.muted },
})
