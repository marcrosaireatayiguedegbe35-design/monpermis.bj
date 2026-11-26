import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'

/** Décor doux des écrans de réservation : vague verte en haut à droite et en bas de page. */
export function WaveDecor() {
  const { width, height } = useWindowDimensions()
  const topH = 110
  const botH = 120
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={topH} style={styles.top} viewBox={`0 0 ${width} ${topH}`}>
        <Defs>
          <LinearGradient id="wt" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#CFF3DC" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#7FDDA3" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        <Path d={`M${width * 0.45} 0 H${width} V${topH * 0.55} C${width * 0.82} ${topH * 0.9} ${width * 0.62} ${topH * 0.55} ${width * 0.45} 0 Z`} fill="url(#wt)" opacity={0.55} />
        <Path d={`M${width * 0.62} 0 H${width} V${topH * 0.38} C${width * 0.88} ${topH * 0.62} ${width * 0.74} ${topH * 0.4} ${width * 0.62} 0 Z`} fill="url(#wt)" />
      </Svg>
      <Svg width={width} height={botH} style={[styles.bottom, { top: height - botH }]} viewBox={`0 0 ${width} ${botH}`}>
        <Defs>
          <LinearGradient id="wb" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#9FEBBE" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#34C46C" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>
        <Path d={`M0 ${botH * 0.45} C${width * 0.3} ${botH * 0.1} ${width * 0.6} ${botH * 0.75} ${width} ${botH * 0.3} V${botH} H0 Z`} fill="url(#wb)" opacity={0.5} />
        <Path d={`M0 ${botH * 0.7} C${width * 0.3} ${botH * 0.4} ${width * 0.65} ${botH * 1.0} ${width} ${botH * 0.55} V${botH} H0 Z`} fill="url(#wb)" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, right: 0 },
  bottom: { position: 'absolute', left: 0 },
})
