import { Maximize2, RotateCw, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import RenderHTML from 'react-native-render-html'
import { WebView } from './WebViewCompat'
import { dark, fonts } from '../theme'
import { buildEmbedHtml, resolveVideoEmbed } from '../utils/mediaEmbed'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { safeHtmlTagsStyles, sanitizeCmsHtml } from '../utils/safeHtml'
import { useViewport } from '../utils/viewport'

interface MediaContentProps {
  title?: string
  text?: string
  videoUrl?: string
  imageUrl?: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <ActivityIndicator size="large" color={dark.green} />
      <Text style={styles.overlayText}>{label}</Text>
    </View>
  )
}

function buildDirectVideoHtml(src: string) {
  const safe = src.replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html,body{margin:0;padding:0;height:100%;background:#0b1220;overflow:hidden}
  video{width:100%;height:100%;object-fit:contain;background:#0b1220}
</style>
</head><body>
<video controls playsinline src="${safe}"></video>
</body></html>`
}

function VideoPlayer({
  src,
  height,
  kind,
}: {
  src: string
  height: number
  kind: 'iframe' | 'video'
}) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [full, setFull] = useState(false)
  const [rotated, setRotated] = useState(false)
  const { width: winW, height: winH } = useWindowDimensions()
  const html = useMemo(
    () => (kind === 'iframe' ? buildEmbedHtml(src) : buildDirectVideoHtml(src)),
    [kind, src],
  )
  const baseUrl =
    kind === 'iframe'
      ? src.includes('vimeo')
        ? 'https://player.vimeo.com'
        : 'https://www.youtube-nocookie.com'
      : 'https://localhost'

  if (failed) {
    return (
      <View style={[styles.video, styles.overlay, { height }]}>
        <Text style={styles.overlayText}>Impossible de charger la vidéo.</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            setFailed(false)
            setLoading(true)
            setReloadKey((key) => key + 1)
          }}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  const player = (key: string) => (
    <WebView
      key={key}
      source={{ html, baseUrl }}
      style={StyleSheet.absoluteFill}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
      originWhitelist={[
        'https://*',
        'http://localhost*',
        'http://10.0.2.2*',
        'about:blank',
      ]}
      mixedContentMode="compatibility"
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      onError={() => {
        setLoading(false)
        setFailed(true)
      }}
      onHttpError={() => {
        setLoading(false)
        setFailed(true)
      }}
    />
  )

  return (
    <View style={[styles.video, { height }]}>
      {full ? null : player(`${src}-${reloadKey}`)}
      {loading && !full ? <LoadingOverlay label="Chargement de la vidéo…" /> : null}
      <Pressable
        style={styles.fsBtn}
        onPress={() => setFull(true)}
        accessibilityRole="button"
        accessibilityLabel="Mettre la vidéo en plein écran"
        hitSlop={8}
      >
        <Maximize2 size={18} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={full}
        animationType="fade"
        onRequestClose={() => setFull(false)}
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent
      >
        <View style={styles.fsRoot}>
          {/* Pivoté : la vidéo occupe tout l'écran même si le téléphone reste à la verticale. */}
          <View
            style={
              rotated
                ? {
                    position: 'absolute',
                    width: winH,
                    height: winW,
                    left: (winW - winH) / 2,
                    top: (winH - winW) / 2,
                    transform: [{ rotate: '90deg' }],
                  }
                : StyleSheet.absoluteFill
            }
          >
            {full ? player(`full-${src}-${reloadKey}-${rotated ? 'r' : 'p'}`) : null}
          </View>
          <View style={styles.fsBar}>
            <Pressable
              style={styles.fsRound}
              onPress={() => setRotated((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel="Faire pivoter la vidéo"
              hitSlop={8}
            >
              <RotateCw size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={styles.fsRound}
              onPress={() => {
                setFull(false)
                setRotated(false)
              }}
              accessibilityRole="button"
              accessibilityLabel="Fermer le plein écran"
              hitSlop={8}
            >
              <X size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/**
 * Affichage pédagogique mobile unifié :
 * Titre → Vidéo → Photo → Texte
 * Sans exposition d’URL technique.
 * Les vidéos passent par WebView (YouTube / fichier) pour éviter un crash
 * natif expo-video au démarrage dans Expo Go.
 */
export function MediaContent({ title, text, videoUrl, imageUrl }: MediaContentProps) {
  const { width } = useViewport()
  const hasTitle = Boolean(title?.trim())
  const plainText = stripHtml(text ?? '')
  const hasText = Boolean(plainText)
  const isHtml = Boolean(text?.includes('<'))
  const video = videoUrl?.trim() ? resolveVideoEmbed(videoUrl) : null
  const resolvedImage = resolveMediaUrl(imageUrl)
  const hasImage = Boolean(resolvedImage)
  const contentWidth = Math.max(width - 80, 240)
  const videoHeight = Math.round((contentWidth * 9) / 16)

  if (!hasTitle && !hasText && !video && !hasImage) {
    return <Text style={styles.empty}>Aucun contenu dans ce module.</Text>
  }

  const videoSrc =
    video?.kind === 'video'
      ? resolveMediaUrl(video.src)
      : video?.src

  return (
    <View style={styles.root}>
      {hasTitle ? <Text style={styles.title}>{title}</Text> : null}

      {video && videoSrc ? (
        <View style={styles.mediaFrame}>
          <VideoPlayer src={videoSrc} height={videoHeight} kind={video.kind} />
        </View>
      ) : null}

      {hasImage ? (
        <View style={[styles.mediaFrame, styles.imageFrame]}>
          <Image source={{ uri: resolvedImage }} style={styles.image} resizeMode="contain" />
        </View>
      ) : null}

      {hasText ? (
        isHtml ? (
          <RenderHTML
            contentWidth={contentWidth}
            source={{ html: sanitizeCmsHtml(text ?? '') }}
            defaultTextProps={{ selectable: true }}
            tagsStyles={safeHtmlTagsStyles}
          />
        ) : (
          <Text style={styles.text}>{plainText}</Text>
        )
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fsBtn: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  fsRoot: { flex: 1, backgroundColor: '#000000' },
  fsBar: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', gap: 10 },
  fsRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  root: {
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: dark.textPrimary,
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  mediaFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: '#0b1220',
  },
  imageFrame: {
    backgroundColor: dark.surfaceRaised,
  },
  video: {
    width: '100%',
    backgroundColor: '#0b1220',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(11, 18, 32, 0.72)',
    paddingHorizontal: 16,
  },
  overlayText: {
    color: '#f5f7fb',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  retryText: {
    color: '#0B0F1A',
    fontSize: 13,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: 220,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: dark.textPrimary,
    textAlign: 'left',
  },
  htmlBase: {
    fontSize: 15,
    lineHeight: 22,
    color: dark.textPrimary,
    textAlign: 'left',
  },
  htmlParagraph: {
    marginTop: 0,
    marginBottom: 10,
    textAlign: 'left',
  },
  htmlHeading: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: dark.textPrimary,
    marginBottom: 8,
    textAlign: 'left',
  },
  htmlStrong: {
    fontFamily: fonts.displayBold,
  },
  htmlEm: {
    fontStyle: 'italic',
  },
  htmlUnderline: {
    textDecorationLine: 'underline',
  },
  htmlStrike: {
    textDecorationLine: 'line-through',
  },
  htmlLink: {
    color: dark.green,
    textDecorationLine: 'underline',
  },
  htmlList: {
    marginBottom: 10,
    paddingLeft: 8,
  },
  htmlListItem: {
    marginBottom: 4,
    textAlign: 'left',
  },
  empty: {
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
  },
})
