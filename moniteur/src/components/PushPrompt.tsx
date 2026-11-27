import { useCallback, useEffect, useState } from 'react'
import { Bell, Share } from 'lucide-react'
import { useMoniteurAuth, getMoniteurToken } from '../context/MoniteurAuthContext'
import { enablePush, needsInstallForPush, permissionState, pushSupported, subscribeDevice } from '../utils/push'

const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* stockage indisponible : sans importance */
  }
}

/**
 * Première connexion : propose d'activer les notifications sur le téléphone.
 * Déjà accepté : l'appareil est simplement ré-enregistré en silence.
 */
export function PushPrompt() {
  const { moniteur } = useMoniteurAuth()
  const id = moniteur?.id ? String(moniteur.id) : ''
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const askedKey = `mp-push-asked:${id}`

  useEffect(() => {
    if (!id || !pushSupported()) return
    const state = permissionState()
    if (state === 'granted') {
      const token = getMoniteurToken()
      if (token && !needsInstallForPush()) void subscribeDevice(token).catch(() => undefined)
      return
    }
    if (state !== 'default') return // refusé : on ne harcèle pas
    const until = Number(read(askedKey) || 0)
    if (until > Date.now()) return
    const timer = window.setTimeout(() => setOpen(true), 2500)
    return () => window.clearTimeout(timer)
  }, [id, askedKey])

  const later = useCallback(() => {
    write(askedKey, String(Date.now() + SNOOZE_MS))
    setOpen(false)
  }, [askedKey])

  const accept = async () => {
    const token = getMoniteurToken()
    if (!token) return
    setBusy(true)
    setMessage(null)
    const result = await enablePush(token)
    setBusy(false)
    if (result === 'granted') {
      write(askedKey, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
      setOpen(false)
    } else if (result === 'denied') {
      write(askedKey, String(Date.now() + 365 * 24 * 60 * 60 * 1000))
      setMessage('Notifications refusées. Vous pourrez les activer dans les réglages de votre navigateur.')
      window.setTimeout(() => setOpen(false), 3500)
    } else {
      setMessage('Impossible d’activer les notifications pour le moment. Réessayez plus tard.')
    }
  }

  if (!open) return null
  const install = needsInstallForPush()

  return (
    <div className="mp-sheet-bg" role="dialog" aria-modal="true" aria-label="Activer les notifications" onClick={later}>
      <div className="mp-sheet mp-push" onClick={(e) => e.stopPropagation()}>
        <span className="mp-push-ico" aria-hidden="true">
          <Bell />
        </span>
        <h3>Recevoir vos notifications ?</h3>
        {install ? (
          <>
            <p>
              Sur iPhone, ajoutez d’abord ce site à l’écran d’accueil : touchez <Share aria-hidden className="mp-push-inline" /> <b>Partager</b>, puis
              <b> Sur l’écran d’accueil</b>. Ouvrez ensuite l’application depuis son icône et activez les notifications.
            </p>
            <button type="button" className="mp-push-yes" onClick={later}>
              J’ai compris
            </button>
          </>
        ) : (
          <>
            <p>
              Soyez prévenu directement sur votre téléphone, avec le logo de l’application : nouvelle demande de séance, annulation, versement à
              confirmer.
            </p>
            {message ? <p className="mp-push-msg">{message}</p> : null}
            <button type="button" className="mp-push-yes" disabled={busy} onClick={() => void accept()}>
              {busy ? 'Activation…' : 'Activer les notifications'}
            </button>
            <button type="button" className="mp-push-later" onClick={later}>
              Plus tard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
