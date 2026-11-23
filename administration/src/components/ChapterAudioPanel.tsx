import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, Upload, Volume2 } from 'lucide-react'
import {
  deleteChapterAudio,
  fetchChapterAudios,
  uploadChapterAudios,
  type ChapterAudiosData,
} from '../api/questions'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

/** Publication des audios d'un chapitre (stockés en base). Fichiers nommés {n° question}.mp3. */
export function ChapterAudioPanel({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<ChapterAudiosData | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [replaceFor, setReplaceFor] = useState<number | null>(null)
  const bulkInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    try {
      setData(await fetchChapterAudios(token, chapterId))
    } catch (err) {
      setMessage({ kind: 'err', text: isAuthError(err) ? err.message : 'Chargement des audios impossible' })
    }
  }, [chapterId])

  useEffect(() => {
    void load()
  }, [load])

  async function send(files: File[]) {
    const token = getAdminToken()
    if (!token || !files.length) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await uploadChapterAudios(token, chapterId, files)
      const rejected = result.rejected.map((r) => `${r.filename} : ${r.error}`)
      setMessage({
        kind: rejected.length ? 'err' : 'ok',
        text:
          `${result.published.length} audio(s) publié(s).` +
          (rejected.length ? ` Refusés — ${rejected.join(' ; ')}` : ''),
      })
      await load()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Publication impossible' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(questionOrder: number) {
    const token = getAdminToken()
    if (!token) return
    if (!window.confirm(`Retirer l'audio de la question ${questionOrder} ? Il ne sera plus lu par les apprenants.`)) return
    setBusy(true)
    try {
      await deleteChapterAudio(token, chapterId, questionOrder)
      await load()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Suppression impossible' })
    } finally {
      setBusy(false)
    }
  }

  if (!data) return message ? <p className="cx-note cx-note-err" role="alert">{message.text}</p> : null

  return (
    <section className="cx-card" style={{ marginBottom: 16, padding: 16 }} aria-label="Audios du chapitre">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>Audios du chapitre {data.chapter.order}</strong>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            {data.publishedCount} publié(s) sur {data.expectedCount} question(s). Fichiers nommés{' '}
            <code>1.mp3</code>, <code>2.mp3</code>… (numéro de la question).
          </div>
        </div>
        <button type="button" className="cx-refresh" disabled={busy} onClick={() => bulkInput.current?.click()}>
          <Upload aria-hidden /> Publier des audios
        </button>
        <input
          ref={bulkInput}
          type="file"
          accept="audio/mpeg,.mp3"
          multiple
          hidden
          onChange={(e) => {
            void send(Array.from(e.target.files || []))
            e.target.value = ''
          }}
        />
        <input
          ref={replaceInput}
          type="file"
          accept="audio/mpeg,.mp3"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && replaceFor) void send([new File([file], `${replaceFor}.mp3`, { type: file.type })])
            setReplaceFor(null)
            e.target.value = ''
          }}
        />
      </div>

      {message ? (
        <p className={message.kind === 'err' ? 'cx-note cx-note-err' : 'cx-note'} role="status">
          {message.text}
        </p>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginTop: 12 }}>
        {data.audios.map((item) => (
          <div
            key={item.questionOrder}
            style={{ border: '1px solid rgba(128,128,128,.3)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Question {item.questionOrder}</strong>
              <span style={{ fontSize: 12, color: item.published ? 'seagreen' : 'crimson' }}>
                {item.published ? `Publié · ${formatSize(item.size)}` : 'Manquant'}
              </span>
            </div>
            {item.published ? (
              <audio controls preload="none" src={resolveMediaUrl(`${item.url}?v=${item.updatedAt || ''}`)} style={{ width: '100%' }} />
            ) : null}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="cx-refresh"
                disabled={busy}
                onClick={() => {
                  setReplaceFor(item.questionOrder)
                  setTimeout(() => replaceInput.current?.click(), 0)
                }}
              >
                {item.published ? <Volume2 aria-hidden /> : <Upload aria-hidden />}
                {item.published ? 'Remplacer' : 'Ajouter'}
              </button>
              {item.published ? (
                <button type="button" className="cx-refresh" disabled={busy} onClick={() => void remove(item.questionOrder)}>
                  <Trash2 aria-hidden /> Retirer
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
