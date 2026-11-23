import { useCallback, useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import {
  deleteChapterImage,
  fetchChapterImages,
  uploadChapterImages,
  type ChapterImagesData,
} from '../api/questions'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'

/** Publication des images d'un chapitre (stockées en base). Fichiers nommés {n° question}.png. */
export function ChapterImagePanel({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<ChapterImagesData | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [replaceFor, setReplaceFor] = useState<number | null>(null)
  const bulkInput = useRef<HTMLInputElement>(null)
  const replaceInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    try {
      setData(await fetchChapterImages(token, chapterId))
    } catch (err) {
      setMessage({ kind: 'err', text: isAuthError(err) ? err.message : 'Chargement des images impossible' })
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
      const result = await uploadChapterImages(token, chapterId, files)
      const rejected = result.rejected.map((r) => `${r.filename} : ${r.error}`)
      setMessage({
        kind: rejected.length ? 'err' : 'ok',
        text:
          `${result.published.length} image(s) publiée(s).` +
          (rejected.length ? ` Refusées — ${rejected.join(' ; ')}` : ''),
      })
      await load()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Publication impossible' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(imageIndex: number) {
    const token = getAdminToken()
    if (!token) return
    if (!window.confirm(`Retirer l'image de la question ${imageIndex} ? Elle ne sera plus affichée aux apprenants.`)) return
    setBusy(true)
    try {
      await deleteChapterImage(token, chapterId, imageIndex)
      await load()
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Suppression impossible' })
    } finally {
      setBusy(false)
    }
  }

  if (!data) return message ? <p className="cx-note cx-note-err" role="alert">{message.text}</p> : null
  // Chapitre sans aucune image attendue ni publiée : rien à afficher.
  if (data.images.length === 0) return null

  return (
    <section className="cx-card" style={{ marginBottom: 16, padding: 16 }} aria-label="Images du chapitre">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong>Images du chapitre {data.chapter.order}</strong>
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            {data.publishedCount} publiée(s) sur {data.expectedCount} attendue(s). Fichiers nommés{' '}
            <code>3.png</code>, <code>12.png</code>… (numéro de la question).
          </div>
        </div>
        <button type="button" className="cx-refresh" disabled={busy} onClick={() => bulkInput.current?.click()}>
          <Upload aria-hidden /> Publier des images
        </button>
        <input
          ref={bulkInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
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
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && replaceFor) {
              const ext = /jpe?g/i.test(file.type) ? 'jpg' : /webp/i.test(file.type) ? 'webp' : 'png'
              void send([new File([file], `${replaceFor}.${ext}`, { type: file.type })])
            }
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginTop: 12 }}>
        {data.images.map((item) => (
          <div
            key={item.imageIndex}
            style={{ border: '1px solid rgba(128,128,128,.3)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Question {item.imageIndex}</strong>
              <span style={{ fontSize: 12, color: item.published ? 'seagreen' : 'crimson' }}>
                {item.published ? 'Publiée' : 'Manquante'}
              </span>
            </div>
            {item.published ? (
              <img
                src={resolveMediaUrl(`${item.url}?v=${item.updatedAt || ''}`)}
                alt={`Question ${item.imageIndex}`}
                loading="lazy"
                style={{ width: '100%', height: 90, objectFit: 'contain', background: 'rgba(128,128,128,.1)', borderRadius: 6 }}
              />
            ) : null}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="cx-refresh"
                disabled={busy}
                onClick={() => {
                  setReplaceFor(item.imageIndex)
                  setTimeout(() => replaceInput.current?.click(), 0)
                }}
              >
                {item.published ? <ImageIcon aria-hidden /> : <Upload aria-hidden />}
                {item.published ? 'Remplacer' : 'Ajouter'}
              </button>
              {item.published ? (
                <button type="button" className="cx-refresh" disabled={busy} onClick={() => void remove(item.imageIndex)}>
                  <Trash2 aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
