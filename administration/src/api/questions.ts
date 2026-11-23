import { apiFetch, apiUpload } from './client'
import type {
  ChapterQuestion,
  QuestionPayload,
  TestSubject,
  TestSubjectCurrent,
} from '../types/questions'

export function fetchChapterQuestions(token: string, chapterId: string) {
  return apiFetch<{
    chapter: { id: string; name: string; order?: number }
    questions: ChapterQuestion[]
    fileBased?: boolean
    hardcoded?: boolean
    awaitingFiles?: boolean
    readOnly?: boolean
  }>(`/api/admin/revision/chapters/${chapterId}/questions`, {}, token)
}

export function createQuestion(token: string, chapterId: string, payload: QuestionPayload) {
  return apiFetch<{ question: ChapterQuestion }>(
    `/api/admin/revision/chapters/${chapterId}/questions`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updateQuestion(
  token: string,
  chapterId: string,
  questionId: string,
  payload: Partial<QuestionPayload> & { published?: boolean },
) {
  return apiFetch<{ question: ChapterQuestion }>(
    `/api/admin/revision/chapters/${chapterId}/questions/${questionId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteQuestion(token: string, chapterId: string, questionId: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/revision/chapters/${chapterId}/questions/${questionId}`,
    { method: 'DELETE' },
    token,
  )
}

export function fetchCurrentTestSubject(token: string, chapterId: string) {
  return apiFetch<TestSubjectCurrent>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/current`,
    {},
    token,
  )
}

export function generateTestSubject(token: string, chapterId: string) {
  return apiFetch<{
    bankCount: number
    requiredCount: number
    subject: TestSubject
  }>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/generate`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
}

export function updateTestSubject(
  token: string,
  chapterId: string,
  subjectId: string,
  payload: { published: boolean },
) {
  return apiFetch<{ subject: TestSubject }>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/${subjectId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteTestSubject(token: string, chapterId: string, subjectId: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/${subjectId}`,
    { method: 'DELETE' },
    token,
  )
}

export function uploadRevisionAudio(token: string, file: Blob, filename = 'audio.webm') {
  const formData = new FormData()
  formData.append('audio', file, filename)
  return apiUpload<{ audioUrl: string; audioPublicId: string; mediaBytes: number }>(
    '/api/admin/revision/upload-audio',
    formData,
    token,
  )
}

export interface ChapterAudioItem {
  questionOrder: number
  published: boolean
  expected: boolean
  size: number
  filename: string
  updatedAt: string | null
  url: string
}

export interface ChapterAudiosData {
  chapter: { id: string; name: string; order: number }
  publishedCount: number
  expectedCount: number
  audios: ChapterAudioItem[]
}

export function fetchChapterAudios(token: string, chapterId: string) {
  return apiFetch<ChapterAudiosData>(`/api/admin/revision/chapters/${chapterId}/audios`, {}, token)
}

/** Publie un ou plusieurs MP3 (nommés « {numéro de question}.mp3 ») dans le chapitre. */
export function uploadChapterAudios(token: string, chapterId: string, files: File[]) {
  const form = new FormData()
  for (const file of files) form.append('files', file, file.name)
  return apiUpload<{
    chapterOrder: number
    published: number[]
    rejected: { filename: string; error: string }[]
  }>(`/api/admin/revision/chapters/${chapterId}/audios/bulk`, form, token)
}

export function deleteChapterAudio(token: string, chapterId: string, questionOrder: number) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/revision/chapters/${chapterId}/audios/${questionOrder}`,
    { method: 'DELETE' },
    token,
  )
}

export interface ChapterImageItem {
  imageIndex: number
  published: boolean
  expected: boolean
  size: number
  filename: string
  updatedAt: string | null
  url: string
}

export interface ChapterImagesData {
  chapter: { id: string; name: string; order: number }
  publishedCount: number
  expectedCount: number
  images: ChapterImageItem[]
}

export function fetchChapterImages(token: string, chapterId: string) {
  return apiFetch<ChapterImagesData>(`/api/admin/revision/chapters/${chapterId}/images`, {}, token)
}

/** Publie une ou plusieurs images (nommées « {numéro de question}.png ») dans le chapitre. */
export function uploadChapterImages(token: string, chapterId: string, files: File[]) {
  const form = new FormData()
  for (const file of files) form.append('files', file, file.name)
  return apiUpload<{
    chapterOrder: number
    published: number[]
    rejected: { filename: string; error: string }[]
  }>(`/api/admin/revision/chapters/${chapterId}/images/bulk`, form, token)
}

export function deleteChapterImage(token: string, chapterId: string, imageIndex: number) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/revision/chapters/${chapterId}/images/${imageIndex}`,
    { method: 'DELETE' },
    token,
  )
}
