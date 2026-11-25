import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react-native'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ContentError,
  fetchResultAttemptReview,
  type ResultExamRow,
  type ResultReviewQuestion,
} from '../../api/revision'
import { fonts } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { RES, formatDateFr, formatNote, gradeTone } from './resultsTheme'

type Filter = 'all' | ResultReviewQuestion['state']

const STATE_LABEL: Record<ResultReviewQuestion['state'], string> = {
  correct: 'Bonne réponse',
  wrong: 'Mauvaise réponse',
  skipped: 'Zappée',
  unanswered: 'Non répondue',
}

const STATE_COLOR: Record<ResultReviewQuestion['state'], { fg: string; bg: string }> = {
  correct: { fg: RES.ok, bg: RES.okSoft },
  wrong: { fg: RES.ko, bg: RES.koSoft },
  skipped: { fg: '#64748B', bg: 'rgba(100,116,139,0.12)' },
  unanswered: { fg: RES.muted, bg: RES.tint },
}

/** Détail d'un examen : note, chiffres exacts et correction question par question. */
export function ResultReviewSheet({
  row,
  passScore,
  onClose,
}: {
  row: ResultExamRow | null
  passScore: number
  onClose: () => void
}) {
  const [questions, setQuestions] = useState<ResultReviewQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const attemptId = row?.attemptId ?? null
  useEffect(() => {
    if (!attemptId) return
    let cancelled = false
    setQuestions(null)
    setError(null)
    setFilter('all')
    fetchResultAttemptReview(attemptId)
      .then((data) => {
        if (!cancelled) setQuestions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ContentError ? err.message : 'Correction indisponible')
      })
    return () => {
      cancelled = true
    }
  }, [attemptId])

  const counts = useMemo(() => {
    const c = { all: 0, correct: 0, wrong: 0, skipped: 0, unanswered: 0 }
    for (const q of questions ?? []) {
      c.all += 1
      c[q.state] += 1
    }
    return c
  }, [questions])

  const visible = useMemo(
    () => (questions ?? []).filter((q) => filter === 'all' || q.state === filter),
    [questions, filter],
  )

  const tone = gradeTone(row ? row.note : null)
  const ratio = row && row.total > 0 ? Math.min(1, row.correct / row.total) : 0

  return (
    <Modal visible={Boolean(row)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        {row ? (
          <>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headTitle}>{row.subject}</Text>
                <Text style={styles.headSub}>Composé le {formatDateFr(row.composedAt)}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Fermer" hitSlop={10}>
                <X size={22} color={RES.ink} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={[styles.verdict, { backgroundColor: tone.fg }]}>
                <View style={styles.verdictTop}>
                  <Text style={styles.verdictLabel}>
                    {row.completed ? 'Note finale' : 'Note actuelle'}
                  </Text>
                  <View style={styles.verdictBadge}>
                    <Text style={[styles.verdictBadgeText, { color: tone.deep }]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={styles.verdictNote}>
                  {formatNote(row.note)}
                  <Text style={styles.verdictOver}>/20</Text>
                </Text>
                <View style={styles.verdictTrack}>
                  <View style={[styles.verdictFill, { width: `${Math.round(ratio * 100)}%` }]} />
                </View>
                <Text style={styles.verdictMeta}>
                  {row.correct} bonne{row.correct > 1 ? 's' : ''} réponse{row.correct > 1 ? 's' : ''} sur {row.total}
                  {' · '}seuil {passScore}/20
                </Text>
              </View>

              <View style={styles.statRow}>
                <Stat label="Traitées" value={row.treated} />
                <Stat label="Incorrectes" value={row.incorrect} />
                <Stat label="Non traitées" value={row.unanswered} />
                <Stat label="Total ratées" value={row.failed} />
              </View>
              <Text style={styles.rule}>
                Les questions non traitées sont comptées comme des erreurs. Note = correctes ÷ {row.total} × 20.
              </Text>

              <Text style={styles.sectionTitle}>Questions et réponses</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {!questions && !error ? <ActivityIndicator color={tone.fg} style={{ marginTop: 18 }} /> : null}

              {questions ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                    {(
                      [
                        ['all', 'Toutes'],
                        ['wrong', 'Fausses'],
                        ['correct', 'Bonnes'],
                        ['skipped', 'Zappées'],
                        ['unanswered', 'Non répondues'],
                      ] as [Filter, string][]
                    ).map(([key, label]) => {
                      const active = filter === key
                      const disabled = key !== 'all' && counts[key] === 0
                      return (
                        <Pressable
                          key={key}
                          disabled={disabled}
                          onPress={() => setFilter(key)}
                          style={[styles.filterChip, active && { backgroundColor: RES.ink, borderColor: RES.ink }, disabled && { opacity: 0.4 }]}
                        >
                          <Text style={[styles.filterText, active && styles.filterTextActive]}>
                            {label} ({counts[key]})
                          </Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>

                  {visible.map((q) => (
                    <QuestionCard key={q.questionId} question={q} />
                  ))}
                </>
              ) : null}
            </ScrollView>
          </>
        ) : null}
      </SafeAreaView>
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function QuestionCard({ question: q }: { question: ResultReviewQuestion }) {
  const tone = STATE_COLOR[q.state]
  const image = resolveMediaUrl(q.prompt.imageUrls[0])
  return (
    <View style={[styles.qCard, { borderLeftColor: tone.fg }]}>
      <View style={styles.qHead}>
        <Text style={styles.qTitle}>
          Question {q.index + 1}
          {q.chapterOrder !== null ? ` · Chap. ${q.chapterOrder}` : ''}
        </Text>
        <View style={[styles.qChip, { backgroundColor: tone.bg }]}>
          <Text style={[styles.qChipText, { color: tone.fg }]}>{STATE_LABEL[q.state]}</Text>
        </View>
      </View>

      {!q.found ? (
        <Text style={styles.qNote}>Question introuvable : correction à confirmer.</Text>
      ) : (
        <>
          {image ? <Image source={{ uri: image }} style={styles.qImage} resizeMode="contain" /> : null}
          {q.prompt.text ? <Text style={styles.qText}>{q.prompt.text}</Text> : null}
          {!q.prompt.text && q.prompt.audioUrl ? (
            <Text style={styles.qNote}>Question audio — réécoutez-la depuis l’examen.</Text>
          ) : null}
          {q.hidden ? (
            <Text style={styles.qNote}>Bonne réponse masquée tant que l’examen n’est pas terminé.</Text>
          ) : !q.correctionAvailable ? (
            <Text style={styles.qNote}>Aucune bonne réponse enregistrée : correction à confirmer.</Text>
          ) : null}

          {q.answers.map((a) => {
            const bad = a.selected && !a.isCorrect
            return (
              <View
                key={a.id}
                style={[styles.ans, a.isCorrect && styles.ansOk, bad && styles.ansKo]}
              >
                <View style={[styles.letter, a.isCorrect && { backgroundColor: RES.ok }, bad && { backgroundColor: RES.ko }]}>
                  <Text style={[styles.letterText, (a.isCorrect || bad) && { color: '#fff' }]}>{a.label}</Text>
                </View>
                <Text style={styles.ansText} numberOfLines={3}>
                  {a.text || `Réponse ${a.label}`}
                </Text>
                {a.selected ? (
                  <View style={[styles.tag, { backgroundColor: a.isCorrect ? RES.okSoft : RES.koSoft }]}>
                    <Text style={[styles.tagText, { color: a.isCorrect ? RES.ok : RES.ko }]}>Votre choix</Text>
                  </View>
                ) : null}
                {a.isCorrect ? <Check size={16} color={RES.ok} /> : null}
              </View>
            )
          })}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: RES.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  headTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: RES.ink, letterSpacing: -0.3 },
  headSub: { fontFamily: fonts.body, fontSize: 12, color: RES.muted, marginTop: 2 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  verdict: { borderRadius: 30, padding: 22, gap: 8 },
  verdictTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verdictBadge: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  verdictBadgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  verdictOver: { fontFamily: fonts.displayBold, fontSize: 24, color: 'rgba(255,255,255,0.8)' },
  verdictTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', marginTop: 2 },
  verdictFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  verdictLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  verdictNote: { fontFamily: fonts.displayExtraBold, fontSize: 56, lineHeight: 62, color: '#fff' },
  verdictMeta: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: RES.line, borderRadius: 22, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontFamily: fonts.displayBold, fontSize: 26, color: RES.ink },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: RES.muted, marginTop: 2, textAlign: 'center' },
  rule: { fontFamily: fonts.body, fontSize: 12, color: RES.muted, marginTop: 10, lineHeight: 17 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: RES.ink, marginTop: 22, marginBottom: 12 },
  error: { fontFamily: fonts.body, color: RES.ko, marginTop: 8 },
  filters: { gap: 8, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: RES.line },
  filterChipActive: { backgroundColor: RES.navy },
  filterText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: RES.ink },
  filterTextActive: { color: '#fff' },
  qCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: RES.line,
  },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  qTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: RES.ink, flexShrink: 1 },
  qChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  qChipText: { fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  qImage: { width: '100%', height: 130, borderRadius: 12, backgroundColor: RES.tint },
  qText: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: RES.ink },
  qNote: { fontFamily: fonts.body, fontSize: 12.5, color: RES.muted, lineHeight: 18 },
  ans: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: RES.line,
  },
  ansOk: { backgroundColor: RES.okSoft, borderColor: 'rgba(22,163,74,0.35)' },
  ansKo: { backgroundColor: RES.koSoft, borderColor: 'rgba(220,38,38,0.35)' },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
  },
  letterText: { fontFamily: fonts.bodyBold, fontSize: 13, color: RES.ink },
  ansText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: RES.ink },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
})
