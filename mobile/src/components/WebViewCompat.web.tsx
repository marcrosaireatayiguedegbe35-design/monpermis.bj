import { useEffect, useRef } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

export type WebViewMessageEvent = { nativeEvent: { data: string } }

type Props = {
  source: { html?: string; uri?: string; baseUrl?: string }
  style?: StyleProp<ViewStyle>
  containerStyle?: StyleProp<ViewStyle>
  onLoadStart?: () => void
  onLoadEnd?: () => void
  onError?: () => void
  onHttpError?: () => void
  onMessage?: (event: WebViewMessageEvent) => void
  // Props natives acceptées et ignorées sur le web.
  [key: string]: unknown
}

/**
 * Remplace react-native-webview (non supporté sur le web) par une <iframe>.
 * Les pages qui appellent window.ReactNativeWebView.postMessage(...) peuvent aussi appeler
 * window.parent.postMessage(...) : le message est relayé à onMessage.
 */
export function WebView({ source, style, containerStyle, onLoadStart, onLoadEnd, onError, onMessage }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    onLoadStart?.()
  }, [source.html, source.uri]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onMessage) return
    const handler = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return
      onMessage({ nativeEvent: { data: String(event.data) } })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onMessage])

  return (
    <View style={[styles.fill, containerStyle, style]}>
      <iframe
        ref={frameRef}
        title="contenu"
        {...(source.html ? { srcDoc: source.html } : { src: source.uri })}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => onLoadEnd?.()}
        onError={() => onError?.()}
        style={{ border: 0, width: '100%', height: '100%', background: 'transparent' }}
      />
    </View>
  )
}

const styles = StyleSheet.create({ fill: { flex: 1, overflow: 'hidden' } })
