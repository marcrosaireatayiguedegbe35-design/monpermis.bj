export type LocalAnswer = {
  id: string
  label: string
  text: string
  audioUrl: string
  isCorrect: boolean
}

export type LocalQuestion = {
  id: string
  chapterKey: string
  chapterOrder: number
  order: number
  published: boolean
  prompt: { text: string; audioUrl: string; imageUrls: string[] }
  answers: LocalAnswer[]
}

function answers(
  chapterOrder: number,
  questionIndex: number,
  letters: string[],
  correctLetters: string[],
): LocalAnswer[] {
  const prefix = `hc-ch${chapterOrder}-q${String(questionIndex).padStart(2, '0')}`
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: `${prefix}-${L.toLowerCase()}`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(
  chapterOrder: number,
  order: number,
  letterOptions: string[],
  correctLetters: string[],
  imageIndexes: number[] = [],
): LocalQuestion {
  const id = `hc-ch${chapterOrder}-q${String(order).padStart(2, '0')}`
  return {
    id,
    chapterKey: `chapitre-${chapterOrder}`,
    chapterOrder,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: `local://code-audio/${chapterOrder}/${order}.mp3`,
      imageUrls: imageIndexes.map(
        (n) => `local://code-image/${chapterOrder}/${n}.png`,
      ),
    },
    answers: answers(chapterOrder, order, letterOptions, correctLetters),
  }
}
// Banque vide : le helper reste référencé pour ne pas déclencher « déclaré mais jamais lu ».
void question

/** Généré depuis server/src/data/hardcodedQuestions — ne pas éditer à la main.
 *  Régénérer: npm run generate:learner-banks --prefix server
 */

const CHAPITRE_1: LocalQuestion[] = [
]

const CHAPITRE_2: LocalQuestion[] = [
]

const CHAPITRE_3: LocalQuestion[] = [
]

const CHAPITRE_4: LocalQuestion[] = [
]

const CHAPITRE_5: LocalQuestion[] = [
]

const CHAPITRE_6: LocalQuestion[] = [
]

const CHAPITRE_7: LocalQuestion[] = [
]

const CHAPITRE_8: LocalQuestion[] = [
]

const CHAPITRE_9: LocalQuestion[] = [
]

const CHAPITRE_10: LocalQuestion[] = [
]

const CHAPITRE_11: LocalQuestion[] = [
]

const CHAPITRE_12: LocalQuestion[] = [
]

const CHAPITRE_13: LocalQuestion[] = [
]

const CHAPITRE_14: LocalQuestion[] = [
]

const CHAPITRE_15: LocalQuestion[] = [
]

const CHAPITRE_16: LocalQuestion[] = [
]

const CHAPITRE_17: LocalQuestion[] = [
]

const CHAPITRE_18: LocalQuestion[] = [
]

const CHAPITRE_19: LocalQuestion[] = [
]

const BANKS_BY_ORDER: Record<number, LocalQuestion[]> = {
  1: CHAPITRE_1,
  2: CHAPITRE_2,
  3: CHAPITRE_3,
  4: CHAPITRE_4,
  5: CHAPITRE_5,
  6: CHAPITRE_6,
  7: CHAPITRE_7,
  8: CHAPITRE_8,
  9: CHAPITRE_9,
  10: CHAPITRE_10,
  11: CHAPITRE_11,
  12: CHAPITRE_12,
  13: CHAPITRE_13,
  14: CHAPITRE_14,
  15: CHAPITRE_15,
  16: CHAPITRE_16,
  17: CHAPITRE_17,
  18: CHAPITRE_18,
  19: CHAPITRE_19,
}

export function getLocalBankByChapterOrder(order: number): LocalQuestion[] | null {
  return BANKS_BY_ORDER[order] || null
}

export function findLocalQuestionById(questionId: string): LocalQuestion | null {
  const id = String(questionId || '')
  for (const bank of Object.values(BANKS_BY_ORDER)) {
    const found = bank.find((q) => q.id === id)
    if (found) return found
  }
  return null
}

export function parseLocalQuestionId(questionId: string): { chapterOrder: number; questionOrder: number } | null {
  const m = String(questionId || '').match(/^hc-ch(\d+)-q(\d+)$/i)
  if (!m) return null
  return { chapterOrder: Number(m[1]), questionOrder: Number(m[2]) }
}

export function toPublicLocalQuestion(q: LocalQuestion, chapterId: string) {
  return {
    id: q.id,
    chapterId: String(chapterId),
    order: q.order,
    prompt: {
      text: q.prompt.text || '',
      audioUrl: q.prompt.audioUrl,
      imageUrls: q.prompt.imageUrls || [],
    },
    answers: q.answers.map((a) => ({
      id: a.id,
      label: a.label,
      text: a.text || '',
      audioUrl: a.audioUrl || '',
    })),
  }
}

export function checkLocalAnswers(questionId: string, answerIds: string[]) {
  const question = findLocalQuestionById(questionId)
  if (!question) return null
  const correctIds = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id))
  const selectedIds = new Set((answerIds || []).map(String))
  const isCorrect =
    correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id))
  return { isCorrect, correctAnswerIds: [...correctIds] }
}
